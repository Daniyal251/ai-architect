"""
База данных (SQLAlchemy + MySQL/SQLite)
Автоматически определяет тип БД из DATABASE_URL
"""
import os
from sqlalchemy import create_engine, Column, String, Text, DateTime, Boolean, func, text
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
    hashed_password = Column(String, nullable=False)
    email           = Column(String, nullable=True)
    plan            = Column(String, default="free")   # free | starter | pro | admin
    plan_expires_at = Column(DateTime, nullable=True)  # None = бессрочно
    disabled        = Column(Boolean, default=False)
    created_at      = Column(DateTime, default=datetime.utcnow)


class AgentModel(Base):
    __tablename__ = "agents"

    id            = Column(String, primary_key=True)
    user_username = Column(String, nullable=False, index=True)
    name          = Column(String, nullable=False)
    role          = Column(String)
    avatar        = Column(String)
    idea          = Column(Text)
    full_response = Column(Text)              # JSON
    chat_history  = Column(Text, default="[]")  # JSON array
    created_at    = Column(DateTime, default=datetime.utcnow)


class UsageEventModel(Base):
    """Каждая генерация = одна запись"""
    __tablename__ = "usage_events"

    id         = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    username   = Column(String, nullable=False, index=True)
    event_type = Column(String, default="generation")  # generation | chat
    created_at = Column(DateTime, default=datetime.utcnow)


# ── Лимиты по тарифам ──────────────────────────────────────────────────────────
PLAN_LIMITS = {
    "free":    {"generations_per_month": 3,  "max_agents": 5},
    "starter": {"generations_per_month": 25, "max_agents": 30},
    "pro":     {"generations_per_month": -1, "max_agents": -1},   # -1 = безлимит
    "admin":   {"generations_per_month": -1, "max_agents": -1},
}

PLAN_NAMES = {
    "free":    "Free",
    "starter": "Starter — 990 ₽/мес",
    "pro":     "Pro — 2 990 ₽/мес",
    "admin":   "Admin",
}


def _migrate_existing_db():
    """Добавляет новые колонки в существующие таблицы (безопасно)"""
    with engine.connect() as conn:
        for ddl in [
            "ALTER TABLE users ADD COLUMN email TEXT",
            "ALTER TABLE users ADD COLUMN plan TEXT DEFAULT 'free'",
            "ALTER TABLE users ADD COLUMN plan_expires_at DATETIME",
        ]:
            try:
                conn.execute(text(ddl))
                conn.commit()
            except Exception:
                pass  # Колонка уже существует


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


# Глобальный экземпляр БД
user_db = Database()
