package handlers

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"alina-trade/back/internal/middleware"
)

type CompanyHandler struct {
	DB *pgxpool.Pool
}

type companyDTO struct {
	ID            string  `json:"id"`
	UserID        string  `json:"user_id"`
	Name          string  `json:"name"`
	INN           string  `json:"inn"`
	KPP           string  `json:"kpp"`
	OGRN          string  `json:"ogrn"`
	LegalAddress  string  `json:"legal_address"`
	ActualAddress string  `json:"actual_address"`
	Director      string  `json:"director"`
	Description   string  `json:"description"`
	LogoURL       string  `json:"logo_url"`
	Website       string  `json:"website"`
	Phone         string  `json:"phone"`
	Email         string  `json:"email"`
	Region        string  `json:"region"`
	IsVerified    bool    `json:"is_verified"`
	Rating        float64 `json:"rating"`
	ReviewCount   int     `json:"review_count"`
	DealCount     int     `json:"deal_count"`
	Subscription  string  `json:"subscription"`
	CreatedAt     string  `json:"created_at"`
}

func (h *CompanyHandler) GetMyCompany(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r)
	var c companyDTO
	err := h.DB.QueryRow(r.Context(), `
		SELECT id, user_id, name, COALESCE(inn,''), COALESCE(kpp,''), COALESCE(ogrn,''),
		       COALESCE(legal_address,''), COALESCE(actual_address,''), COALESCE(director,''),
		       COALESCE(description,''), COALESCE(logo_url,''), COALESCE(website,''),
		       COALESCE(phone,''), COALESCE(email,''), COALESCE(region,''),
		       is_verified, rating, review_count, deal_count, subscription, created_at::text
		FROM companies WHERE user_id=$1`, userID,
	).Scan(&c.ID, &c.UserID, &c.Name, &c.INN, &c.KPP, &c.OGRN,
		&c.LegalAddress, &c.ActualAddress, &c.Director, &c.Description,
		&c.LogoURL, &c.Website, &c.Phone, &c.Email, &c.Region,
		&c.IsVerified, &c.Rating, &c.ReviewCount, &c.DealCount, &c.Subscription, &c.CreatedAt)
	if err != nil {
		writeError(w, http.StatusNotFound, "company not found")
		return
	}
	writeJSON(w, http.StatusOK, c)
}

func (h *CompanyHandler) CreateCompany(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r)
	var req struct {
		Name          string `json:"name"`
		INN           string `json:"inn"`
		KPP           string `json:"kpp"`
		OGRN          string `json:"ogrn"`
		LegalAddress  string `json:"legal_address"`
		ActualAddress string `json:"actual_address"`
		Director      string `json:"director"`
		Description   string `json:"description"`
		Website       string `json:"website"`
		Phone         string `json:"phone"`
		Email         string `json:"email"`
		Region        string `json:"region"`
	}
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid body")
		return
	}
	if req.Name == "" {
		writeError(w, http.StatusBadRequest, "name is required")
		return
	}
	var inn *string
	if req.INN != "" {
		inn = &req.INN
	}
	var c companyDTO
	err := h.DB.QueryRow(r.Context(), `
		INSERT INTO companies (user_id, name, inn, kpp, ogrn, legal_address, actual_address, director, description, website, phone, email, region)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
		RETURNING id, user_id, name, COALESCE(inn,''), COALESCE(kpp,''), COALESCE(ogrn,''),
		          COALESCE(legal_address,''), COALESCE(actual_address,''), COALESCE(director,''),
		          COALESCE(description,''), COALESCE(logo_url,''), COALESCE(website,''),
		          COALESCE(phone,''), COALESCE(email,''), COALESCE(region,''),
		          is_verified, rating, review_count, deal_count, subscription, created_at::text`,
		userID, req.Name, inn, req.KPP, req.OGRN,
		req.LegalAddress, req.ActualAddress, req.Director, req.Description,
		req.Website, req.Phone, req.Email, req.Region,
	).Scan(&c.ID, &c.UserID, &c.Name, &c.INN, &c.KPP, &c.OGRN,
		&c.LegalAddress, &c.ActualAddress, &c.Director, &c.Description,
		&c.LogoURL, &c.Website, &c.Phone, &c.Email, &c.Region,
		&c.IsVerified, &c.Rating, &c.ReviewCount, &c.DealCount, &c.Subscription, &c.CreatedAt)
	if err != nil {
		writeError(w, http.StatusConflict, "company already exists or invalid data")
		return
	}
	writeJSON(w, http.StatusCreated, c)
}

