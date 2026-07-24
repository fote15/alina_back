package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"

	"github.com/go-chi/chi/v5"
	chiMiddleware "github.com/go-chi/chi/v5/middleware"
	"github.com/golang-migrate/migrate/v4"
	_ "github.com/golang-migrate/migrate/v4/database/postgres"
	_ "github.com/golang-migrate/migrate/v4/source/file"
	"github.com/joho/godotenv"
	"github.com/rs/cors"

	"alina-trade/back/internal/config"
	"alina-trade/back/internal/db"
	"alina-trade/back/internal/handlers"
	"alina-trade/back/internal/middleware"
)

func main() {
	// Load .env
	_ = godotenv.Load()

	cfg := config.Load()

	ctx := context.Background()
	pool, err := db.New(ctx, cfg.DBURL)
	if err != nil {
		log.Fatalf("db connect: %v", err)
	}
	defer pool.Close()
	log.Println("✅ Database connected")

	// Run migrations
	migrationsPath := "file://./migrations"
	if _, err := os.Stat("./migrations"); os.IsNotExist(err) {
		migrationsPath = "file:///app/migrations"
	}
	m, err := migrate.New(migrationsPath, cfg.DBURL)
	if err != nil {
		log.Printf("⚠️  migration init: %v", err)
	} else {
		if err := m.Up(); err != nil && err != migrate.ErrNoChange {
			log.Printf("⚠️  migration up: %v", err)
		} else {
			log.Println("✅ Migrations applied")
		}
	}

	// Handlers
	authH := &handlers.AuthHandler{DB: pool, JWTSecret: cfg.JWTSecret}
	companyH := &handlers.CompanyHandler{DB: pool}
	productH := &handlers.ProductHandler{DB: pool}
	rfqH := &handlers.RFQHandler{DB: pool}
	proposalH := &handlers.ProposalHandler{DB: pool}
	orderH := &handlers.OrderHandler{DB: pool}
	chatH := &handlers.ChatHandler{DB: pool}
	reviewH := &handlers.ReviewHandler{DB: pool}
	notifH := &handlers.NotificationHandler{DB: pool}
	adminH := &handlers.AdminHandler{DB: pool}
	calcH := &handlers.CalculatorHandler{}

	authMW := middleware.Auth(cfg.JWTSecret)
	adminMW := middleware.RequireRole("admin")

	r := chi.NewRouter()
	r.Use(chiMiddleware.Logger)
	r.Use(chiMiddleware.Recoverer)
	r.Use(chiMiddleware.RequestID)

	// CORS
	c := cors.New(cors.Options{
		AllowedOrigins:   []string{"*"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type"},
		AllowCredentials: false,
	})
	r.Use(c.Handler)

	// Public routes
	r.Post("/api/auth/register", authH.Register)
	r.Post("/api/auth/login", authH.Login)

	// Public reads
	r.Get("/api/rfqs", rfqH.ListRFQs)
	r.Get("/api/rfqs/{id}", rfqH.GetRFQ)
	r.Get("/api/products", productH.ListProducts)
	r.Get("/api/products/{id}", productH.GetProduct)
	r.Get("/api/categories", productH.ListCategories)
	r.Get("/api/companies", companyH.ListSuppliers)
	r.Get("/api/companies/{id}", companyH.GetCompany)
	r.Get("/api/companies/{companyID}/reviews", reviewH.ListReviews)

	// Authenticated routes
	r.Group(func(r chi.Router) {
		r.Use(authMW)

		r.Get("/api/auth/me", authH.Me)

		// Company
		r.Get("/api/my/company", companyH.GetMyCompany)
		r.Post("/api/my/company", companyH.CreateCompany)
		r.Put("/api/my/company", companyH.UpdateCompany)

		// Products (supplier)
		r.Post("/api/products", productH.CreateProduct)
		r.Put("/api/products/{id}", productH.UpdateProduct)
		r.Delete("/api/products/{id}", productH.DeleteProduct)

		// RFQs (buyer)
		r.Post("/api/rfqs", rfqH.CreateRFQ)
		r.Patch("/api/rfqs/{id}/status", rfqH.UpdateRFQStatus)

		// Proposals
		r.Get("/api/proposals", proposalH.ListProposals)
		r.Post("/api/proposals", proposalH.CreateProposal)
		r.Post("/api/proposals/{id}/accept", proposalH.AcceptProposal)
		r.Post("/api/proposals/{id}/reject", proposalH.RejectProposal)

		// Orders
		r.Get("/api/orders", orderH.ListOrders)
		r.Get("/api/orders/{id}", orderH.GetOrder)
		r.Patch("/api/orders/{id}/status", orderH.UpdateOrderStatus)

		// Chat
		r.Get("/api/orders/{orderID}/messages", chatH.GetMessages)
		r.Post("/api/orders/{orderID}/messages", chatH.SendMessage)

		// Reviews
		r.Post("/api/reviews", reviewH.CreateReview)

		// Notifications
		r.Get("/api/notifications", notifH.ListNotifications)
		r.Post("/api/notifications/read", notifH.MarkRead)
		r.Get("/api/notifications/unread", notifH.UnreadCount)

		// Calculator
		r.Post("/api/calculator", calcH.Calculate)

		// Admin
		r.Group(func(r chi.Router) {
			r.Use(adminMW)
			r.Get("/api/admin/users", adminH.ListUsers)
			r.Post("/api/admin/users/{id}/block", adminH.BlockUser)
			r.Post("/api/admin/companies/{id}/verify", adminH.VerifyCompany)
			r.Get("/api/admin/reviews", adminH.ListReviewsMod)
			r.Post("/api/admin/reviews/{id}/moderate", adminH.ModerateReview)
			r.Get("/api/admin/stats", adminH.GetStats)
			r.Get("/api/admin/categories", adminH.ListCategories)
			r.Post("/api/admin/categories", adminH.CreateCategory)
		})
	})

	addr := fmt.Sprintf(":%s", cfg.Port)
	log.Printf("🚀 Server running on %s", addr)
	if err := http.ListenAndServe(addr, r); err != nil {
		log.Fatalf("server: %v", err)
	}
}
