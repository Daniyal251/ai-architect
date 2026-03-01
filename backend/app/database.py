"""
База данных (SQLAlchemy + MySQL/SQLite)
Автоматически определяет тип БД из DATABASE_URL
Поддержка AI провайдеров с переключением
"""
import os
from typing import Optional, List, Dict, Any
from sqlalchemy import create_engine, Column, String, Text, DateTime, Boolean, func, text, Integer
from sqlalchemy.orm import declarative_base, sessionmaker
from datetime import datetime
import json
import uuid
from app.auth import get_password_hash, verify_password

# Автоматическое определение БД
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./ai_architect.db")

# Настройки для MySQL
if DATABASE_URL.startswith("mysql"):
    engine = create_engine(
        DATABASE_URL,
        pool_pre_ping=True,
        pool_recycle=3600,
        pool_size=10,
        max_overflow=20,
    )
# Настройки для SQLite
else:
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class UserModel(Base):
    __tablename__ = "users"

    username        = Column(String, primary_key=True, index=True)
    hashed_password = Column(String, nullable=True)   # nullable для OAuth-юзеров без пароля
    email           = Column(String, nullable=True)
    plan            = Column(String, default="free")
    plan_expires_at = Column(DateTime, nullable=True)
    disabled        = Column(Boolean, default=False)
    created_at      = Column(DateTime, default=datetime.utcnow)
    oauth_provider  = Column(String, nullable=True)   # google | github | yandex | phone
    oauth_id        = Column(String, nullable=True)   # ID у провайдера или номер телефона


class AgentModel(Base):
    __tablename__ = "agents"

    id            = Column(String, primary_key=True)
    user_username = Column(String, nullable=False, index=True)
    name          = Column(String, nullable=False)
    role          = Column(String)
    avatar        = Column(String)
    idea          = Column(Text)
    full_response = Column(Text)
    chat_history  = Column(Text, default="[]")
    created_at    = Column(DateTime, default=datetime.utcnow)


class UsageEventModel(Base):
    __tablename__ = "usage_events"

    id         = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    username   = Column(String, nullable=False, index=True)
    event_type = Column(String, default="generation")
    created_at = Column(DateTime, default=datetime.utcnow)


class ConfigModel(Base):
    """Конфигурация приложения (AI провайдеры, настройки)"""
    __tablename__ = "config"

    key   = Column(String, primary_key=True)
    value = Column(Text, nullable=False)


