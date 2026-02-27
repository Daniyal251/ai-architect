# AI Architect — Фабрика ИИ-агентов 🚀

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Python 3.10+](https://img.shields.io/badge/python-3.10+-blue.svg)](https://www.python.org/downloads/)
[![Node.js 18+](https://img.shields.io/badge/node-18+-green.svg)](https://nodejs.org/)

**AI Architect** — платформа для создания ИИ-агентов за 5 минут. Опишите задачу — получите готовую архитектуру с системным промптом, планом внедрения и расчётом метрик.

## ✨ Возможности

- 🎯 **Контекстные метрики** — для каждого типа проекта свои KPI (стоимость, ROI, ресурсы)
- 💬 **Умный диалог** — 1-3 уточняющих вопроса вместо длинных форм
- 🔄 **4-шаговый пайплайн** — Аналитик → Архитектор → Визуализатор → Проект-менеджер
- 📊 **Визуализация** — схема работы агента на Mermaid.js
- 💾 **Сохранение агентов** — история всех созданных агентов
- 💬 **Chat Copilot** — помощник для доработки архитектуры
- 🎨 **15+ шаблонов** — готовые примеры для быстрого старта
- 💳 **Тарифы** — Free (3 генерации), Starter (25), Pro (безлимит)

## 🏗 Архитектура

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│  Frontend   │────▶│   Backend    │────▶│   Groq AI   │
│  (Vite+React)│     │ (FastAPI)    │     │ (Llama 70B) │
└─────────────┘     └──────────────┘     └─────────────┘
                           │
                           ▼
                    ┌──────────────┐
                    │  MySQL/SQLite│
                    └──────────────┘
```

## 🚀 Быстрый старт

### Требования

- Python 3.10+
- Node.js 18+
- Groq API ключ

### 1. Клонирование

```bash
git clone https://github.com/YOUR_USERNAME/ai-architect.git
cd ai-architect
```

### 2. Настройка бэкенда

```bash
cd backend
python -m venv venv
venv\Scripts\activate  # Windows
# source venv/bin/activate  # Linux/Mac

pip install -r requirements.txt
cp .env.example .env
```

Откройте `.env` и добавьте ваш Groq API ключ:
```
GROQ_API_KEY=your_groq_api_key
JWT_SECRET_KEY=your-secret-key-change-in-production
DATABASE_URL=mysql://user:password@localhost/ai_architect
```

### 3. Настройка фронтенда

```bash
cd ../frontend
npm install
```

### 4. Запуск

**Бэкенд (терминал 1):**
```bash
cd backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Фронтенд (терминал 2):**
```bash
cd frontend
npm run dev
```

Откройте **http://localhost:5173**

## 📦 Деплой на Reg.ru

### 1. Создайте базу данных MySQL

В панели Reg.ru (ISPManager):
1. Создайте базу данных `u3415770_default`
2. Создайте пользователя с паролем
3. Дайте все привилегии на базу

### 2. Импортируйте схему БД

Выполните SQL скрипт из `backend/schema.sql` через phpMyAdmin:

```bash
mysql -u username -p database_name < backend/schema.sql
```

### 3. Настройте окружение

Создайте `backend/.env`:
```env
GROQ_API_KEY=your_groq_api_key
JWT_SECRET_KEY=super-secret-key-min-32-chars
DATABASE_URL=mysql://u3415770_default:YOUR_PASSWORD@localhost/ai_architect
FRONTEND_URL=https://your-domain.ru
```

### 4. Установите зависимости

```bash
cd backend
pip install -r requirements.txt
pip install pymysql cryptography
```

### 5. Запустите через Gunicorn

```bash
gunicorn app.main:app \
  --workers 4 \
  --worker-class uvicorn.workers.UvicornWorker \
  --bind 0.0.0.0:8000 \
  --timeout 120 \
  --access-logfile logs/access.log \
  --error-logfile logs/error.log
```

### 6. Настройте Nginx

Пример конфига `/etc/nginx/sites-available/ai-architect`:

```nginx
server {
    listen 80;
    server_name your-domain.ru;

    # Frontend
    location / {
        root /var/www/ai-architect/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # SSE для прогресса генерации
    location /api/generate/ {
        proxy_pass http://localhost:8000;
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 600s;
        proxy_set_header Connection '';
        proxy_http_version 1.1;
        chunked_transfer_encoding off;
    }
}
```

### 7. Сборка фронтенда

```bash
cd frontend
npm run build
# Копируйте dist/ на сервер в /var/www/ai-architect/frontend/
```

### 8. systemd сервис для бэкенда

`/etc/systemd/system/ai-architect.service`:

```ini
[Unit]
Description=AI Architect Backend
After=network.target

[Service]
User=www-data
WorkingDirectory=/var/www/ai-architect/backend
Environment="PATH=/var/www/ai-architect/backend/venv/bin"
ExecStart=/var/www/ai-architect/backend/venv/bin/gunicorn app.main:app \
  --workers 4 \
  --worker-class uvicorn.workers.UvicornWorker \
  --bind 0.0.0.0:8000
Restart=always

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable ai-architect
sudo systemctl start ai-architect
sudo systemctl status ai-architect
```

## 📋 API Endpoints

### Авторизация
- `POST /api/auth/register` — Регистрация
- `POST /api/auth/login` — Вход
- `GET /api/auth/me` — Текущий пользователь

### Генерация
- `POST /api/generate` — Запуск генерации агента
- `GET /api/generate/{session_id}/progress` — SSE прогресс
- `POST /api/clarify` — Уточнение идеи

### Агенты
- `POST /api/agents/save` — Сохранить агента
- `GET /api/agents` — Список агентов
- `GET /api/agents/{id}` — Детали агента
- `DELETE /api/agents/{id}` — Удалить агента
- `POST /api/agents/{id}/chat` — Чат с агентом

### Тарифы
- `GET /api/usage` — Информация об использовании
- `POST /api/upgrade` — Смена тарифа

### Админка
- `GET /api/admin/stats` — Статистика
- `GET /api/admin/users` — Все пользователи
- `POST /api/admin/upgrade` — Сменить тариф пользователю
- `POST /api/admin/disable` — Заблокировать пользователя

## 🗂 Структура проекта

```
ai-architect/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py          # FastAPI приложение
│   │   ├── database.py      # SQLAlchemy + модели
│   │   └── auth.py          # JWT + хеширование
│   ├── .env.example
│   ├── requirements.txt
│   └── schema.sql
├── frontend/
│   ├── src/
│   │   ├── components/      # React компоненты
│   │   ├── pages/           # Страницы
│   │   ├── hooks/           # Custom hooks
│   │   ├── contexts/        # React Context
│   │   └── types.ts         # TypeScript типы
│   ├── package.json
│   └── vite.config.ts
├── .gitignore
└── README.md
```

## 🔧 Конфигурация

### Переменные окружения (backend/.env)

| Переменная | Описание | Пример |
|------------|----------|--------|
| `GROQ_API_KEY` | API ключ Groq | `gsk_...` |
| `JWT_SECRET_KEY` | Секрет для JWT | `min-32-chars` |
| `DATABASE_URL` | URL БД | `mysql://user:pass@host/db` |
| `FRONTEND_URL` | URL фронтенда | `https://domain.ru` |

### Тарифы

| Тариф | Генерации | Агенты | Цена |
|-------|-----------|--------|------|
| Free | 3/месяц | 5 | 0 ₽ |
| Starter | 25/месяц | 30 | 990 ₽/мес |
| Pro | Безлимит | Безлимит | 2990 ₽/мес |

## 🧠 Технологический стек

**Backend:**
- FastAPI 0.110+
- SQLAlchemy 2.0+
- Groq API (Llama 3.3 70B)
- Pydantic 2.6+
- python-jose (JWT)
- bcrypt

**Frontend:**
- React 19
- TypeScript 5.9
- Vite 7
- React Router 7
- Recharts 3
- Mermaid 11
- Tailwind CSS 4

**Database:**
- MySQL 8.0+ (production)
- SQLite 3 (development)

## 🤝 Вклад

1. Fork репозиторий
2. Создайте ветку (`git checkout -b feature/amazing-feature`)
3. Commit изменения (`git commit -m 'Add amazing feature'`)
4. Push (`git push origin feature/amazing-feature`)
5. Откройте Pull Request

## 📝 License

MIT License — см. [LICENSE](LICENSE) файл.

## 📞 Контакты

- GitHub Issues — для багов и фич
- Email — для вопросов

---

**Сделано с ❤️ для автоматизации бизнеса**
