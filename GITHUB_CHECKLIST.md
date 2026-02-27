# ✅ GitHub Publication Checklist

## Файлы подготовлены

- [x] `.gitignore` — обновлён для backend и frontend
- [x] `README.md` — полная документация
- [x] `DEPLOY.md` — инструкция по деплою на Reg.ru
- [x] `LICENSE` — MIT License
- [x] `backend/.env.example` — пример переменных окружения
- [x] `backend/requirements.txt` — зависимости с pymysql и gunicorn
- [x] `backend/schema.sql` — схема БД для MySQL
- [x] `frontend/.env.example` — пример для frontend
- [x] `frontend/.gitignore` — игноры для frontend
- [x] `frontend/src/vite-env.d.ts` — TypeScript типы для Vite
- [x] `frontend/vite.config.ts` — оптимизирован для production

## Изменения в коде

### Backend

- [x] `database.py` — поддержка MySQL через DATABASE_URL
- [x] `main.py` — валидация лимитов, fallback при ошибках Groq
- [x] Все endpoint'ы работают

### Frontend

- [x] Все компоненты используют `import.meta.env.VITE_API_URL`
- [x] 15 шаблонов на лендинге (5 категорий)
- [x] UsageBadge в Dashboard (индикатор лимитов)
- [x] Страница /pricing с upgrade
- [x] TypeScript компилируется без ошибок

## Готово к деплою

### База данных (Reg.ru)

```bash
# 1. Создать БД в ISPManager
# 2. Импортировать schema.sql
mysql -u u3415770_default -p ai_architect < backend/schema.sql
```

### Backend

```bash
# 1. Установить зависимости
pip install -r requirements.txt

# 2. Создать .env
cp .env.example .env
# Заполнить GROQ_API_KEY, DATABASE_URL, JWT_SECRET_KEY

# 3. Запустить через gunicorn
gunicorn app.main:app \
  --workers 4 \
  --worker-class uvicorn.workers.UvicornWorker \
  --bind 0.0.0.0:8000
```

### Frontend

```bash
# 1. Установить зависимости
npm install

# 2. Создать .env
cp .env.example .env
# Для production: VITE_API_URL=https://api.your-domain.ru

# 3. Собрать
npm run build

# 4. Копировать dist/ на сервер
```

## Переменные окружения

### Backend (.env)

```env
GROQ_API_KEY=gsk_your_key_here
# ЗАМЕНИТЕ YOUR_DB_PASSWORD на ваш реальный пароль
DATABASE_URL=mysql://u3415770_default:YOUR_DB_PASSWORD@localhost/ai_architect
JWT_SECRET_KEY=super-secret-key-32-chars-minimum
FRONTEND_URL=https://your-domain.ru
```

### Frontend (.env)

```env
VITE_API_URL=http://localhost:8000
# Для production:
# VITE_API_URL=https://api.your-domain.ru
```

## Команды для GitHub

```bash
# Инициализация
git init
git add .
git commit -m "Initial commit: AI Architect platform"

# Создание репозитория на GitHub
# https://github.com/new → создать репозиторий

# Push
git remote add origin https://github.com/YOUR_USERNAME/ai-architect.git
git branch -M main
git push -u origin main
```

## Проверка после деплоя

- [ ] Сайт открывается по HTTPS
- [ ] Регистрация работает
- [ ] Вход работает
- [ ] Генерация агента работает
- [ ] Прогресс генерации отображается (SSE)
- [ ] Сохранение агента работает
- [ ] Лимиты соблюдаются
- [ ] Upgrade тарифа работает
- [ ] Логирование работает

## Ссылки

- **GitHub Repo:** https://github.com/YOUR_USERNAME/ai-architect
- **Live Demo:** https://your-domain.ru
- **API Docs:** https://your-domain.ru/docs (Swagger UI)

---

**Готово к публикации!** 🚀
