from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Optional
import os
import json
import logging
import time
import asyncio
from dotenv import load_dotenv
from groq import Groq
from groq import APIError, APIConnectionError, RateLimitError

load_dotenv()

# Настраиваем логирование
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="AI Architect API")

# Разрешаем CORS для фронтенда
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Инициализируем клиент Groq
client = Groq(api_key=os.getenv("GROQ_API_KEY"))

# Хранилище состояний для сессий генерации
generation_progress = {}


class GenerationStage(BaseModel):
    """Модель для передачи этапа генерации"""
    stage: str
    step: int
    total_steps: int
    completed: bool = False


class AgentRequest(BaseModel):
    idea: str
    attachments: Optional[List[str]] = None


class ImplementationStep(BaseModel):
    day: int
    task: str
    duration: str


class ROI(BaseModel):
    hours_saved: int
    cost_saved: int
    chart_data: List[dict]


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
    roi: ROI
    risk_status: str


# Промпты для 4-уровневой цепочки
PROMPT_ANALYST = """Ты — бизнес-аналитик. Проанализируй идею ИИ-агента и определи:
1. Основную задачу агента
2. Входные данные (что получает)
3. Выходные данные (что выдаёт)
4. Интеграции (какие сервисы нужны)

Идея: {idea}

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

PROMPT_PM = """Ты — проект-менеджер. Создай план внедрения и расчёт ROI.

Задача: {task}