class ProviderStatModel(Base):
    """Статистика использования AI провайдеров"""
    __tablename__ = "provider_stats"

    provider_id = Column(String, primary_key=True)
    requests    = Column(Integer, default=0)
    errors      = Column(Integer, default=0)
    updated_at  = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class OtpModel(Base):
    """Одноразовые коды для входа по телефону"""
    __tablename__ = "otp_codes"

    phone      = Column(String, primary_key=True)
    code       = Column(String, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    attempts   = Column(Integer, default=0)


# Лимиты по тарифам
PLAN_LIMITS = {
    "free":    {"generations_per_month": 3,  "max_agents": 5},
    "starter": {"generations_per_month": 25, "max_agents": 30},
    "pro":     {"generations_per_month": -1, "max_agents": -1},
    "admin":   {"generations_per_month": -1, "max_agents": -1},
}

PLAN_NAMES = {
    "free":    "Free",
    "starter": "Starter — 990 ₽/мес",
    "pro":     "Pro — 2 990 ₽/мес",
    "admin":   "Admin",
}


def _migrate_existing_db():
    """Добавляет новые колонки и таблицы"""
    with engine.connect() as conn:
        for ddl in [
            "ALTER TABLE users ADD COLUMN email TEXT",
            "ALTER TABLE users ADD COLUMN plan TEXT DEFAULT 'free'",
            "ALTER TABLE users ADD COLUMN plan_expires_at DATETIME",
            "ALTER TABLE users ADD COLUMN oauth_provider TEXT",
            "ALTER TABLE users ADD COLUMN oauth_id TEXT",
            "CREATE TABLE IF NOT EXISTS config (key VARCHAR(255) PRIMARY KEY, value TEXT NOT NULL)",
            "CREATE TABLE IF NOT EXISTS provider_stats (provider_id VARCHAR(255) PRIMARY KEY, requests INT DEFAULT 0, errors INT DEFAULT 0, updated_at DATETIME)",
            "CREATE TABLE IF NOT EXISTS otp_codes (phone VARCHAR(20) PRIMARY KEY, code VARCHAR(10) NOT NULL, expires_at DATETIME NOT NULL, attempts INT DEFAULT 0)",
        ]:
            try:
                conn.execute(text(ddl))
                conn.commit()
            except Exception:
                pass


Base.metadata.create_all(bind=engine)
_migrate_existing_db()


class Database:
    def __init__(self):
        db = SessionLocal()
        try:
            existing = db.query(UserModel).filter(UserModel.username == "admin").first()
            if not existing:
                db.add(UserModel(
                    username="admin",
                    hashed_password=get_password_hash("admin123"),
                    plan="admin",
                ))
                db.commit()
            elif existing.plan != "admin":
                existing.plan = "admin"
                db.commit()
        finally:
            db.close()

    # ── Users ──────────────────────────────────────────────────────────────────

    def create_user(self, username: str, password: str, email: str | None = None) -> dict:
        db = SessionLocal()
        try:
            if db.query(UserModel).filter(UserModel.username == username).first():
                raise ValueError(f"Пользователь '{username}' уже существует")
            db.add(UserModel(
                username=username,
                hashed_password=get_password_hash(password),
                email=email,
                plan="free",
            ))
            db.commit()
            return {"username": username, "plan": "free", "disabled": False}
        finally:
            db.close()

    def get_user(self, username: str):
        db = SessionLocal()
        try:
            user = db.query(UserModel).filter(UserModel.username == username).first()
            if not user:
                return None
            return {
                "username": user.username,
                "hashed_password": user.hashed_password,
                "email": user.email,
                "plan": user.plan or "free",
                "plan_expires_at": user.plan_expires_at,
                "disabled": user.disabled,
                "created_at": user.created_at.isoformat() if user.created_at else None,
            }
        finally:
            db.close()

    def authenticate(self, username: str, password: str):
        user = self.get_user(username)
        if not user:
            return None
        if not verify_password(password, user["hashed_password"]):
            return None
        return user

    def upgrade_plan(self, username: str, plan: str, expires_at=None):
        db = SessionLocal()
        try:
            user = db.query(UserModel).filter(UserModel.username == username).first()
            if user:
                user.plan = plan
                user.plan_expires_at = expires_at
                db.commit()
        finally:
            db.close()

    def set_user_disabled(self, username: str, disabled: bool):
        db = SessionLocal()
        try:
            user = db.query(UserModel).filter(UserModel.username == username).first()
            if user:
                user.disabled = disabled
                db.commit()
        finally:
            db.close()

    # ── Usage / Limits ─────────────────────────────────────────────────────────

    def record_generation(self, username: str):
        db = SessionLocal()
        try:
            db.add(UsageEventModel(
                id=str(uuid.uuid4()),
                username=username,
                event_type="generation",
            ))
            db.commit()
        finally:
            db.close()

    def get_monthly_generations(self, username: str) -> int:
        db = SessionLocal()
        try:
            now = datetime.utcnow()
            month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            count = (
                db.query(func.count(UsageEventModel.id))
                .filter(
                    UsageEventModel.username == username,
                    UsageEventModel.event_type == "generation",
                    UsageEventModel.created_at >= month_start,
                )
                .scalar()
            )
            return count or 0
        finally:
            db.close()

    def get_user_agent_count(self, username: str) -> int:
        db = SessionLocal()
        try:
            return db.query(AgentModel).filter(AgentModel.user_username == username).count()
        finally:
            db.close()

    def get_usage_info(self, username: str) -> dict:
        user = self.get_user(username)
        plan = user.get("plan", "free") if user else "free"
        limits = PLAN_LIMITS.get(plan, PLAN_LIMITS["free"])

        gens_used = self.get_monthly_generations(username)
        agents_count = self.get_user_agent_count(username)
        gen_limit = limits["generations_per_month"]
        agent_limit = limits["max_agents"]

        return {
            "plan": plan,
            "plan_name": PLAN_NAMES.get(plan, "Free"),
            "generations_used": gens_used,
            "generations_limit": gen_limit,
            "generations_remaining": max(0, gen_limit - gens_used) if gen_limit != -1 else -1,
            "agents_count": agents_count,
            "agents_limit": agent_limit,
            "can_generate": gen_limit == -1 or gens_used < gen_limit,
            "can_save_agent": agent_limit == -1 or agents_count < agent_limit,
        }

    # ── Agents ─────────────────────────────────────────────────────────────────

    def save_agent(
        self, agent_id: str, username: str, name: str, role: str,
        avatar: str, idea: str, full_response: dict,
    ) -> dict:
        db = SessionLocal()
        try:
            db.add(AgentModel(
                id=agent_id,
                user_username=username,
                name=name,
                role=role,
                avatar=avatar,
                idea=idea,
                full_response=json.dumps(full_response, ensure_ascii=False),
                chat_history="[]",
            ))
            db.commit()
            return {"id": agent_id, "name": name}
        finally:
            db.close()

    def get_user_agents(self, username: str) -> list:
        db = SessionLocal()
        try:
            agents = (
                db.query(AgentModel)
                .filter(AgentModel.user_username == username)
                .order_by(AgentModel.created_at.desc())
                .all()
            )
            return [
                {
                    "id": a.id,
                    "name": a.name,
                    "role": a.role,
                    "avatar": a.avatar,
                    "idea": a.idea,
                    "created_at": a.created_at.isoformat(),
                }
                for a in agents
            ]
        finally:
            db.close()

    def get_agent(self, agent_id: str, username: str):
        db = SessionLocal()
        try:
            agent = (
                db.query(AgentModel)
                .filter(AgentModel.id == agent_id, AgentModel.user_username == username)
                .first()
            )
            if not agent:
                return None
            return {
                "id": agent.id,
                "name": agent.name,
                "role": agent.role,
                "avatar": agent.avatar,
                "idea": agent.idea,
                "full_response": json.loads(agent.full_response),
                "chat_history": json.loads(agent.chat_history or "[]"),
                "created_at": agent.created_at.isoformat(),
            }
        finally:
            db.close()

    def delete_agent(self, agent_id: str, username: str) -> bool:
        db = SessionLocal()
        try:
            agent = (
                db.query(AgentModel)
                .filter(AgentModel.id == agent_id, AgentModel.user_username == username)
                .first()
            )
            if not agent:
                return False
            db.delete(agent)
            db.commit()
            return True
        finally:
            db.close()

    def update_chat_history(self, agent_id: str, username: str, chat_history: list):
        db = SessionLocal()
        try:
            agent = (
                db.query(AgentModel)
                .filter(AgentModel.id == agent_id, AgentModel.user_username == username)
                .first()
            )
            if agent:
                agent.chat_history = json.dumps(chat_history, ensure_ascii=False)
                db.commit()
        finally:
            db.close()

    # ── AI Providers ───────────────────────────────────────────────────────────

    def get_ai_providers(self) -> list:
        """Получить AI провайдеров из БД"""
        db = SessionLocal()
        try:
            config = db.query(ConfigModel).filter(ConfigModel.key == "ai_providers").first()
            if config:
                return json.loads(config.value)
            return []
        finally:
            db.close()

    def save_ai_providers(self, providers: list):
        """Сохранить AI провайдеров"""
        db = SessionLocal()
        try:
            config = db.query(ConfigModel).filter(ConfigModel.key == "ai_providers").first()
            if config:
                config.value = json.dumps(providers, ensure_ascii=False)
            else:
                db.add(ConfigModel(key="ai_providers", value=json.dumps(providers, ensure_ascii=False)))
            db.commit()
        finally:
            db.close()

    def get_provider_stats(self) -> dict:
        """Получить статистику провайдеров"""
        db = SessionLocal()
        try:
            stats = db.query(ProviderStatModel).all()
            return {
                stat.provider_id: {
                    "requests": stat.requests,
                    "errors": stat.errors,
                    "updated_at": stat.updated_at.isoformat() if stat.updated_at else None,
                }
                for stat in stats
            }
        finally:
            db.close()

    def record_provider_request(self, provider_id: str, success: bool):
        """Записать запрос к провайдеру"""
        db = SessionLocal()
        try:
            stat = db.query(ProviderStatModel).filter(
                ProviderStatModel.provider_id == provider_id
            ).first()

            if not stat:
                stat = ProviderStatModel(provider_id=provider_id, requests=0, errors=0)
                db.add(stat)

            stat.requests += 1
            if not success:
                stat.errors += 1

            db.commit()
        finally:
            db.close()

    # ── Profile ────────────────────────────────────────────────────────────────

    def update_user_profile(self, username: str, email: Optional[str] = None, new_password: Optional[str] = None):
        """Обновить email и/или пароль пользователя"""
        db = SessionLocal()
        try:
            user = db.query(UserModel).filter(UserModel.username == username).first()
            if user:
                if email is not None:
                    user.email = email
                if new_password is not None:
                    user.hashed_password = get_password_hash(new_password)
                db.commit()
        finally:
            db.close()

    # ── Settings (key-value в config) ─────────────────────────────────────────

    def get_setting(self, key: str, default: Optional[str] = None) -> Optional[str]:
        """Получить одно значение настройки"""
        db = SessionLocal()
        try:
            row = db.query(ConfigModel).filter(ConfigModel.key == key).first()
            return row.value if row else default
        finally:
            db.close()

    def set_setting(self, key: str, value: str):
        """Установить одно значение настройки"""
        db = SessionLocal()
        try:
            row = db.query(ConfigModel).filter(ConfigModel.key == key).first()
            if row:
                row.value = value
            else:
                db.add(ConfigModel(key=key, value=value))
            db.commit()
        finally:
            db.close()

    def get_settings(self, keys: Optional[List[str]] = None) -> Dict[str, str]:
        """Получить несколько настроек по ключам (или все если keys=None)"""
        db = SessionLocal()
        try:
            query = db.query(ConfigModel)
            if keys:
                query = query.filter(ConfigModel.key.in_(keys))
            return {row.key: row.value for row in query.all()}
        finally:
            db.close()

    def set_settings(self, settings_dict: Dict[str, str]):
        """Установить несколько настроек сразу"""
        for key, value in settings_dict.items():
            self.set_setting(key, value)

    def set_ai_providers(self, providers: list):
        """Сохранить список AI провайдеров (псевдоним)"""
        self.save_ai_providers(providers)

    # ── OAuth / Phone ──────────────────────────────────────────────────────────

    def get_user_by_oauth(self, provider: str, oauth_id: str) -> Optional[dict]:
        """Найти юзера по OAuth провайдеру и ID"""
        db = SessionLocal()
        try:
            user = db.query(UserModel).filter(
                UserModel.oauth_provider == provider,
                UserModel.oauth_id == str(oauth_id),
            ).first()
            if not user:
                return None
            return {
                "username": user.username,
                "hashed_password": user.hashed_password,
                "email": user.email,
                "plan": user.plan or "free",
                "plan_expires_at": user.plan_expires_at,
                "disabled": user.disabled,
                "created_at": user.created_at.isoformat() if user.created_at else None,
            }
        finally:
            db.close()

    def create_oauth_user(self, username: str, email: Optional[str], provider: str, oauth_id: str) -> dict:
        """Создать пользователя через OAuth (без пароля)"""
        db = SessionLocal()
        try:
            # Если username занят — добавляем суффикс
            base = username
            suffix = 0
            while db.query(UserModel).filter(UserModel.username == username).first():
                suffix += 1
                username = f"{base}{suffix}"
            db.add(UserModel(
                username=username,
                hashed_password=None,
                email=email,
                plan="free",
                oauth_provider=provider,
                oauth_id=str(oauth_id),
            ))
            db.commit()
            return {"username": username, "plan": "free", "disabled": False}
        finally:
            db.close()

    # ── OTP (телефон) ──────────────────────────────────────────────────────────

    def save_otp(self, phone: str, code: str, expires_at: datetime):
        """Сохранить OTP код для телефона"""
        db = SessionLocal()
        try:
            row = db.query(OtpModel).filter(OtpModel.phone == phone).first()
            if row:
                row.code = code
                row.expires_at = expires_at
                row.attempts = 0
            else:
                db.add(OtpModel(phone=phone, code=code, expires_at=expires_at, attempts=0))
            db.commit()
        finally:
            db.close()

    def verify_otp(self, phone: str, code: str) -> bool:
        """Проверить OTP. Возвращает True если код верный и не истёк"""
        db = SessionLocal()
        try:
            row = db.query(OtpModel).filter(OtpModel.phone == phone).first()
            if not row:
                return False
            row.attempts += 1
            if row.attempts > 5:
                db.commit()
                return False
            if row.expires_at < datetime.utcnow():
                db.commit()
                return False
            if row.code != code:
                db.commit()
                return False
            db.delete(row)
            db.commit()
            return True
        finally:
            db.close()

    def get_user_by_phone(self, phone: str) -> Optional[dict]:
        """Найти юзера по номеру телефона"""
        return self.get_user_by_oauth("phone", phone)

    def create_phone_user(self, phone: str) -> dict:
        """Создать пользователя с телефоном"""
        username = "user_" + phone.lstrip("+").replace(" ", "")[-8:]
        return self.create_oauth_user(username, None, "phone", phone)

    # ── Admin ──────────────────────────────────────────────────────────────────

    def get_all_users(self) -> list:
        db = SessionLocal()
        try:
            users = db.query(UserModel).order_by(UserModel.created_at.desc()).all()
            result = []
            for u in users:
                now = datetime.utcnow()
                month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
                gens = (
                    db.query(func.count(UsageEventModel.id))
                    .filter(
                        UsageEventModel.username == u.username,
                        UsageEventModel.event_type == "generation",
                        UsageEventModel.created_at >= month_start,
                    )
                    .scalar()
                ) or 0
                agents_cnt = (
                    db.query(func.count(AgentModel.id))
                    .filter(AgentModel.user_username == u.username)
                    .scalar()
                ) or 0
                result.append({
                    "username": u.username,
                    "email": u.email,
                    "plan": u.plan or "free",
                    "disabled": u.disabled,
                    "created_at": u.created_at.isoformat() if u.created_at else None,
                    "generations_this_month": gens,
                    "agents_count": agents_cnt,
                })
            return result
        finally:
            db.close()

    def get_admin_stats(self) -> dict:
        db = SessionLocal()
        try:
            now = datetime.utcnow()
            month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

            total_users  = db.query(func.count(UserModel.username)).scalar() or 0
            paid_users   = (
                db.query(func.count(UserModel.username))
                .filter(UserModel.plan.in_(["starter", "pro"]))
                .scalar()
            ) or 0
            total_agents = db.query(func.count(AgentModel.id)).scalar() or 0
            gens_month   = (
                db.query(func.count(UsageEventModel.id))
                .filter(
                    UsageEventModel.event_type == "generation",
                    UsageEventModel.created_at >= month_start,
                )
                .scalar()
            ) or 0

            return {
                "total_users": total_users,
                "paid_users": paid_users,
                "free_users": total_users - paid_users,
                "total_agents": total_agents,
                "generations_this_month": gens_month,
            }
        finally:
            db.close()


    def get_agents_for_analytics(self, limit: int = 40) -> list:
        """Возвращает последние N агентов для AI-аналитики"""
        db = SessionLocal()
        try:
            agents = (
                db.query(AgentModel)
                .order_by(AgentModel.created_at.desc())
                .limit(limit)
                .all()
            )
            result = []
            for a in agents:
                chat_history = []
                try:
                    all_msgs = json.loads(a.chat_history or "[]")
                    # Берём первые 5 вопросов пользователя
                    chat_history = [
                        m["content"] for m in all_msgs
                        if m.get("role") == "user"
                    ][:5]
                except Exception:
                    pass
                result.append({
                    "name": a.name,
                    "role": a.role,
                    "idea": a.idea,
                    "chat_questions": chat_history,
                    "created_at": a.created_at.isoformat() if a.created_at else None,
                })
            return result
        finally:
            db.close()

    def get_agent_chat_history(self, agent_id: str, username: str) -> Optional[list]:
        """Возвращает chat_history агента если он принадлежит пользователю"""
        db = SessionLocal()
        try:
            agent = (
                db.query(AgentModel)
                .filter(AgentModel.id == agent_id, AgentModel.user_username == username)
                .first()
            )
            if not agent:
                return None
            return json.loads(agent.chat_history or "[]")
        finally:
            db.close()


# Глобальный экземпляр БД
user_db = Database()
