from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import os
import json
from dotenv import load_dotenv
from groq import Groq

load_dotenv()

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


def call_groq(prompt: str) -> dict:
    """Вызов Groq API"""
    try:
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
            max_tokens=2048,
            response_format={"type": "json_object"}
        )
        return json.loads(response.choices[0].message.content)
    except Exception as e:
        raise Exception(f"Ошибка Groq API: {str(e)}")


@app.get("/")
def read_root():
    return {"message": "AI Architect API (Groq) — готов к работе!"}


@app.post("/api/generate", response_model=AgentResponse)
async def generate_agent(request: AgentRequest):
    """
    Генерирует архитектуру ИИ-агента по описанию идеи
    """
    try:
        # Шаг 1: Аналитик
        analyst_prompt = PROMPT_ANALYST.format(idea=request.idea)
        analyst_result = call_groq(analyst_prompt)
        
        # Шаг 2: Архитектор
        architect_prompt = PROMPT_ARCHITECT.format(
            task=analyst_result["task"],
            integrations=", ".join(analyst_result["integrations"])
        )
        architect_result = call_groq(architect_prompt)
        
        # Шаг 3: Визуализатор
        visualizer_prompt = PROMPT_VISUALIZER.format(
            task=analyst_result["task"],
            inputs=", ".join(analyst_result["inputs"]),
            outputs=", ".join(analyst_result["outputs"])
        )
        visualizer_result = call_groq(visualizer_prompt)
        
        # Шаг 4: Проект-менеджер
        pm_prompt = PROMPT_PM.format(task=analyst_result["task"])
        pm_result = call_groq(pm_prompt)
        
        # Собираем результат
        return {
            "agent_profile": {
                "name": architect_result["name"],
                "role": architect_result["role"],
                "avatar": architect_result["avatar"]
            },
            "description": analyst_result["task"],
            "mermaid_code": visualizer_result["mermaid_code"],
            "system_prompt": architect_result["system_prompt"],
            "tech_stack": architect_result["tech_stack"],
            "implementation_plan": [
                {"day": step["day"], "task": step["task"], "duration": step["duration"]}
                for step in pm_result["implementation_plan"]
            ],
            "roi": pm_result["roi"],
            "risk_status": pm_result["risk_status"]
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
