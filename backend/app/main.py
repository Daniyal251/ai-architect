from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import List, Optional, Dict, Any, Tuple
import os
import json
import logging
import time
import asyncio
import functools
from dotenv import load_dotenv
from groq import Groq
from groq import APIError, APIConnectionError, RateLimitError
from app.auth import (
    create_access_token, 
    decode_access_token, 
    get_password_hash,
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

# Инициализируем клиент Groq
client = Groq(api_key=os.getenv("GROQ_API_KEY"))

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

PROMPT_ANALYST = """Ты — бизнес-аналитик. Проанализируй идею ИИ-агента и определи:
1. Основную задачу агента
2. Входные данные (что получает)
3. Выходные данные (что выдаёт)
4. Интеграции (какие сервисы нужны)

Идея: {idea}
Контекст из диалога: {context}

Верни ответ в формате JSON:
{{
  "task": "...",
  "inputs": [...],
  "outputs": [...],
  "integrations": [...]
}}"""

PROMPT_ARCHITECT = """Ты — AI архитектор. Создай системный промпт для ИИ-агента.

Задача агента: {task}
Интеграции: {integrations}

Верни ответ в формате JSON:
{{
  "name": "креативное имя агента",
  "role": "роль агента",
  "avatar": "эмодзи",
  "system_prompt": "полный системный промпт для агента",
  "tech_stack": [...]
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
    """Вызов Groq API с retry-логикой и fallback
    
    Args:
        prompt: Промпт для API
        max_retries: Максимальное количество попыток
        fallback_result: Результат при неудаче (если None — выбрасывается исключение)
    """
    last_error = None

    for attempt in range(max_retries):
        try:
            logger.info(f"Вызов Groq API (попытка {attempt + 1}/{max_retries})")
            response = client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.7,
                max_tokens=2048,
                response_format={"type": "json_object"}
            )

            content = response.choices[0].message.content
            logger.info(f"Получен ответ от Groq API, длина: {len(content)}")

            result = json.loads(content)
            return result

        except (APIConnectionError, RateLimitError) as e:
            last_error = e
            wait_time = (attempt + 1) * 3  # Экспоненциальная задержка: 3с, 6с, 9с
            logger.warning(f"Ошибка сети/лимита: {e}. Ждём {wait_time}с...")
            time.sleep(wait_time)

        except (APIError, json.JSONDecodeError) as e:
            last_error = e
            logger.error(f"Ошибка API или парсинга JSON: {e}")
            # При ошибке парсинга JSON пробуем ещё раз
            if attempt < max_retries - 1:
                time.sleep(2)
                continue
            break

        except Exception as e:
            last_error = e
            logger.error(f"Неожиданная ошибка: {e}")
            break

    # Все попытки исчерпаны
    if fallback_result:
        logger.warning(f"Использую fallback результат после {max_retries} попыток")
        return fallback_result
    
    raise Exception(f"Не удалось получить ответ после {max_retries} попыток: {last_error}")


@app.get("/")
def read_root():
    return {"message": "AI Architect API (Groq) — готов к работе!"}


@app.post("/api/auth/register", response_model=User)
async def register(user_data: UserCreate):
    """Регистрация нового пользователя"""
    try:
        user = user_db.create_user(user_data.username, user_data.password, user_data.email)
        logger.info(f"Зарегистрирован новый пользователь: {user_data.username}")
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
                task=analyst_result.get("task", "Автоматизация"),
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


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
