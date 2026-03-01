"""
Менеджер AI провайдеров — автоматическое переключение между Groq, OpenRouter, Anthropic, Gemini
"""
import os
import httpx
from typing import Optional, Dict, Any, List


class AIProviderManager:
    """Управление AI провайдерами с автоматическим переключением"""
    
    def __init__(self):
        # Провайдеры по умолчанию (из .env)
        self.default_providers = {
            "groq": {
                "name": "Groq",
                "enabled": os.getenv("GROQ_ENABLED", "true").lower() == "true",
                "api_key": os.getenv("GROQ_API_KEY", ""),
                "base_url": "https://api.groq.com/openai/v1",
                "models": [
                    {"id": "llama-3.3-70b-versatile", "priority": 1, "cost": "free"},
                    {"id": "llama-3.1-8b-instant", "priority": 2, "cost": "free"},
                    {"id": "gemma2-9b-it", "priority": 3, "cost": "free"},
                ],
                "timeout": 30,
                "max_retries": 3,
            },
            "openrouter": {
                "name": "OpenRouter",
                "enabled": os.getenv("OPENROUTER_ENABLED", "true").lower() == "true",
                "api_key": os.getenv("OPENROUTER_API_KEY", ""),
                "base_url": "https://openrouter.ai/api/v1",
                "models": [
                    {"id": "meta-llama/llama-3.3-70b-instruct:free", "priority": 1, "cost": "free"},
                    {"id": "google/gemma-7b-it:free", "priority": 2, "cost": "free"},
                    {"id": "meta-llama/llama-3-8b-instruct:free", "priority": 3, "cost": "free"},
                ],
                "timeout": 60,
                "max_retries": 3,
            },
            "anthropic": {
                "name": "Anthropic (Claude)",
                "enabled": os.getenv("ANTHROPIC_ENABLED", "false").lower() == "true",
                "api_key": os.getenv("ANTHROPIC_API_KEY", ""),
                "base_url": "https://api.anthropic.com/v1",
                "models": [
                    {"id": "claude-3-5-sonnet-20241022", "priority": 1, "cost": "paid"},
                    {"id": "claude-3-haiku-20240307", "priority": 2, "cost": "paid"},
                ],
                "timeout": 90,
                "max_retries": 2,
            },
            "google": {
                "name": "Google (Gemini)",
                "enabled": os.getenv("GOOGLE_ENABLED", "false").lower() == "true",
                "api_key": os.getenv("GOOGLE_API_KEY", ""),
                "base_url": "https://generativelanguage.googleapis.com/v1beta",
                "models": [
                    {"id": "gemini-1.5-pro", "priority": 1, "cost": "paid"},
                    {"id": "gemini-1.5-flash", "priority": 2, "cost": "paid"},
                ],
                "timeout": 60,
                "max_retries": 3,
            },
        }
        
        # Текущий индекс для round-robin
        self.current_index = 0
        
        # Статистика
        self.stats = {
            provider: {"requests": 0, "errors": 0, "last_error": None}
            for provider in self.default_providers
        }
    
    def get_active_providers(self) -> List[Dict[str, Any]]:
        """Получить список активных провайдеров (отсортированных по приоритету)"""
        active = []
        for provider_id, config in self.default_providers.items():
            if config["enabled"] and config["api_key"]:
                active.append({
                    "id": provider_id,
                    **config
                })
        
        # Сортировка: сначала бесплатные, потом платные
        active.sort(key=lambda x: (
            0 if any(m["cost"] == "free" for m in x["models"]) else 1,
            min(m["priority"] for m in x["models"])
        ))
        
        return active
    
    def get_next_provider(self) -> Optional[Dict[str, Any]]:
        """Получить следующий доступный провайдер (round-robin)"""
        active = self.get_active_providers()
        if not active:
            return None
        
        self.current_index = (self.current_index + 1) % len(active)
        return active[self.current_index]
    
    def get_model_for_provider(self, provider_id: str) -> Optional[str]:
        """Получить лучшую модель для провайдера"""
        provider = self.default_providers.get(provider_id)
        if not provider:
            return None
        
        # Сортируем модели по приоритету
        models = sorted(provider["models"], key=lambda x: x["priority"])
        return models[0]["id"] if models else None
    
    def record_request(self, provider_id: str, success: bool, error: Optional[str] = None):
        """Записать статистику запроса"""
        if provider_id not in self.stats:
            self.stats[provider_id] = {"requests": 0, "errors": 0, "last_error": None}
        
        self.stats[provider_id]["requests"] += 1
        if not success:
            self.stats[provider_id]["errors"] += 1
            self.stats[provider_id]["last_error"] = error
    
    def get_stats(self) -> Dict[str, Dict[str, Any]]:
        """Получить статистику использования"""
        return self.stats
    
    def is_provider_healthy(self, provider_id: str) -> bool:
        """Проверить здоровье провайдера (меньше 50% ошибок)"""
        stats = self.stats.get(provider_id)
        if not stats or stats["requests"] == 0:
            return True
        
        error_rate = stats["errors"] / stats["requests"]
        return error_rate < 0.5


