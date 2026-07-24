package config

import (
	"os"
)

type Config struct {
	DBURL     string
	JWTSecret string
	Port      string
	UploadDir string
}

func Load() *Config {
	return &Config{
		DBURL:     getEnv("DB_URL", "postgresql://postgres:postgres@localhost:5432/alina_trade"),
		JWTSecret: getEnv("JWT_SECRET", "super-secret-key-change-in-production"),
		Port:      getEnv("PORT", "8080"),
		UploadDir: getEnv("UPLOAD_DIR", "./uploads"),
	}
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