Верни ответ в формате JSON:
{{
  "implementation_plan": [
    {{"day": 1, "task": "...", "duration": "..."}},
    {{"day": 2, "task": "...", "duration": "..."}},
    ...
  ],
  "roi": {{
    "hours_saved": число,
    "cost_saved": число,
    "chart_data": [{{"month": "...", "savings": число}}, ...]
  }},
  "risk_status": "normal" или "warning" или "high"
}}"""


def call_groq(prompt: str, max_retries: int = 3) -> dict:
    """Вызов Groq API с retry-логикой"""
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
            wait_time = (attempt + 1) * 2  # Экспоненциальная задержка
            logger.warning(f"Ошибка сети/лимита: {e}. Ждём {wait_time}с...")
            time.sleep(wait_time)
            
        except (APIError, json.JSONDecodeError) as e:
            last_error = e
            logger.error(f"Ошибка API или парсинга JSON: {e}")
            # При ошибке парсинга JSON пробуем ещё раз
            if attempt < max_retries - 1:
                time.sleep(1)
                continue
            break
            
        except Exception as e:
            last_error = e
            logger.error(f"Неожиданная ошибка: {e}")
            break
    
    raise Exception(f"Не удалось получить ответ после {max_retries} попыток: {last_error}")


@app.get("/")
def read_root():
    return {"message": "AI Architect API (Groq) — готов к работе!"}


@app.get("/api/generate/{session_id}/progress")
async def get_generation_progress(session_id: str):
    """SSE endpoint для стриминга прогресса генерации"""
    from fastapi.responses import StreamingResponse
    
    async def event_generator():
        last_stage = ""
        for _ in range(300):  # Максимум 300 секунд (5 минут)
            if session_id in generation_progress:
                progress = generation_progress[session_id]
                if progress.get("completed"):
                    yield f"data: {json.dumps({'stage': 'Завершено', 'step': 4, 'total': 4, 'completed': True})}\n\n"
                    return
                current_stage = progress.get("stage", "")
                if current_stage != last_stage:
                    yield f"data: {json.dumps(progress)}\n\n"
                    last_stage = current_stage
            await asyncio.sleep(0.5)
        yield f"data: {json.dumps({'stage': 'Превышено время ожидания', 'error': True})}\n\n"
    
    return StreamingResponse(event_generator(), media_type="text/event-stream")


@app.post("/api/generate", response_model=AgentResponse)
async def generate_agent(request: AgentRequest):
    """
    Генерирует архитектуру ИИ-агента по описанию идеи
    """
    import uuid
    session_id = str(uuid.uuid4())
    generation_progress[session_id] = {"stage": "Инициализация...", "step": 0, "total": 4, "completed": False}
    
    logger.info(f"Получен запрос на генерацию агента. Session: {session_id}. Идея: {request.idea[:100]}...")
    
    try:
        # Шаг 1: Аналитик
        generation_progress[session_id] = {"stage": "Декомпозиция бизнес-задачи...", "step": 1, "total": 4, "completed": False}
        logger.info("Шаг 1/4: Запуск аналитика...")
        analyst_prompt = PROMPT_ANALYST.format(idea=request.idea)
        analyst_result = call_groq(analyst_prompt)
        logger.info(f"Аналитик завершён. Задача: {analyst_result.get('task', 'N/A')[:50]}...")

        # Шаг 2: Архитектор
        generation_progress[session_id] = {"stage": "Проектирование архитектуры...", "step": 2, "total": 4, "completed": False}
        logger.info("Шаг 2/4: Запуск архитектора...")
        architect_prompt = PROMPT_ARCHITECT.format(
            task=analyst_result["task"],
            integrations=", ".join(analyst_result.get("integrations", []))
        )
        architect_result = call_groq(architect_prompt)
        logger.info(f"Архитектор завершён. Агент: {architect_result.get('name', 'N/A')}")

        # Шаг 3: Визуализатор
        generation_progress[session_id] = {"stage": "Отрисовка схемы...", "step": 3, "total": 4, "completed": False}
        logger.info("Шаг 3/4: Запуск визуализатора...")
        visualizer_prompt = PROMPT_VISUALIZER.format(
            task=analyst_result["task"],
            inputs=", ".join(analyst_result.get("inputs", [])),
            outputs=", ".join(analyst_result.get("outputs", []))
        )
        visualizer_result = call_groq(visualizer_prompt)
        logger.info("Визуализатор завершён. Mermaid-код получен.")

        # Шаг 4: Проект-менеджер
        generation_progress[session_id] = {"stage": "Расчёт ROI и плана...", "step": 4, "total": 4, "completed": False}
        logger.info("Шаг 4/4: Запуск проект-менеджера...")
        pm_prompt = PROMPT_PM.format(task=analyst_result["task"])
        pm_result = call_groq(pm_prompt)
        logger.info(f"ПМ завершён. ROI: {pm_result.get('roi', {}).get('hours_saved', 0)} часов/месяц")

        # Валидация и сборка результата
        logger.info("Сборка финального ответа...")
        generation_progress[session_id] = {"stage": "Финализация...", "step": 4, "total": 4, "completed": True}
        
        # Fallback-значения на случай отсутствия данных
        agent_profile = {
            "name": architect_result.get("name", "AI Assistant"),
            "role": architect_result.get("role", "Помощник"),
            "avatar": architect_result.get("avatar", "🤖")
        }
        
        implementation_plan = []
        for step in pm_result.get("implementation_plan", []):
            implementation_plan.append({
                "day": step.get("day", 0),
                "task": step.get("task", "Не указано"),
                "duration": step.get("duration", "Не указано")
            })
        
        roi_data = pm_result.get("roi", {})
        roi = {
            "hours_saved": roi_data.get("hours_saved", 0),
            "cost_saved": roi_data.get("cost_saved", 0),
            "chart_data": roi_data.get("chart_data", [])
        }
        
        response_data = {
            "agent_profile": agent_profile,
            "description": analyst_result.get("task", "Автоматизация задачи"),
            "mermaid_code": visualizer_result.get("mermaid_code", ""),
            "system_prompt": architect_result.get("system_prompt", ""),
            "tech_stack": architect_result.get("tech_stack", []),
            "implementation_plan": implementation_plan,
            "roi": roi,
            "risk_status": pm_result.get("risk_status", "normal"),
            "session_id": session_id  # Добавляем session_id для отладки
        }
        
        logger.info("Генерация успешно завершена!")
        return response_data

    except KeyError as e:
        logger.error(f"Отсутствует обязательное поле в ответе API: {e}")
        generation_progress[session_id] = {"stage": f"Ошибка: {e}", "error": True, "completed": True}
        raise HTTPException(status_code=500, detail=f"Ошибка структуры данных: {str(e)}")
    except Exception as e:
        logger.error(f"Критическая ошибка генерации: {e}")
        generation_progress[session_id] = {"stage": f"Ошибка: {e}", "error": True, "completed": True}
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        # Очищаем прогресс через 30 секунд после завершения
        async def cleanup():
            await asyncio.sleep(30)
            generation_progress.pop(session_id, None)
        asyncio.create_task(cleanup())


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
