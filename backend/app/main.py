from fastapi import FastAPI, HTTPException, Depends, status, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, RedirectResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import List, Optional, Dict, Any, Tuple
import os
import json
import logging
import time
import asyncio
import functools
import smtplib
import uuid
import secrets
import random
from urllib.parse import urlencode
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from fastapi import Request
import httpx
from dotenv import load_dotenv
from app.auth import (
    create_access_token,
    decode_access_token,
    get_password_hash,
    verify_password,
    UserCreate,
    UserLogin,
    Token,
    User
)
from app.database import user_db

load_dotenv()

# Настраиваем логирование
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="AI Architect API")

# Security схема
security = HTTPBearer(auto_error=False)

# Разрешаем CORS для фронтенда
_FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[_FRONTEND_URL, "http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── AI провайдеры — дефолтные из .env (переопределяются через Admin Panel) ───
_ENV_PROVIDERS: list = []
_or_key   = os.getenv("OPENROUTER_API_KEY", "")
_groq_key = os.getenv("GROQ_API_KEY", "")
if _or_key:
    _ENV_PROVIDERS.append({
        "name": "OpenRouter", "enabled": True,
        "base_url": "https://openrouter.ai/api/v1",
        "model": "meta-llama/llama-3.3-70b-instruct:free",
        "key": _or_key,
    })
if _groq_key:
    _ENV_PROVIDERS.append({
        "name": "Groq", "enabled": True,
        "base_url": "https://api.groq.com/openai/v1",
        "model": "llama-3.3-70b-versatile",
        "key": _groq_key,
    })

_provider_index = 0  # Для round-robin


def _get_active_providers() -> list:
    """Активные провайдеры из БД (приоритет) или из .env"""
    db_providers = user_db.get_ai_providers()
    active = []
    for p in db_providers:
        if not p.get("enabled"):
            continue
        # Поддержка обоих форматов: api_key (новый из ai_providers.py) и key (старый из .env)
        key = p.get("api_key") or p.get("key", "")
        if not key:
            continue
        # Нормализуем к формату call_groq: key + model (строка)
        models_list = p.get("models") or []
        model = p.get("model") or (models_list[0].get("id") if models_list else "llama-3.3-70b-versatile")
        active.append({
            "name": p.get("name", "Unknown"),
            "key": key,
            "base_url": p.get("base_url", "https://api.groq.com/openai/v1"),
            "model": model,
        })
    return active if active else [p for p in _ENV_PROVIDERS if p.get("key")]


# Хранилище состояний для сессий генерации
generation_progress = {}


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
) -> User:
    """Получение текущего пользователя из токена"""
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Требуется авторизация",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    token = credentials.credentials
    payload = decode_access_token(token)
    
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверный токен",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    username = payload.get("sub")
    if not username:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверный токен",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user = user_db.get_user(username)
    if not user or user.get("disabled"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Пользователь не найден",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return User(username=username, plan=user.get("plan", "free"))


class GenerationStage(BaseModel):
    """Модель для передачи этапа генерации"""
    stage: str
    step: int
    total_steps: int
    completed: bool = False


class AgentRequest(BaseModel):
    idea: str
    attachments: Optional[List[str]] = None


class ClarifyRequest(BaseModel):
    """Запрос на уточнение идеи"""
    idea: str
    conversation_history: Optional[List[dict]] = None  # История диалога


class ClarifyResponse(BaseModel):
    """Ответ с уточняющими вопросами"""
    needs_clarification: bool
    questions: List[str]
    summary: Optional[str] = None  # Краткое понимание идеи


class DialogMessage(BaseModel):
    """Сообщение в диалоге"""
    role: str  # "user" или "assistant"
    content: str


class DialogContext(BaseModel):
    """Контекст диалога для генерации"""
    original_idea: str
    messages: List[DialogMessage]


class ImplementationStep(BaseModel):
    day: int
    task: str
    duration: str


class KeyMetric(BaseModel):
    label: str       # "Ориентировочная стоимость"
    value: str       # "300,000 - 800,000"
    unit: str        # "₽" или "часов" или "шт"

class ResourceGroup(BaseModel):
    category: str       # "Запчасти", "Инструменты", "Специалисты"
    items: List[str]    # Список конкретных позиций

class ProjectMetrics(BaseModel):
    project_type: str               # "technical", "business", "research", "other"
    key_metrics: List[KeyMetric]    # Контекстные KPI
    resources_needed: List[ResourceGroup]  # Что понадобится

class AgentProfile(BaseModel):
    name: str
    role: str
    avatar: str


class AgentResponse(BaseModel):
    agent_profile: AgentProfile
    description: str
    mermaid_code: str
    system_prompt: str
    tech_stack: List[str]
    implementation_plan: List[ImplementationStep]
    project_metrics: ProjectMetrics
    risk_status: str


# Промпты для 4-уровневой цепочки
PROMPT_CLARIFIER = """Ты — опытный бизнес-аналитик. Твоя задача — понять идею пользователя и задать уточняющие вопросы, если информации недостаточно.

Идея пользователя: {idea}

Проанализируй идею и определи:
1. Достаточно ли информации для создания ИИ-агента?
2. Какие детали нужно уточнить?

Если идея ясная и конкретная — верни needs_clarification: false
Если нужны уточнения — задай 1-3 конкретных вопроса (не больше!)

Важно:
- Не спрашивай очевидные вещи
- Вопросы должны быть конкретными и по делу
- Если идея совсем непонятная — спроси что имеется в виду

Верни ответ в формате JSON:
{{
  "needs_clarification": true/false,
  "questions": ["вопрос 1", "вопрос 2"] // пустой массив если вопросов нет
}}"""

PROMPT_ANALYST = """Ты — бизнес-аналитик. Твоя задача — сохранить КОНКРЕТНУЮ суть запроса пользователя.

Идея пользователя: {idea}
Дополнительный контекст: {context}

КРИТИЧЕСКИ ВАЖНО:
- НЕ пиши общие фразы типа "автоматизация задачи", "помощник для задач"
- СОХРАНИ конкретику из запроса — если просят "отвечать на отзывы WB" → task = "Автоматические ответы на отзывы Wildberries"
- Если просят "искать поставщиков в Китае" → task = "Поиск и проверка поставщиков в Китае"
- Если просят "поставить двигатель V12 на ВАЗ" → task = "Установка двигателя V12 на ВАЗ-2109"

Задача: опиши конкретно ЧТО делает агент — дословно сохрани суть запроса.

Верни ответ в формате JSON:
{{
  "task": "ОДНО предложение с КОНКРЕТНОЙ задачей (дословно из запроса пользователя)",
  "inputs": ["входные данные 1"],
  "outputs": ["выходные данные 1"],
  "integrations": ["сервис 1"]
}}"""

PROMPT_ARCHITECT = """Ты — AI архитектор. Создай КОНКРЕТНОГО специализированного ИИ-агента точно под запрос пользователя.

Оригинальный запрос пользователя: {idea}
Детальная задача (из анализа): {task}
Интеграции: {integrations}

КРИТИЧЕСКИ ВАЖНО:
- Создай ИМЕННО ТОГО агента, которого просит пользователь — не "общего ассистента" и не "помощника по автоматизации"
- Имя и роль должны точно отражать конкретную задачу пользователя
- system_prompt должен быть детальным (минимум 200 слов), с чёткой ролью, правилами работы и ограничениями

Примеры правильного подхода:
- Просят "агента для найма сотрудников" → имя "HireBot Pro", роль "Специалист по подбору персонала", промпт про рекрутинг
- Просят "YouTube аналитик" → имя "TubeInsight AI", роль "YouTube Content Strategist", промпт про анализ видео
- Просят "менеджер продаж в Telegram" → имя "SalesMaster Bot", роль "Менеджер по продажам в мессенджерах"
- Просят "помощник врача" → имя "MedAssist AI", роль "Медицинский ассистент", промпт про медицинские протоколы

Верни ответ в формате JSON:
{{
  "name": "уникальное имя агента (отражает суть задачи, не 'AI Assistant')",
  "role": "конкретная специализация (не 'Помощник' и не 'Ассистент')",
  "avatar": "эмодзи подходящий к профессии/задаче",
  "system_prompt": "детальный системный промпт (роль, задачи, принципы работы, что делать/не делать, стиль общения)",
  "tech_stack": ["технология 1", "технология 2", "технология 3"]
}}"""

PROMPT_VISUALIZER = """Ты — визуализатор. Создай схему работы агента на языке Mermaid.js.

Задача: {task}
Входные данные: {inputs}
Выходные данные: {outputs}

ВАЖНО:
- Используй только латинские буквы для идентификаторов узлов (A, B, C...)
- Текст внутри узлов пиши в кавычках: A["Текст узла"]
- Не используй спецсимволы в идентификаторах
- Схема должна быть валидной для Mermaid.js

Верни ответ в формате JSON:
{{
  "mermaid_code": "graph LR; A[\"Текст\"] --> B[\"Текст\"];"
}}"""

PROMPT_PM = """Ты — проект-менеджер. Проанализируй задачу и создай КОНТЕКСТНЫЙ план выполнения.

Задача: {task}

ВАЖНО: Сначала определи тип проекта:
- "technical" — техническая/DIY задача (установка, ремонт, сборка, программирование)
- "business" — автоматизация бизнес-процессов (боты, CRM, аналитика)
- "research" — исследование, обучение, анализ данных
- "other" — всё остальное

В зависимости от типа — генерируй РЕЛЕВАНТНЫЕ метрики:
- technical: стоимость, материалы, инструменты, специалисты
- business: экономия времени, ROI, интеграции, ресурсы
- research: источники, методология, ключевые выводы
- other: наиболее подходящие метрики

Верни ответ в формате JSON:
{{
  "project_type": "technical" | "business" | "research" | "other",
  "key_metrics": [
    {{"label": "Ориентировочная стоимость", "value": "50,000 - 150,000", "unit": "₽"}},
    {{"label": "Время на реализацию", "value": "2-4", "unit": "недели"}}
  ],
  "resources_needed": [
    {{
      "category": "Материалы/Запчасти",
      "items": ["конкретный элемент 1", "элемент 2"]
    }},
    {{
      "category": "Инструменты/ПО",
      "items": ["инструмент 1", "инструмент 2"]
    }},
    {{
      "category": "Специалисты/Услуги",
      "items": ["кто нужен", "что заказать"]
    }}
  ],
  "implementation_plan": [
    {{"day": 1, "task": "...", "duration": "..."}},
    {{"day": 2, "task": "...", "duration": "..."}}
  ],
  "risk_status": "normal" | "warning" | "high"
}}"""

PROMPT_CHAT_ASSISTANT = """Ты — активный помощник-исполнитель, который помогает пользователю ДОВЕСТИ ЗАДАЧУ ДО КОНЦА.

Контекст задачи:
- Агент/проект: {agent_name} ({agent_role})
- Суть задачи: {description}
- Стек/ресурсы: {tech_stack}
- Текущий шаг: {current_step}

История переписки: {conversation_history}

Вопрос/сообщение пользователя: {message}

Твой подход:
1. Если пользователь спрашивает ЧТО делать — давай КОНКРЕТНЫЕ инструкции (не абстрактные советы)
2. Если спрашивает ГДЕ купить/найти — называй конкретные места, сервисы, ресурсы
3. Если спрашивает СКОЛЬКО стоит — давай реальные диапазоны цен с пояснениями
4. Если пользователь застрял — предложи альтернативный путь
5. После ответа — предложи СЛЕДУЮЩИЙ конкретный шаг, который пользователь может сделать прямо сейчас

Важно:
- Будь конкретным, не общим
- Давай ссылки на реальные ресурсы если знаешь
- Разбивай сложные шаги на маленькие действия
- Отвечай как опытный практик, который сам это делал

Верни ответ в формате JSON:
{{
  "response": "конкретный ответ с практическими деталями",
  "suggested_actions": ["Следующий шаг 1", "Следующий шаг 2", "Следующий шаг 3"]
}}"""


def call_groq(prompt: str, max_retries: int = 3, fallback_result: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """Вызов AI API с round-robin по всем активным провайдерам и fallback"""
    global _provider_index
    providers = _get_active_providers()

    if not providers:
        logger.error("Нет активных AI провайдеров — добавьте ключи в Admin Panel")
        if fallback_result:
            return fallback_result
        raise Exception("Нет активных AI провайдеров")

    last_error = None
    total_attempts = max_retries * len(providers)

    for attempt in range(total_attempts):
        provider = providers[_provider_index % len(providers)]
        _provider_index = (_provider_index + 1) % len(providers)

        headers = {
            "Authorization": f"Bearer {provider['key']}",
            "Content-Type": "application/json",
        }
        if "openrouter" in provider.get("base_url", ""):
            headers["HTTP-Referer"] = "https://aiarchi.ru"
            headers["X-Title"] = "AI Architect"

        model = provider.get("model", "llama-3.3-70b-versatile")
        payload = {
            "model": model,
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0.7,
            "max_tokens": 2048,
            "response_format": {"type": "json_object"},
        }

        try:
            logger.info(f"Вызов {provider['name']} (попытка {attempt + 1}/{total_attempts}), модель: {model}")
            with httpx.Client(timeout=60) as http:
                resp = http.post(f"{provider['base_url']}/chat/completions", headers=headers, json=payload)

            if resp.status_code != 200:
                raise Exception(f"HTTP {resp.status_code}: {resp.text[:300]}")

            content = resp.json()["choices"][0]["message"]["content"]
            logger.info(f"Ответ от {provider['name']}, длина: {len(content)}")
            return json.loads(content)

        except json.JSONDecodeError as e:
            last_error = e
            logger.error(f"Ошибка парсинга JSON ({provider['name']}): {e}")
            time.sleep(1)

        except Exception as e:
            last_error = e
            logger.warning(f"Провайдер {provider['name']} недоступен: {e} — пробую следующий")
            time.sleep(2)

    if fallback_result:
        logger.warning("Все провайдеры недоступны, использую fallback")
        return fallback_result
    raise Exception(f"Все AI провайдеры недоступны: {last_error}")


@app.get("/")
def read_root():
    return {"message": "AI Architect API (Groq) — готов к работе!"}


@app.post("/api/auth/register", response_model=User)
async def register(user_data: UserCreate):
    """Регистрация нового пользователя"""
    try:
        user = user_db.create_user(user_data.username, user_data.password, user_data.email)
        logger.info(f"Зарегистрирован новый пользователь: {user_data.username}")
        send_email(
            user_data.email or user_data.username,
            "Добро пожаловать в AI Architect!",
            f"""<h3 style="color:#22d3ee">Привет, {user_data.username}!</h3>
            <p>Ваш аккаунт успешно создан. Начните с создания первого ИИ-агента.</p>
            <p style="margin-top:16px">
              <a href="https://aiarchi.ru/app/new"
                 style="background:#22d3ee;color:#0f172a;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:bold">
                Создать агента →
              </a>
            </p>""",
        )
        return user
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/api/auth/login", response_model=Token)
async def login(user_data: UserLogin):
    """Вход пользователя"""
    user = user_db.authenticate(user_data.username, user_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверное имя пользователя или пароль",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token = create_access_token(data={"sub": user["username"]})
    logger.info(f"Пользователь {user_data.username} вошёл в систему")
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "username": user["username"],
        "plan": user.get("plan", "free"),
    }


@app.get("/api/auth/me", response_model=User)
async def get_me(current_user: User = Depends(get_current_user)):
    """Получение текущего пользователя"""
    return current_user


# ─── OAuth 2.0 (Google / GitHub / Yandex) ────────────────────────────────────

_OAUTH_STATIC: Dict[str, Dict[str, str]] = {
    "google": {
        "auth_url":     "https://accounts.google.com/o/oauth2/v2/auth",
        "token_url":    "https://oauth2.googleapis.com/token",
        "userinfo_url": "https://www.googleapis.com/oauth2/v2/userinfo",
        "scope":        "openid email profile",
    },
    "github": {
        "auth_url":     "https://github.com/login/oauth/authorize",
        "token_url":    "https://github.com/login/oauth/access_token",
        "userinfo_url": "https://api.github.com/user",
        "scope":        "user:email",
    },
    "yandex": {
        "auth_url":     "https://oauth.yandex.ru/authorize",
        "token_url":    "https://oauth.yandex.ru/token",
        "userinfo_url": "https://login.yandex.ru/info",
        "scope":        "login:email login:info",
    },
}

_oauth_states: Dict[str, str] = {}  # state → provider (in-memory, достаточно для dev)


def _get_oauth_config(provider: str) -> Optional[Dict[str, str]]:
    """Читает OAuth конфиг из DB (приоритет) или из env vars — каждый раз свежо"""
    static = _OAUTH_STATIC.get(provider)
    if not static:
        return None
    # Читаем ключи из DB, fallback → env
    client_id = (user_db.get_setting(f"{provider}_client_id")
                 or os.getenv(f"{provider.upper()}_CLIENT_ID", ""))
    client_secret = (user_db.get_setting(f"{provider}_client_secret")
                     or os.getenv(f"{provider.upper()}_CLIENT_SECRET", ""))
    return {**static, "client_id": client_id, "client_secret": client_secret}


@app.get("/api/auth/oauth/{provider}")
async def oauth_redirect(provider: str):
    """Редирект на страницу авторизации провайдера"""
    cfg = _get_oauth_config(provider)
    if not cfg:
        raise HTTPException(status_code=400, detail=f"Неизвестный провайдер: {provider}")
    if not cfg["client_id"]:
        raise HTTPException(status_code=503, detail=f"OAuth {provider} не настроен (нет CLIENT_ID)")

    state = secrets.token_urlsafe(16)
    _oauth_states[state] = provider

    base_url = user_db.get_setting("backend_url") or os.getenv("BACKEND_URL", "https://aiarchi.ru")
    params = {
        "client_id":     cfg["client_id"],
        "redirect_uri":  f"{base_url}/api/auth/oauth/{provider}/callback",
        "response_type": "code",
        "scope":         cfg["scope"],
        "state":         state,
    }
    if provider == "google":
        params["access_type"] = "online"

    url = cfg["auth_url"] + "?" + urlencode(params)
    return RedirectResponse(url)


@app.get("/api/auth/oauth/{provider}/callback")
async def oauth_callback(provider: str, code: str = "", state: str = "", error: str = ""):
    """Callback после OAuth авторизации"""
    frontend_url = os.getenv("FRONTEND_URL", "https://aiarchi.ru")

    if error or not code:
        return RedirectResponse(f"{frontend_url}/auth?error=oauth_denied")

    cfg = _get_oauth_config(provider)
    if not cfg:
        return RedirectResponse(f"{frontend_url}/auth?error=unknown_provider")

    base_url = user_db.get_setting("backend_url") or os.getenv("BACKEND_URL", "https://aiarchi.ru")

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            # Обмен кода на access_token
            token_params = {
                "client_id":     cfg["client_id"],
                "client_secret": cfg["client_secret"],
                "code":          code,
                "redirect_uri":  f"{base_url}/api/auth/oauth/{provider}/callback",
                "grant_type":    "authorization_code",
            }
            headers = {"Accept": "application/json"}
            token_resp = await client.post(cfg["token_url"], data=token_params, headers=headers)
            token_data = token_resp.json()
            access_token_val = token_data.get("access_token", "")
            if not access_token_val:
                logger.error(f"OAuth {provider} no token: {token_data}")
                return RedirectResponse(f"{frontend_url}/auth?error=oauth_failed")

            # Получаем данные пользователя
            info_resp = await client.get(
                cfg["userinfo_url"],
                headers={"Authorization": f"Bearer {access_token_val}"},
            )
            info = info_resp.json()

        # Извлекаем email и id у каждого провайдера
        if provider == "google":
            oauth_id = str(info.get("id", ""))
            email    = info.get("email", "")
            name     = (info.get("name") or email.split("@")[0]).replace(" ", "_")
        elif provider == "github":
            oauth_id = str(info.get("id", ""))
            email    = info.get("email") or ""
            name     = (info.get("login") or f"gh_{oauth_id}")
        elif provider == "yandex":
            oauth_id = str(info.get("id", ""))
            email    = info.get("default_email") or ""
            name     = (info.get("login") or f"ya_{oauth_id}")
        else:
            return RedirectResponse(f"{frontend_url}/auth?error=unknown_provider")

        # Ищем или создаём пользователя
        existing = user_db.get_user_by_oauth(provider, oauth_id)
        if not existing:
            # Может быть уже зарегистрирован по email
            if email:
                # Проверим по email (ищем по OAuth провайдеру email)
                pass
            existing = user_db.create_oauth_user(name, email or None, provider, oauth_id)
            if email:
                send_email(
                    email,
                    "Добро пожаловать в AI Architect!",
                    f"""<h3 style="color:#22d3ee">Привет, {existing['username']}!</h3>
                    <p>Вы вошли через {provider.title()}. Начните с создания первого агента.</p>""",
                )

        jwt_token = create_access_token(data={"sub": existing["username"]})
        plan = existing.get("plan", "free")
        params_out = urlencode({"token": jwt_token, "username": existing["username"], "plan": plan})
        return RedirectResponse(f"{frontend_url}/auth/callback?{params_out}")

    except Exception as e:
        logger.error(f"OAuth {provider} error: {e}")
        return RedirectResponse(f"{frontend_url}/auth?error=oauth_error")


# ─── Phone OTP Auth ───────────────────────────────────────────────────────────

class PhoneSendRequest(BaseModel):
    phone: str  # формат +79001234567


class PhoneVerifyRequest(BaseModel):
    phone: str
    code: str


def _send_sms(phone: str, message: str) -> bool:
    """Отправить SMS через sms.ru"""
    api_key = user_db.get_setting("sms_api_key") or os.getenv("SMS_API_KEY", "")
    if not api_key:
        logger.warning("SMS не настроен (нет SMS_API_KEY)")
        return False
    try:
        import httpx as _httpx
        resp = _httpx.get(
            "https://sms.ru/sms/send",
            params={"api_id": api_key, "to": phone, "msg": message, "json": 1},
            timeout=10,
        )
        data = resp.json()
        return data.get("status") == "OK"
    except Exception as e:
        logger.error(f"SMS send error: {e}")
        return False


@app.post("/api/auth/phone/send")
async def phone_send_otp(request: PhoneSendRequest):
    """Отправить OTP на телефон"""
    import re
    phone = re.sub(r"[^\d+]", "", request.phone)
    if not re.match(r"^\+7\d{10}$", phone):
        raise HTTPException(status_code=400, detail="Номер телефона должен быть в формате +79001234567")

    code = str(random.randint(100000, 999999))
    from datetime import timedelta, datetime as _dt
    expires = _dt.utcnow() + timedelta(minutes=10)
    user_db.save_otp(phone, code, expires)

    ok = _send_sms(phone, f"AI Architect: ваш код — {code}")
    if not ok:
        # В dev-режиме просто логируем (удобно для тестирования)
        logger.info(f"[DEV] OTP для {phone}: {code}")

    return {"sent": True, "message": "Код отправлен" if ok else "SMS не настроен, код в логах сервера"}


@app.post("/api/auth/phone/verify")
async def phone_verify_otp(request: PhoneVerifyRequest):
    """Проверить OTP и войти / зарегистрировать"""
    import re
    phone = re.sub(r"[^\d+]", "", request.phone)

    if not user_db.verify_otp(phone, request.code.strip()):
        raise HTTPException(status_code=400, detail="Неверный или истёкший код")

    user = user_db.get_user_by_phone(phone)
    if not user:
        user = user_db.create_phone_user(phone)

    token = create_access_token(data={"sub": user["username"]})
    return {
        "access_token": token,
        "token_type": "bearer",
        "username": user["username"],
        "plan": user.get("plan", "free"),
    }


@app.get("/api/usage")
async def get_usage(current_user: User = Depends(get_current_user)):
    """Лимиты и использование текущего пользователя"""
    return user_db.get_usage_info(current_user.username)


class UpgradePlanRequest(BaseModel):
    plan: str  # starter | pro


@app.post("/api/upgrade")
async def upgrade_plan(
    request: UpgradePlanRequest,
    current_user: User = Depends(get_current_user),
):
    """Смена тарифа (заглушка — в продакшене здесь Stripe/ЮКасса)"""
    allowed = {"starter", "pro"}
    if request.plan not in allowed:
        raise HTTPException(status_code=400, detail="Недопустимый тариф")
    user_db.upgrade_plan(current_user.username, request.plan)
    logger.info(f"Пользователь {current_user.username} перешёл на план {request.plan}")
    return {"success": True, "plan": request.plan}


class UpdateProfileRequest(BaseModel):
    email: Optional[str] = None
    current_password: Optional[str] = None
    new_password: Optional[str] = None


@app.post("/api/profile/update")
async def update_profile(
    request: UpdateProfileRequest,
    current_user: User = Depends(get_current_user),
):
    """Обновление профиля: email и/или пароль"""
    user = user_db.get_user(current_user.username)
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")

    # Смена пароля
    if request.new_password:
        if not user.get("hashed_password"):
            # OAuth-пользователь без пароля — разрешаем установить новый
            pass
        elif not request.current_password:
            raise HTTPException(status_code=400, detail="Укажите текущий пароль")
        elif not verify_password(request.current_password, user["hashed_password"]):
            raise HTTPException(status_code=400, detail="Неверный текущий пароль")
        if len(request.new_password) < 6:
            raise HTTPException(status_code=400, detail="Новый пароль должен быть не менее 6 символов")
        user_db.update_user_profile(current_user.username, new_password=request.new_password)

    # Смена email
    if request.email is not None:
        user_db.update_user_profile(current_user.username, email=request.email)

    logger.info(f"Профиль обновлён: {current_user.username}")
    return {"success": True}


@app.get("/api/profile")
async def get_profile(current_user: User = Depends(get_current_user)):
    """Полные данные профиля текущего пользователя"""
    user = user_db.get_user(current_user.username)
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    usage = user_db.get_usage_info(current_user.username)
    return {
        "username": user["username"],
        "email": user.get("email"),
        "plan": user.get("plan", "free"),
        "created_at": user.get("created_at"),
        **usage,
    }


@app.post("/api/clarify", response_model=ClarifyResponse)
async def clarify_idea(
    request: ClarifyRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Анализирует идею и задаёт уточняющие вопросы если нужно
    """
    try:
        logger.info(f"Запрос на уточнение идеи: {request.idea[:100]}...")
        
        # Формируем промпт с учётом истории диалога
        context_str = ""
        if request.conversation_history:
            context_str = "История диалога:\n"
            for msg in request.conversation_history[-6:]:  # Последние 6 сообщений
                role = "Пользователь" if msg["role"] == "user" else "Ассистент"
                context_str += f"{role}: {msg['content']}\n"
        
        full_idea = f"{request.idea}\n\n{context_str}" if context_str else request.idea
        
        clarifier_prompt = PROMPT_CLARIFIER.format(idea=full_idea)
        result = call_groq(clarifier_prompt)
        
        # Добавим краткое резюме идеи
        summary = f"Идея: {request.idea}"
        if context_str:
            summary += f"\nДополнительно: {context_str.strip()}"
        
        response_data = {
            "needs_clarification": result.get("needs_clarification", False),
            "questions": result.get("questions", []),
            "summary": summary
        }
        
        logger.info(f"Clarify результат: needs_clarification={response_data['needs_clarification']}, questions={len(response_data['questions'])}")
        return response_data
        
    except Exception as e:
        logger.error(f"Ошибка clarifier: {e}")
        # Fallback: возвращаем что вопросов нет
        return {
            "needs_clarification": False,
            "questions": [],
            "summary": f"Идея: {request.idea}"
        }


class GenerateRequest(BaseModel):
    """Запрос на генерацию агента"""
    idea: str
    attachments: Optional[List[str]] = None
    original_idea: Optional[str] = None  # Для диалога
    messages: Optional[List[DialogMessage]] = None  # Для диалога


class ChatRequest(BaseModel):
    """Запрос в чат-помощник"""
    message: str
    dashboard_context: AgentResponse  # Контекст дашборда
    conversation_history: Optional[List[DialogMessage]] = None  # История чата
    current_step: Optional[str] = None  # Текущий шаг плана


class ChatResponse(BaseModel):
    """Ответ чат-помощника"""
    response: str
    suggested_actions: Optional[List[str]] = None  # Подсказки действий


def _build_context(request: GenerateRequest) -> Tuple[str, str]:
    """Возвращает (idea_text, full_context) из запроса"""
    if request.messages and request.original_idea:
        context_lines = [f"Original idea: {request.original_idea}"]
        for msg in request.messages:
            role = "User" if msg.role == "user" else "Assistant"
            context_lines.append(f"{role}: {msg.content}")
        full_context = "\n".join(context_lines)
        return full_context, full_context
    return request.idea, ""


async def _run_in_thread(func, *args, **kwargs):
    """Совместимая замена asyncio.to_thread для Python 3.8+"""
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, functools.partial(func, *args, **kwargs))


async def _run_pipeline(session_id: str, idea_text: str, full_context: str) -> None:
    """Запускает 4-шаговый пайплайн в фоне. Каждый Groq-вызов — в отдельном потоке."""

    def _set(stage: str, step: int, *, done: bool = False, result: Optional[Dict[str, Any]] = None) -> None:
        generation_progress[session_id] = {
            "stage": stage, "step": step, "total": 4,
            "completed": done, **({"result": result} if result else {}),
        }

    # Fallback результаты на случай недоступности Groq
    FALLBACK_ANALYST = {"task": "Автоматизация задачи", "inputs": [], "outputs": [], "integrations": []}
    FALLBACK_ARCHITECT = {"name": "AI Assistant", "role": "Помощник", "avatar": "🤖", "system_prompt": "Вы полезный ассистент.", "tech_stack": []}
    FALLBACK_VISUALIZER = {"mermaid_code": "graph LR; A[\"Задача\"] --> B[\"Решение\"];"}
    FALLBACK_PM = {"project_type": "other", "key_metrics": [], "resources_needed": [], "implementation_plan": [{"day": 1, "task": "Начать работу", "duration": "1 день"}], "risk_status": "normal"}

    try:
        # Шаг 1: Аналитик
        _set("Декомпозиция бизнес-задачи...", 1)
        logger.info("Шаг 1/4: Аналитик...")
        analyst_result = await _run_in_thread(
            call_groq, PROMPT_ANALYST.format(idea=idea_text, context=full_context),
            fallback_result=FALLBACK_ANALYST
        )

        # Шаг 2: Архитектор
        _set("Проектирование архитектуры...", 2)
        logger.info("Шаг 2/4: Архитектор...")
        architect_result = await _run_in_thread(
            call_groq, PROMPT_ARCHITECT.format(
                idea=idea_text,
                task=analyst_result.get("task", idea_text),
                integrations=", ".join(analyst_result.get("integrations", [])),
            ),
            fallback_result=FALLBACK_ARCHITECT
        )

        # Шаг 3: Визуализатор
        _set("Отрисовка схемы...", 3)
        logger.info("Шаг 3/4: Визуализатор...")
        visualizer_result = await _run_in_thread(
            call_groq, PROMPT_VISUALIZER.format(
                task=analyst_result.get("task", "Автоматизация"),
                inputs=", ".join(analyst_result.get("inputs", [])),
                outputs=", ".join(analyst_result.get("outputs", [])),
            ),
            fallback_result=FALLBACK_VISUALIZER
        )

        # Шаг 4: PM
        _set("Расчёт метрик и плана...", 4)
        logger.info("Шаг 4/4: PM...")
        pm_result = await _run_in_thread(
            call_groq, PROMPT_PM.format(task=analyst_result.get("task", "Автоматизация")),
            fallback_result=FALLBACK_PM
        )

        # Сборка ответа
        response_data = {
            "agent_profile": {
                "name": architect_result.get("name", "AI Assistant"),
                "role": architect_result.get("role", "Помощник"),
                "avatar": architect_result.get("avatar", "🤖"),
            },
            "description": analyst_result.get("task", "Автоматизация задачи"),
            "mermaid_code": visualizer_result.get("mermaid_code", ""),
            "system_prompt": architect_result.get("system_prompt", ""),
            "tech_stack": architect_result.get("tech_stack", []),
            "implementation_plan": [
                {"day": s.get("day", 0), "task": s.get("task", ""), "duration": s.get("duration", "")}
                for s in pm_result.get("implementation_plan", [])
            ],
            "project_metrics": {
                "project_type": pm_result.get("project_type", "other"),
                "key_metrics": pm_result.get("key_metrics", []),
                "resources_needed": pm_result.get("resources_needed", []),
            },
            "risk_status": pm_result.get("risk_status", "normal"),
        }

        logger.info(f"Генерация {session_id} завершена.")
        _set("Готово!", 4, done=True, result=response_data)

    except Exception as e:
        logger.error(f"Ошибка пайплайна {session_id}: {e}")
        generation_progress[session_id] = {"stage": str(e), "error": True, "completed": True}

    finally:
        async def _cleanup() -> None:
            await asyncio.sleep(300)  # 5 минут
            generation_progress.pop(session_id, None)
        asyncio.create_task(_cleanup())


@app.post("/api/generate")
async def generate_agent(
    request: GenerateRequest,
    current_user: User = Depends(get_current_user),
):
    """
    Запускает генерацию в фоне и сразу возвращает session_id.
    Фронтенд подписывается на SSE /api/generate/{session_id}/progress
    и получает прогресс в реальном времени + результат в финальном событии.
    """
    # ── Проверка лимита ────────────────────────────────────────────────────────
    usage = user_db.get_usage_info(current_user.username)
    if not usage["can_generate"]:
        raise HTTPException(
            status_code=402,
            detail={
                "code": "LIMIT_REACHED",
                "message": f"Вы использовали все {usage['generations_limit']} генерации за этот месяц.",
                "plan": usage["plan"],
                "generations_used": usage["generations_used"],
                "generations_limit": usage["generations_limit"],
            }
        )

    import uuid
    session_id = str(uuid.uuid4())
    generation_progress[session_id] = {"stage": "Инициализация...", "step": 0, "total": 4, "completed": False}

    idea_text, full_context = _build_context(request)
    logger.info(f"Запуск генерации. Session: {session_id}. Идея: {idea_text[:80]}...")

    # Записываем событие генерации сразу (до результата)
    user_db.record_generation(current_user.username)

    asyncio.create_task(_run_pipeline(session_id, idea_text, full_context))

    return {"session_id": session_id, "usage": user_db.get_usage_info(current_user.username)}


@app.get("/api/generate/{session_id}/progress")
async def get_generation_progress(session_id: str):
    """SSE — реальный стриминг прогресса + результат в финальном событии"""
    async def event_generator():
        last_step = -1
        for _ in range(1200):  # 10 минут максимум
            if session_id in generation_progress:
                progress = generation_progress[session_id]
                current_step = progress.get("step", 0)

                # Шлём событие при каждом изменении шага
                if current_step != last_step or progress.get("completed") or progress.get("error"):
                    yield f"data: {json.dumps(progress, ensure_ascii=False)}\n\n"
                    last_step = current_step

                if progress.get("completed") or progress.get("error"):
                    return

            await asyncio.sleep(0.2)

        yield f"data: {json.dumps({'stage': 'Превышено время ожидания', 'error': True})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")


@app.post("/api/chat", response_model=ChatResponse)
async def chat_with_assistant(
    request: ChatRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Чат-помощник для доработки архитектуры агента
    """
    try:
        logger.info(f"Чат: пользователь задаёт вопрос: {request.message[:100]}...")
        
        # Формируем историю переписки
        conversation_history_str = ""
        if request.conversation_history:
            for msg in request.conversation_history[-10:]:  # Последние 10 сообщений
                role = "Пользователь" if msg.role == "user" else "Ассистент"
                conversation_history_str += f"{role}: {msg.content}\n"
        
        if not conversation_history_str:
            conversation_history_str = "Нет предыдущих сообщений"
        
        # Формируем промпт
        chat_prompt = PROMPT_CHAT_ASSISTANT.format(
            agent_name=request.dashboard_context.agent_profile.name,
            agent_role=request.dashboard_context.agent_profile.role,
            description=request.dashboard_context.description,
            tech_stack=", ".join(request.dashboard_context.tech_stack),
            current_step=request.current_step or "не указан",
            conversation_history=conversation_history_str,
            message=request.message
        )
        
        result = call_groq(chat_prompt)
        
        response_data = {
            "response": result.get("response", "Извините, не могу ответить на этот вопрос."),
            "suggested_actions": result.get("suggested_actions", [])
        }
        
        logger.info("Чат: ответ сформирован")
        return response_data
        
    except Exception as e:
        logger.error(f"Ошибка чата: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ── Agent Storage ──────────────────────────────────────────────────────────────

class SaveAgentRequest(BaseModel):
    """Запрос на сохранение агента"""
    idea: str
    agent_data: AgentResponse


class AgentChatRequest(BaseModel):
    """Запрос чата для конкретного агента"""
    message: str
    conversation_history: Optional[List[DialogMessage]] = None
    current_step: Optional[str] = None  # Текущий шаг плана


@app.post("/api/agents/save")
async def save_agent(
    request: SaveAgentRequest,
    current_user: User = Depends(get_current_user),
):
    """Сохраняет сгенерированного агента в БД"""
    # Проверка лимита на количество агентов
    usage = user_db.get_usage_info(current_user.username)
    if not usage["can_save_agent"]:
        raise HTTPException(
            status_code=402,
            detail={
                "code": "AGENT_LIMIT_REACHED",
                "message": f"Вы достигли лимита на {usage['agents_limit']} агентов. Удалите старые или обновите тариф.",
                "plan": usage["plan"],
                "agents_count": usage["agents_count"],
                "agents_limit": usage["agents_limit"],
            }
        )
    
    import uuid
    agent_id = str(uuid.uuid4())
    user_db.save_agent(
        agent_id=agent_id,
        username=current_user.username,
        name=request.agent_data.agent_profile.name,
        role=request.agent_data.agent_profile.role,
        avatar=request.agent_data.agent_profile.avatar,
        idea=request.idea,
        full_response=request.agent_data.model_dump(),
    )
    logger.info(f"Агент сохранён: {agent_id} для {current_user.username}")
    return {"id": agent_id, "usage": usage}


@app.get("/api/agents")
async def list_agents(current_user: User = Depends(get_current_user)):
    """Список агентов текущего пользователя"""
    return user_db.get_user_agents(current_user.username)


@app.get("/api/agents/{agent_id}")
async def get_agent(agent_id: str, current_user: User = Depends(get_current_user)):
    """Получение конкретного агента"""
    agent = user_db.get_agent(agent_id, current_user.username)
    if not agent:
        raise HTTPException(status_code=404, detail="Агент не найден")
    return agent


@app.delete("/api/agents/{agent_id}")
async def delete_agent(agent_id: str, current_user: User = Depends(get_current_user)):
    """Удаление агента"""
    success = user_db.delete_agent(agent_id, current_user.username)
    if not success:
        raise HTTPException(status_code=404, detail="Агент не найден")
    return {"success": True}


@app.post("/api/agents/{agent_id}/chat", response_model=ChatResponse)
async def chat_with_agent(
    agent_id: str,
    request: AgentChatRequest,
    current_user: User = Depends(get_current_user),
):
    """Чат с конкретным агентом — история хранится в БД"""
    agent = user_db.get_agent(agent_id, current_user.username)
    if not agent:
        raise HTTPException(status_code=404, detail="Агент не найден")

    dashboard_data = agent["full_response"]

    # Берём историю из запроса или из БД
    if request.conversation_history:
        history = request.conversation_history
    else:
        history = [
            DialogMessage(role=m["role"], content=m["content"])
            for m in agent["chat_history"]
        ]

    conversation_history_str = ""
    for msg in history[-10:]:
        role = "Пользователь" if msg.role == "user" else "Ассистент"
        conversation_history_str += f"{role}: {msg.content}\n"
    if not conversation_history_str:
        conversation_history_str = "Нет предыдущих сообщений"

    chat_prompt = PROMPT_CHAT_ASSISTANT.format(
        agent_name=dashboard_data["agent_profile"]["name"],
        agent_role=dashboard_data["agent_profile"]["role"],
        description=dashboard_data["description"],
        tech_stack=", ".join(dashboard_data["tech_stack"]),
        current_step=request.current_step or "не указан",
        conversation_history=conversation_history_str,
        message=request.message,
    )

    result = call_groq(chat_prompt)

    # Сохраняем обновлённую историю в БД
    new_history = [{"role": m.role, "content": m.content} for m in history]
    new_history.append({"role": "user", "content": request.message})
    new_history.append({"role": "assistant", "content": result.get("response", "")})
    user_db.update_chat_history(agent_id, current_user.username, new_history)

    return {
        "response": result.get("response", "Извините, не могу ответить на этот вопрос."),
        "suggested_actions": result.get("suggested_actions", []),
    }


# ── Admin endpoints ────────────────────────────────────────────────────────────

def _require_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.plan != "admin":
        raise HTTPException(status_code=403, detail="Доступ только для администраторов")
    return current_user


@app.get("/api/admin/stats")
async def admin_stats(admin: User = Depends(_require_admin)):
    """Общая статистика платформы"""
    return user_db.get_admin_stats()


@app.get("/api/admin/users")
async def admin_users(admin: User = Depends(_require_admin)):
    """Список всех пользователей"""
    return user_db.get_all_users()


class AdminUpgradeRequest(BaseModel):
    username: str
    plan: str  # free | starter | pro | admin


@app.post("/api/admin/upgrade")
async def admin_upgrade(
    request: AdminUpgradeRequest,
    admin: User = Depends(_require_admin),
):
    """Сменить тариф любому пользователю"""
    allowed = {"free", "starter", "pro", "admin"}
    if request.plan not in allowed:
        raise HTTPException(status_code=400, detail="Недопустимый тариф")
    user_db.upgrade_plan(request.username, request.plan)
    logger.info(f"Admin {admin.username} → пользователь {request.username} перешёл на {request.plan}")
    return {"success": True}


class AdminDisableRequest(BaseModel):
    username: str
    disabled: bool


@app.post("/api/admin/disable")
async def admin_disable(
    request: AdminDisableRequest,
    admin: User = Depends(_require_admin),
):
    """Заблокировать/разблокировать пользователя"""
    if request.username == admin.username:
        raise HTTPException(status_code=400, detail="Нельзя заблокировать себя")
    user_db.set_user_disabled(request.username, request.disabled)
    return {"success": True}


class AdminResetRequest(BaseModel):
    username: str


@app.post("/api/admin/reset-generations")
async def admin_reset_generations(
    request: AdminResetRequest,
    admin: User = Depends(_require_admin),
):
    """Сбросить счётчик генераций пользователя за текущий месяц"""
    user_db.reset_user_generations(request.username)
    logger.info(f"Admin {admin.username} → сброс генераций {request.username}")
    return {"success": True}


@app.delete("/api/admin/users/{username}")
async def admin_delete_user(
    username: str,
    admin: User = Depends(_require_admin),
):
    """Удалить пользователя"""
    if username == admin.username:
        raise HTTPException(status_code=400, detail="Нельзя удалить свой аккаунт")
    if username == "admin":
        raise HTTPException(status_code=400, detail="Нельзя удалить системный аккаунт admin")
    success = user_db.delete_user(username)
    if not success:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    logger.info(f"Admin {admin.username} → удалён пользователь {username}")
    return {"success": True}


# ─── AI Providers ─────────────────────────────────────────────────────────────

@app.get("/api/admin/providers")
async def get_providers(admin: User = Depends(_require_admin)):
    """Получить всех AI провайдеров"""
    from app.ai_providers import ai_provider_manager

    # Получаем провайдеров из БД
    db_providers = user_db.get_ai_providers()
    if db_providers:
        # Убеждаемся что у каждого есть id
        for i, p in enumerate(db_providers):
            if "id" not in p:
                p["id"] = p.get("name", f"provider_{i}").lower().replace(" ", "_").replace("(", "").replace(")", "")
        return db_providers

    # Возвращаем дефолтных провайдеров с id
    providers_list = []
    for k, v in ai_provider_manager.default_providers.items():
        p = dict(v)
        p["id"] = k
        providers_list.append(p)
    return providers_list


@app.post("/api/admin/providers")
async def save_providers(
    request: Request,
    admin: User = Depends(_require_admin),
):
    """Сохранить AI провайдеров — принимает JSON-массив или {"providers": [...]}"""
    body = await request.json()
    # Поддерживаем оба формата: голый массив [...] и обёрнутый {"providers": [...]}
    providers = body if isinstance(body, list) else body.get("providers", [])
    user_db.save_ai_providers(providers)
    logger.info(f"Admin {admin.username} → сохранено {len(providers)} провайдеров")
    return {"success": True}


@app.get("/api/admin/providers/stats")
async def get_provider_stats(admin: User = Depends(_require_admin)):
    """Получить статистику использования провайдеров"""
    from app.ai_providers import ai_provider_manager
    
    # Статистика из менеджера
    manager_stats = ai_provider_manager.get_stats()
    
    # Статистика из БД
    db_stats = user_db.get_provider_stats()
    
    return {
        "manager": manager_stats,
        "database": db_stats,
    }


# ─── Admin Settings ───────────────────────────────────────────────────────────

SETTINGS_KEYS = [
    "yookassa_shop_id", "yookassa_secret_key",
    "smtp_host", "smtp_port", "smtp_user", "smtp_password", "smtp_from",
    "google_client_id", "google_client_secret",
    "github_client_id", "github_client_secret",
    "yandex_client_id", "yandex_client_secret",
    "sms_api_key",
    "backend_url",
]
SENSITIVE_KEYS = {"yookassa_secret_key", "smtp_password", "google_client_secret", "github_client_secret", "yandex_client_secret", "sms_api_key"}


@app.get("/api/admin/settings")
async def admin_get_settings(admin: User = Depends(_require_admin)):
    """Получить настройки платформы"""
    settings = user_db.get_settings(SETTINGS_KEYS)
    masked = {k: ("••••••••" if k in SENSITIVE_KEYS and v else v) for k, v in settings.items()}
    providers = user_db.get_ai_providers()
    # Маскируем ключи провайдеров
    safe_providers = []
    for p in providers:
        sp = {**p}
        if sp.get("key"):
            sp["key"] = sp["key"][:8] + "••••••••"
        safe_providers.append(sp)
    return {"settings": masked, "ai_providers": safe_providers}


class UpdateSettingsRequest(BaseModel):
    settings: Optional[Dict[str, str]] = None
    ai_providers: Optional[List[Dict[str, Any]]] = None


@app.post("/api/admin/settings")
async def admin_update_settings(
    request: UpdateSettingsRequest,
    admin: User = Depends(_require_admin),
):
    """Обновить настройки платформы"""
    if request.settings:
        # Не перезаписываем маскированные значения
        filtered = {k: v for k, v in request.settings.items()
                    if v and "••••" not in v and k in SETTINGS_KEYS}
        if filtered:
            user_db.set_settings(filtered)
    if request.ai_providers is not None:
        user_db.set_ai_providers(request.ai_providers)
    logger.info(f"Admin {admin.username} обновил настройки")
    return {"success": True}


class TestProviderRequest(BaseModel):
    base_url: str
    key: str
    model: str


@app.post("/api/admin/test-provider")
async def admin_test_provider(
    request: TestProviderRequest,
    admin: User = Depends(_require_admin),
):
    """Тест AI провайдера — отправляет тестовый запрос"""
    headers = {
        "Authorization": f"Bearer {request.key}",
        "Content-Type": "application/json",
    }
    if "openrouter" in request.base_url:
        headers["HTTP-Referer"] = "https://aiarchi.ru"
        headers["X-Title"] = "AI Architect"
    payload = {
        "model": request.model,
        "messages": [{"role": "user", "content": 'Say {"ok": true} in JSON'}],
        "max_tokens": 20,
        "response_format": {"type": "json_object"},
    }
    try:
        async with httpx.AsyncClient(timeout=15) as http:
            resp = await http.post(f"{request.base_url}/chat/completions", headers=headers, json=payload)
        if resp.status_code == 200:
            return {"success": True, "message": "Провайдер работает ✅"}
        return {"success": False, "message": f"HTTP {resp.status_code}: {resp.text[:200]}"}
    except Exception as e:
        return {"success": False, "message": str(e)[:200]}


# ─── Email ────────────────────────────────────────────────────────────────────

def send_email(to_username_or_email: str, subject: str, body_html: str) -> None:
    """Отправка email через SMTP. Настройки из БД (приоритет) или .env"""
    settings = user_db.get_settings(["smtp_host", "smtp_port", "smtp_user", "smtp_password", "smtp_from"])
    smtp_host     = settings.get("smtp_host") or os.getenv("SMTP_HOST", "")
    smtp_port     = int(settings.get("smtp_port") or os.getenv("SMTP_PORT", "587"))
    smtp_user     = settings.get("smtp_user") or os.getenv("SMTP_USER", "")
    smtp_password = settings.get("smtp_password") or os.getenv("SMTP_PASSWORD", "")
    smtp_from     = settings.get("smtp_from") or os.getenv("SMTP_FROM", smtp_user)

    if not all([smtp_host, smtp_user, smtp_password]):
        logger.info(f"SMTP не настроен, email не отправлен: {subject}")
        return

    # Если передан username — ищем email в БД
    if "@" not in to_username_or_email:
        user = user_db.get_user(to_username_or_email)
        to_email = user.get("email") if user else None
    else:
        to_email = to_username_or_email

    if not to_email:
        logger.info(f"Email не указан у пользователя, письмо не отправлено: {subject}")
        return

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"AI Architect <{smtp_from}>"
        msg["To"] = to_email

        html = f"""<!DOCTYPE html>
<html><body style="background:#0f172a;color:#e2e8f0;font-family:sans-serif;padding:32px;margin:0">
  <div style="max-width:560px;margin:0 auto">
    <h2 style="color:#22d3ee;margin-bottom:8px">AI Architect</h2>
    <div style="background:#1e293b;border-radius:12px;padding:24px;margin-top:16px">
      {body_html}
    </div>
    <p style="color:#475569;font-size:12px;margin-top:24px">
      Платформа AI Architect · <a href="https://aiarchi.ru" style="color:#22d3ee">aiarchi.ru</a>
    </p>
  </div>
</body></html>"""

        msg.attach(MIMEText(html, "html", "utf-8"))
        with smtplib.SMTP(smtp_host, smtp_port, timeout=10) as server:
            server.ehlo()
            server.starttls()
            server.login(smtp_user, smtp_password)
            server.sendmail(smtp_from, to_email, msg.as_string())
        logger.info(f"Email отправлен → {to_email}: {subject}")
    except Exception as e:
        logger.error(f"Ошибка отправки email: {e}")


# ─── YuKassa Payments ─────────────────────────────────────────────────────────

PLAN_PRICES: Dict[str, Dict[str, str]] = {
    "starter": {"amount": "990.00", "description": "Тариф Starter — 25 генераций/месяц"},
    "pro":     {"amount": "2990.00", "description": "Тариф Pro — безлимитные генерации"},
}


class CreatePaymentRequest(BaseModel):
    plan: str


def _get_yookassa_creds():
    s = user_db.get_settings(["yookassa_shop_id", "yookassa_secret_key"])
    shop_id    = s.get("yookassa_shop_id") or os.getenv("YOOKASSA_SHOP_ID", "")
    secret_key = s.get("yookassa_secret_key") or os.getenv("YOOKASSA_SECRET_KEY", "")
    return shop_id, secret_key


@app.get("/api/payments/status")
async def payment_status(current_user: User = Depends(get_current_user)):
    """Проверка, настроена ли платёжная система"""
    shop_id, secret_key = _get_yookassa_creds()
    return {"enabled": bool(shop_id and secret_key)}


@app.post("/api/payments/create")
async def create_payment(
    request: CreatePaymentRequest,
    current_user: User = Depends(get_current_user),
):
    """Создать платёж ЮKassa и вернуть URL для оплаты"""
    shop_id, secret_key = _get_yookassa_creds()

    if not shop_id or not secret_key:
        raise HTTPException(status_code=503, detail="Платёжная система не настроена")

    plan_info = PLAN_PRICES.get(request.plan)
    if not plan_info:
        raise HTTPException(status_code=400, detail="Неверный тариф")

    frontend_url = os.getenv("FRONTEND_URL", "https://aiarchi.ru")
    payload = {
        "amount": {"value": plan_info["amount"], "currency": "RUB"},
        "confirmation": {
            "type": "redirect",
            "return_url": f"{frontend_url}/pricing?status=success&plan={request.plan}",
        },
        "capture": True,
        "description": f"{plan_info['description']} (пользователь: {current_user.username})",
        "metadata": {"username": current_user.username, "plan": request.plan},
    }
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.post(
            "https://api.yookassa.ru/v3/payments",
            auth=(shop_id, secret_key),
            json=payload,
            headers={"Idempotence-Key": str(uuid.uuid4())},
        )
    if resp.status_code not in (200, 201):
        logger.error(f"YuKassa error: {resp.text}")
        raise HTTPException(status_code=502, detail="Ошибка платёжной системы")

    data = resp.json()
    return {
        "payment_id": data["id"],
        "confirmation_url": data["confirmation"]["confirmation_url"],
    }


@app.post("/api/payments/webhook")
async def payment_webhook(req: Request):
    """Webhook от ЮKassa при подтверждении оплаты"""
    try:
        body = await req.json()
    except Exception:
        return {"ok": True}

    if body.get("type") != "notification":
        return {"ok": True}

    obj = body.get("object", {})
    if obj.get("status") != "succeeded":
        return {"ok": True}

    meta = obj.get("metadata", {})
    username = meta.get("username")
    plan = meta.get("plan")

    if username and plan and plan in PLAN_PRICES:
        user_db.upgrade_plan(username, plan)
        logger.info(f"YuKassa webhook: {username} → {plan}")
        plan_ru = {"starter": "Starter", "pro": "Pro"}.get(plan, plan.title())
        send_email(
            username,
            f"Тариф {plan_ru} активирован — AI Architect",
            f"""<h3 style="color:#22d3ee">Оплата прошла успешно!</h3>
            <p>Тариф <strong>{plan_ru}</strong> активирован для вашего аккаунта.</p>
            <p style="margin-top:16px">
              <a href="https://aiarchi.ru/app/new"
                 style="background:#22d3ee;color:#0f172a;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:bold">
                Создать агента →
              </a>
            </p>""",
        )

    return {"ok": True}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
