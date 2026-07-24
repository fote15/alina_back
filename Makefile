.PHONY: run build tidy migrate

run:
	go run ./cmd/main.go

build:
	go build -o bin/server ./cmd/main.go

tidy:
	go mod tidy

migrate:
	@echo "Migrations are applied automatically on server start"