func (h *CompanyHandler) UpdateCompany(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r)
	var req struct {
		Name          string `json:"name"`
		Description   string `json:"description"`
		Website       string `json:"website"`
		Phone         string `json:"phone"`
		Email         string `json:"email"`
		Region        string `json:"region"`
		ActualAddress string `json:"actual_address"`
	}
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid body")
		return
	}
	_, err := h.DB.Exec(r.Context(), `
		UPDATE companies SET name=$1, description=$2, website=$3, phone=$4, email=$5, region=$6,
		actual_address=$7, updated_at=NOW() WHERE user_id=$8`,
		req.Name, req.Description, req.Website, req.Phone, req.Email, req.Region, req.ActualAddress, userID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to update company")
		return
	}
	h.GetMyCompany(w, r)
}

func (h *CompanyHandler) GetCompany(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var c companyDTO
	err := h.DB.QueryRow(r.Context(), `
		SELECT id, user_id, name, COALESCE(inn,''), COALESCE(kpp,''), COALESCE(ogrn,''),
		       COALESCE(legal_address,''), COALESCE(actual_address,''), COALESCE(director,''),
		       COALESCE(description,''), COALESCE(logo_url,''), COALESCE(website,''),
		       COALESCE(phone,''), COALESCE(email,''), COALESCE(region,''),
		       is_verified, rating, review_count, deal_count, subscription, created_at::text
		FROM companies WHERE id=$1`, id,
	).Scan(&c.ID, &c.UserID, &c.Name, &c.INN, &c.KPP, &c.OGRN,
		&c.LegalAddress, &c.ActualAddress, &c.Director, &c.Description,
		&c.LogoURL, &c.Website, &c.Phone, &c.Email, &c.Region,
		&c.IsVerified, &c.Rating, &c.ReviewCount, &c.DealCount, &c.Subscription, &c.CreatedAt)
	if err != nil {
		writeError(w, http.StatusNotFound, "company not found")
		return
	}
	writeJSON(w, http.StatusOK, c)
}

func (h *CompanyHandler) ListSuppliers(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	search := "%" + q.Get("search") + "%"
	region := q.Get("region")

	var query string
	var args []any

	if region != "" {
		query = `SELECT companies.id, companies.user_id, companies.name, COALESCE(inn,''), COALESCE(kpp,''), COALESCE(ogrn,''),
		         COALESCE(legal_address,''), COALESCE(actual_address,''), COALESCE(director,''),
		         COALESCE(description,''), COALESCE(logo_url,''), COALESCE(website,''),
		         COALESCE(phone,''), COALESCE(email,''), COALESCE(companies.region,''),
		         is_verified, rating, review_count, deal_count, subscription, companies.created_at::text
		         FROM companies
		         JOIN users ON users.id = companies.user_id
		         WHERE users.role='supplier' AND (companies.name ILIKE $1) AND companies.region=$2
		         ORDER BY rating DESC LIMIT 50`
		args = []any{search, region}
	} else {
		query = `SELECT companies.id, companies.user_id, companies.name, COALESCE(inn,''), COALESCE(kpp,''), COALESCE(ogrn,''),
		         COALESCE(legal_address,''), COALESCE(actual_address,''), COALESCE(director,''),
		         COALESCE(description,''), COALESCE(logo_url,''), COALESCE(website,''),
		         COALESCE(phone,''), COALESCE(email,''), COALESCE(companies.region,''),
		         is_verified, rating, review_count, deal_count, subscription, companies.created_at::text
		         FROM companies
		         JOIN users ON users.id = companies.user_id
		         WHERE users.role='supplier' AND (companies.name ILIKE $1)
		         ORDER BY rating DESC LIMIT 50`
		args = []any{search}
	}

	rows, err := h.DB.Query(r.Context(), query, args...)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "query failed")
		return
	}
	defer rows.Close()

	var list []companyDTO
	for rows.Next() {
		var c companyDTO
		if err := rows.Scan(&c.ID, &c.UserID, &c.Name, &c.INN, &c.KPP, &c.OGRN,
			&c.LegalAddress, &c.ActualAddress, &c.Director, &c.Description,
			&c.LogoURL, &c.Website, &c.Phone, &c.Email, &c.Region,
			&c.IsVerified, &c.Rating, &c.ReviewCount, &c.DealCount, &c.Subscription, &c.CreatedAt); err == nil {
			list = append(list, c)
		}
	}
	if list == nil {
		list = []companyDTO{}
	}
	writeJSON(w, http.StatusOK, list)
}
