SHELL := /bin/bash
.DEFAULT_GOAL := help
COMPOSE := docker compose -f compose.yaml
ENV_FILE ?= .env

.PHONY: help init install run build up down restart logs ps check fmt
help:
	@printf '%s\n' 'make init / install — подготовить env / установить инструменты' 'make up / down — запустить / остановить UI' 'make build / restart / logs / ps' 'make run — локальный запуск с .env' 'make fmt / check — форматирование / проверка'
init:
	@test -f "$(ENV_FILE)" || (umask 077; cp .env.example "$(ENV_FILE)")
install:
	npm ci
run:
	node --env-file="$(ENV_FILE)" server.js
build:
	$(COMPOSE) --env-file "$(ENV_FILE)" build
up:
	$(COMPOSE) --env-file "$(ENV_FILE)" up -d --build
down:
	$(COMPOSE) --env-file "$(ENV_FILE)" down
restart:
	$(COMPOSE) --env-file "$(ENV_FILE)" restart frontend
logs:
	$(COMPOSE) --env-file "$(ENV_FILE)" logs -f --tail=100 frontend
ps:
	$(COMPOSE) --env-file "$(ENV_FILE)" ps
fmt:
	npm run format
check:
	npm run check
