# 📦 Инструкция по деплою на Reg.ru

## Шаг 1: Подготовка базы данных

### 1.1 Создайте базу данных в ISPManager

1. Зайдите в панель ISPManager на Reg.ru
2. Перейдите в раздел **Базы данных → MySQL**
3. Нажмите **Создать**
4. Заполните:
   - **Имя БД:** `ai_architect` (или используйте `u3415770_default`)
   - **Пользователь:** создайте нового или используйте существующего
   - **Пароль:** сохраните надёжный пароль

### 1.2 Импортируйте схему БД

1. Откройте **phpMyAdmin** в панели Reg.ru
2. Выберите вашу базу данных
3. Перейдите на вкладку **SQL**
4. Вставьте содержимое файла `backend/schema.sql`
5. Нажмите **Вперёд**

Или через консоль:
```bash
mysql -u username -p database_name < backend/schema.sql
```

---

## Шаг 2: Настройка сервера

### 2.1 Подключитесь по SSH

```bash
ssh username@your-server.ru
```

### 2.2 Обновите пакеты

```bash
sudo apt update && sudo apt upgrade -y
```

### 2.3 Установите Python и Node.js

```bash
# Python 3.10+
sudo apt install python3.10 python3.10-venv python3-pip -y

# Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install nodejs -y
```

### 2.4 Установите MySQL (если не используется MySQL от Reg.ru)

```bash
sudo apt install mysql-server -y
sudo mysql_secure_installation
```

---

## Шаг 3: Загрузка проекта

### 3.1 Создайте директорию

```bash
sudo mkdir -p /var/www/ai-architect
sudo chown -R $USER:$USER /var/www/ai-architect
cd /var/www/ai-architect
```

### 3.2 Клонируйте репозиторий

```bash
git clone https://github.com/YOUR_USERNAME/ai-architect.git .
```

Или загрузите через FTP/SFTP файлы проекта.

---

## Шаг 4: Настройка бэкенда

### 4.1 Создайте виртуальное окружение

```bash
cd /var/www/ai-architect/backend
python3 -m venv venv
source venv/bin/activate
```

### 4.2 Установите зависимости

```bash
pip install -r requirements.txt
```

### 4.3 Создайте файл .env

```bash
cp .env.example .env
nano .env
```

Заполните `.env`:

```env
# Groq API
GROQ_API_KEY=gsk_your_actual_api_key_here

# Database (Reg.ru MySQL)
# ЗАМЕНИТЕ password на ваш реальный пароль от БД
DATABASE_URL=mysql://u3415770_default:YOUR_DB_PASSWORD@localhost/ai_architect

# JWT Secret (минимум 32 символа!)
JWT_SECRET_KEY=super-secret-key-min-32-chars-change-me

# Frontend URL
FRONTEND_URL=https://your-domain.ru

# Server
HOST=0.0.0.0
PORT=8000
LOG_LEVEL=INFO
```

### 4.4 Проверьте подключение к БД

```bash
source venv/bin/activate
python -c "from app.database import user_db; print('DB OK')"
```

---

## Шаг 5: Настройка фронтенда

### 5.1 Установите зависимости

```bash
cd /var/www/ai-architect/frontend
npm install
```

### 5.2 Соберите проект

```bash
npm run build
```

Появится папка `dist/` со статическими файлами.

---

## Шаг 6: Настройка Nginx

### 6.1 Создайте конфиг

```bash
sudo nano /etc/nginx/sites-available/ai-architect
```

Вставьте:

```nginx
server {
    listen 80;
    server_name your-domain.ru www.your-domain.ru;

    # Логи
    access_log /var/log/nginx/ai-architect.access.log;
    error_log /var/log/nginx/ai-architect.error.log;

    # Frontend (статика)
    location / {
        root /var/www/ai-architect/frontend/dist;
        try_files $uri $uri/ /index.html;
        
        # Кэширование статики
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # Backend API
    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Таймауты
        proxy_connect_timeout 60s;
        proxy_send_timeout 120s;
        proxy_read_timeout 120s;
    }

    # SSE для прогресса генерации (долгое соединение)
    location /api/generate/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 600s;
        proxy_set_header Connection '';
        proxy_http_version 1.1;
        chunked_transfer_encoding off;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # Защита от больших файлов
    client_max_body_size 10M;
}
```

### 6.2 Активируйте сайт

```bash
sudo ln -s /etc/nginx/sites-available/ai-architect /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## Шаг 7: systemd сервис для бэкенда

### 7.1 Создайте сервис

```bash
sudo nano /etc/systemd/system/ai-architect.service
```

Вставьте:

```ini
[Unit]
Description=AI Architect Backend Service
After=network.target mysql.service

