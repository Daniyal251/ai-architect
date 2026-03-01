#!/bin/bash
echo "=== Остановка старого бэкенда ==="
pkill -f uvicorn 2>/dev/null && echo "Остановлен" || echo "Не был запущен"
sleep 2

echo "=== Проверка Python ==="
python3 --version

echo "=== Переходим в папку бэкенда ==="
cd /www/aiarchi.ru/backend || { echo "ОШИБКА: папка не найдена"; exit 1; }

echo "=== Активируем virtualenv ==="
source venv/bin/activate || { echo "ОШИБКА: venv не найден, создаём..."; python3 -m venv venv && source venv/bin/activate && pip install -r requirements.txt; }

echo "=== Запускаем бэкенд на порту 9000 ==="
nohup uvicorn app.main:app --host 127.0.0.1 --port 9000 --workers 1 > /tmp/backend.log 2>&1 &

sleep 3
echo "=== Проверка ==="
if pgrep -f uvicorn > /dev/null; then
    echo "OK! Бэкенд запущен (PID: $(pgrep -f uvicorn))"
    echo "Порт: $(ss -tlnp 2>/dev/null | grep 9000 || netstat -tlnp 2>/dev/null | grep 9000)"
else
    echo "ОШИБКА! Смотри лог:"
    cat /tmp/backend.log
fi
