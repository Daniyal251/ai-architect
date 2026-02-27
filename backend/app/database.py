"""
База данных пользователей (в памяти)
Для продакшена заменить на SQLAlchemy + PostgreSQL
"""
from typing import Dict, Optional
from app.auth import get_password_hash, verify_password


class FakeUserDB:
    """Простая база данных пользователей в памяти"""
    
    def __init__(self):
        self.users: Dict[str, dict] = {}
        # Добавим админа по умолчанию
        self.create_user("admin", "admin123")
    
    def create_user(self, username: str, password: str) -> dict:
        """Создание пользователя"""
        if username in self.users:
            raise ValueError(f"Пользователь {username} уже существует")
        
        hashed_pw = get_password_hash(password)
        user = {
            "username": username,
            "hashed_password": hashed_pw,
            "disabled": False
        }
        self.users[username] = user
        return {"username": username, "disabled": False}
    
    def get_user(self, username: str) -> Optional[dict]:
        """Получение пользователя"""
        return self.users.get(username)
    
    def authenticate(self, username: str, password: str) -> Optional[dict]:
        """Аутентификация пользователя"""
        user = self.get_user(username)
        if not user:
            return None
        if not verify_password(password, user["hashed_password"]):
            return None
        return {"username": username, "disabled": user["disabled"]}


# Глобальный экземпляр БД
user_db = FakeUserDB()
