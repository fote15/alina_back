FROM alpine:latest

WORKDIR /app

COPY server /app/server
COPY migrations /app/migrations

RUN chmod +x /app/server

EXPOSE 8080

CMD ["/app/server"]
