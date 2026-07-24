package handlers

import (
	"net/http"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/crypto/bcrypt"

	"alina-trade/back/internal/middleware"
)

type AuthHandler struct {
	DB        *pgxpool.Pool
	JWTSecret string
}

type registerReq struct {
	Email    string `json:"email"`
	Phone    string `json:"phone"`
	Password string `json:"password"`
	Role     string `json:"role"` // buyer | supplier
}

type loginReq struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type authResponse struct {
	Token string `json:"token"`
	User  userDTO `json:"user"`
}

type userDTO struct {
	ID    string `json:"id"`
	Email string `json:"email"`
	Phone string `json:"phone"`
	Role  string `json:"role"`
}

func (h *AuthHandler) Register(w http.ResponseWriter, r *http.Request) {
	var req registerReq
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if req.Email == "" || req.Password == "" {
		writeError(w, http.StatusBadRequest, "email and password are required")
		return
	}
	if req.Role != "buyer" && req.Role != "supplier" {
		req.Role = "buyer"
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to hash password")
		return
	}

	var id, email, role string
	err = h.DB.QueryRow(r.Context(),
		`INSERT INTO users (email, phone, password_hash, role) VALUES ($1, $2, $3, $4)
		 RETURNING id, email, role`,
		req.Email, req.Phone, string(hash), req.Role,
	).Scan(&id, &email, &role)
	if err != nil {
		writeError(w, http.StatusConflict, "user already exists or invalid data")
		return
	}

	token, err := h.generateToken(id, role)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to generate token")
		return
	}

	writeJSON(w, http.StatusCreated, authResponse{
		Token: token,
		User:  userDTO{ID: id, Email: email, Phone: req.Phone, Role: role},
	})
}

func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	var req loginReq
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	var id, hash, role, phone string
	err := h.DB.QueryRow(r.Context(),
		`SELECT id, password_hash, role, COALESCE(phone,'') FROM users WHERE email=$1`,
		req.Email,
	).Scan(&id, &hash, &role, &phone)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "invalid email or password")
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(req.Password)); err != nil {
		writeError(w, http.StatusUnauthorized, "invalid email or password")
		return
	}

	token, err := h.generateToken(id, role)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to generate token")
		return
	}

	writeJSON(w, http.StatusOK, authResponse{
		Token: token,
		User:  userDTO{ID: id, Email: req.Email, Phone: phone, Role: role},
	})
}

func (h *AuthHandler) Me(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r)
	var id, email, phone, role string
	err := h.DB.QueryRow(r.Context(),
		`SELECT id, email, COALESCE(phone,''), role FROM users WHERE id=$1`, userID,
	).Scan(&id, &email, &phone, &role)
	if err != nil {
		writeError(w, http.StatusNotFound, "user not found")
		return
	}
	writeJSON(w, http.StatusOK, userDTO{ID: id, Email: email, Phone: phone, Role: role})
}

func (h *AuthHandler) generateToken(userID, role string) (string, error) {
	claims := &middleware.Claims{
		UserID: userID,
		Role:   role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(30 * 24 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(h.JWTSecret))
}
