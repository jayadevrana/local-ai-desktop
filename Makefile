SHELL := /bin/zsh

.PHONY: install dev build typecheck test db-generate db-migrate db-seed

install:
	corepack enable
	pnpm install

dev:
	pnpm dev

build:
	pnpm build

typecheck:
	pnpm typecheck

test:
	pnpm test

db-generate:
	pnpm db:generate

db-migrate:
	pnpm db:migrate

db-seed:
	pnpm db:seed
