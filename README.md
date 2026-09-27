# Frame
Веб-интерфейс скачивания видео. Node.js 22 проксирует API Go-сервиса; токен WEB_API_TOKEN остаётся на сервере.

```sh
make init
# Заполните .env: WEB_API_TOKEN должен совпадать с backend.
make up
```

Интерфейс: http://localhost:3001. Адрес backend задаётся через BACKEND_URL в .env; сейчас это https://downoladerback-1.onrender.com/.

Для локальной разработки можно заменить BACKEND_URL в .env на http://127.0.0.1:8085:
```sh
make install
make run
make fmt
make check
```

Все команды: make help. Для применения изменений используйте make up.
Состояния скачивания и срок хранения берутся из API. Поддерживаются мобильный экран, клавиатурная навигация и reduced motion.
# DownoladerFront