# Глобальный менеджер
ai_provider_manager = AIProviderManager()


async def call_ai_api(
    prompt: str,
    provider_id: Optional[str] = None,
    temperature: float = 0.7,
    max_tokens: int = 2048,
    json_mode: bool = True,
) -> Dict[str, Any]:
    """
    Вызов AI API с автоматическим переключением провайдеров
    
    Args:
        prompt: Текст запроса
        provider_id: ID провайдера (если None — выбирается автоматически)
        temperature: Температура генерации
        max_tokens: Максимум токенов
        json_mode: Вернуть JSON
    
    Returns:
        Dict с результатом
    """
    import httpx
    import json
    
    # Получаем провайдеров
    if provider_id:
        providers = [ai_provider_manager.default_providers.get(provider_id)]
        if not providers[0]:
            raise ValueError(f"Неизвестный провайдер: {provider_id}")
    else:
        providers = ai_provider_manager.get_active_providers()
    
    if not providers:
        raise ValueError("Нет активных AI провайдеров. Проверьте API ключи в настройках.")
    
    last_error = None
    
    # Пробуем провайдеров по очереди
    for provider in providers:
        provider_id = provider["id"]
        api_key = provider["api_key"]
        base_url = provider["base_url"]
        timeout = provider["timeout"]
        max_retries = provider["max_retries"]
        
        # Получаем лучшую модель
        model = ai_provider_manager.get_model_for_provider(provider_id)
        if not model:
            continue
        
        # Пробуем несколько раз
        for attempt in range(max_retries):
            try:
                headers = {
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                }
                
                # Специфичные заголовки для разных провайдеров
                if provider_id == "anthropic":
                    headers["x-api-key"] = api_key
                    headers["anthropic-version"] = "2023-06-01"
                
                # Формируем запрос
                if provider_id in ["groq", "openrouter"]:
                    payload = {
                        "model": model,
                        "messages": [{"role": "user", "content": prompt}],
                        "temperature": temperature,
                        "max_tokens": max_tokens,
                    }
                    if json_mode:
                        payload["response_format"] = {"type": "json_object"}
                
                elif provider_id == "anthropic":
                    payload = {
                        "model": model,
                        "messages": [{"role": "user", "content": prompt}],
                        "max_tokens": max_tokens,
                    }
                
                elif provider_id == "google":
                    payload = {
                        "contents": [{"parts": [{"text": prompt}]}],
                        "generationConfig": {
                            "temperature": temperature,
                            "maxOutputTokens": max_tokens,
                        },
                    }
                
                # Делаем запрос
                async with httpx.AsyncClient(timeout=timeout) as client:
                    response = await client.post(
                        f"{base_url}/chat/completions" if provider_id != "google" 
                        else f"{base_url}/models/{model}:generateContent?key={api_key}",
                        headers=headers,
                        json=payload,
                    )
                
                if response.status_code != 200:
                    raise Exception(f"HTTP {response.status_code}: {response.text}")
                
                # Парсим ответ
                if provider_id == "google":
                    data = response.json()
                    content = data["candidates"][0]["content"]["parts"][0]["text"]
                else:
                    data = response.json()
                    content = data["choices"][0]["message"]["content"]
                
                # Возвращаем результат
                result = json.loads(content) if json_mode else {"text": content}
                
                ai_provider_manager.record_request(provider_id, True)
                return result
                
            except Exception as e:
                ai_provider_manager.record_request(provider_id, False, str(e))
                last_error = e
                
                if attempt < max_retries - 1:
                    import asyncio
                    await asyncio.sleep((attempt + 1) * 2)
                    continue
                else:
                    # Пробуем следующего провайдера
                    break
    
    # Все провайдеры не сработали
    error_msg = f"Все провайдеры не сработали. Последняя ошибка: {last_error}"
    raise Exception(error_msg)