[Service]
Type=simple
User=www-data
Group=www-data
WorkingDirectory=/var/www/ai-architect/backend
Environment="PATH=/var/www/ai-architect/backend/venv/bin"
ExecStart=/var/www/ai-architect/backend/venv/bin/gunicorn app.main:app \
    --workers 4 \
    --worker-class uvicorn.workers.UvicornWorker \
    --bind 127.0.0.1:8000 \
    --timeout 120 \
    --access-logfile /var/log/ai-architect/access.log \
    --error-logfile /var/log/ai-architect/error.log
Restart=always
RestartSec=10

# Лимиты
LimitNOFILE=65535

[Install]
WantedBy=multi-user.target
```

### 7.2 Создайте директорию для логов

```bash
sudo mkdir -p /var/log/ai-architect
sudo chown www-data:www-data /var/log/ai-architect
```

### 7.3 Запустите сервис

```bash
sudo systemctl daemon-reload
sudo systemctl enable ai-architect
sudo systemctl start ai-architect
sudo systemctl status ai-architect
```

---

## Шаг 8: Настройка SSL (HTTPS)

### 8.1 Установите Certbot

```bash
sudo apt install certbot python3-certbot-nginx -y
```

### 8.2 Получите сертификат

```bash
sudo certbot --nginx -d your-domain.ru -d www.your-domain.ru
```

Certbot автоматически:
- Получит сертификат Let's Encrypt
- Настроит Nginx для HTTPS
- Настроит редирект HTTP → HTTPS

### 8.3 Проверьте автообновление

```bash
sudo certbot renew --dry-run
```

---

## Шаг 9: Финальная проверка

### 9.1 Проверьте сервисы

```bash
# Nginx
sudo systemctl status nginx

# Backend
sudo systemctl status ai-architect

# MySQL (если локальный)
sudo systemctl status mysql
```

### 9.2 Проверьте логи

```bash
# Backend логи
sudo tail -f /var/log/ai-architect/error.log

# Nginx логи
sudo tail -f /var/log/nginx/ai-architect.error.log
```

### 9.3 Откройте сайт

Перейдите на `https://your-domain.ru`

---

## 🔧 Решение проблем

### Ошибка: "Can't connect to MySQL server"

Проверьте `.env`:
```env
DATABASE_URL=mysql://username:password@localhost/database_name
```

Проверьте подключение:
```bash
mysql -u username -p database_name
```

### Ошибка: "ModuleNotFoundError: No module named 'pymysql'"

```bash
source venv/bin/activate
pip install pymysql cryptography
```

### Ошибка: "CORS error" в браузере

Проверьте `FRONTEND_URL` в `.env`:
```env
FRONTEND_URL=https://your-domain.ru
```

### Ошибка: "403 Forbidden"

Проверьте права доступа:
```bash
sudo chown -R www-data:www-data /var/www/ai-architect
sudo chmod -R 755 /var/www/ai-architect
```

### SSE не работает (прогресс генерации)

Убедитесь, что в Nginx есть:
```nginx
location /api/generate/ {
    proxy_buffering off;
    proxy_cache off;
    proxy_read_timeout 600s;
}
```

---

## 📊 Мониторинг

### Просмотр логов в реальном времени

```bash
# Backend
journalctl -u ai-architect -f

# Nginx
sudo tail -f /var/log/nginx/ai-architect.access.log
```

### Проверка использования ресурсов

```bash
# RAM и CPU
htop

# Дисковое пространство
df -h

# Использование БД
mysql -u username -p database_name -e "SELECT COUNT(*) FROM users; SELECT COUNT(*) FROM agents;"
```

---

## 🔄 Обновление проекта

```bash
cd /var/www/ai-architect

# Git pull
git pull origin main

# Backend
cd backend
source venv/bin/activate
pip install -r requirements.txt
sudo systemctl restart ai-architect

# Frontend
cd ../frontend
npm install
npm run build

# Перезагрузите Nginx (опционально)
sudo systemctl reload nginx
```

---

## ✅ Чек-лист после деплоя

- [ ] Сайт открывается по HTTPS
- [ ] Регистрация работает
- [ ] Вход работает
- [ ] Генерация агента работает
- [ ] Прогресс генерации отображается (SSE)
- [ ] Сохранение агента работает
- [ ] Страница тарифов открывается
- [ ] Upgrade тарифа работает
- [ ] Лимиты соблюдаются
- [ ] Логи пишутся
- [ ] Ошибки логируются

---

**Готово!** 🎉 Ваш AI Architect развёрнут на Reg.ru
