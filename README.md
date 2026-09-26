# Frame
Веб-интерфейс скачивания видео. Node.js 22 проксирует API Go-сервиса; токен WEB_API_TOKEN остаётся на сервере.

```sh
make init
# Заполните .env: WEB_API_TOKEN должен совпадать с backend.
make up
```

Интерфейс: http://localhost:3001. Backend в Docker: http://host.docker.internal:8085.

Для локальной разработки укажите BACKEND_URL=http://127.0.0.1:8085 в .env:
```sh
make install
make run
make fmt
make check
```

Все команды: make help. Для применения изменений используйте make up.
Состояния скачивания и срок хранения берутся из API. Поддерживаются мобильный экран, клавиатурная навигация и reduced motion.
# DownoladerFront
