package handlers

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"alina-trade/back/internal/middleware"
)

type ProductHandler struct {
	DB *pgxpool.Pool
}

type productDTO struct {
	ID           string   `json:"id"`
	CompanyID    string   `json:"company_id"`
	CategoryID   string   `json:"category_id"`
	SKU          string   `json:"sku"`
	Name         string   `json:"name"`
	Description  string   `json:"description"`
	Price        *float64 `json:"price"`
	Currency     string   `json:"currency"`
	Unit         string   `json:"unit"`
	MinOrderQty  *int     `json:"min_order_qty"`
	InStock      bool     `json:"in_stock"`
	Images       []string `json:"images"`
	Manufacturer string   `json:"manufacturer"`
	Region       string   `json:"region"`
	IsActive     bool     `json:"is_active"`
	CreatedAt    string   `json:"created_at"`
}

func (h *ProductHandler) ListProducts(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	search := "%" + q.Get("search") + "%"
	companyID := q.Get("company_id")

	var rows interface{ Close() }
	var err error

	if companyID != "" {
		pgrows, e := h.DB.Query(r.Context(), `
			SELECT id, company_id, COALESCE(category_id::text,''), COALESCE(sku,''), name,
			       COALESCE(description,''), price, currency, COALESCE(unit,''),
			       min_order_qty, in_stock, COALESCE(images, '{}'), COALESCE(manufacturer,''),
			       COALESCE(region,''), is_active, created_at::text
			FROM products WHERE company_id=$1 AND is_active=true AND name ILIKE $2
			ORDER BY created_at DESC LIMIT 100`, companyID, search)
		rows, err = pgrows, e
		if err != nil {
			writeError(w, http.StatusInternalServerError, "query failed")
			return
		}
		defer pgrows.Close()
		list := scanProducts(pgrows)
		writeJSON(w, http.StatusOK, list)
		return
	}

	pgrows, e := h.DB.Query(r.Context(), `
		SELECT id, company_id, COALESCE(category_id::text,''), COALESCE(sku,''), name,
		       COALESCE(description,''), price, currency, COALESCE(unit,''),
		       min_order_qty, in_stock, COALESCE(images, '{}'), COALESCE(manufacturer,''),
		       COALESCE(region,''), is_active, created_at::text
		FROM products WHERE is_active=true AND name ILIKE $1
		ORDER BY created_at DESC LIMIT 100`, search)
	rows = pgrows
	err = e
	_ = rows
	if err != nil {
		writeError(w, http.StatusInternalServerError, "query failed")
		return
	}
	defer pgrows.Close()
	list := scanProducts(pgrows)
	writeJSON(w, http.StatusOK, list)
}

func (h *ProductHandler) GetProduct(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	rows, err := h.DB.Query(r.Context(), `
		SELECT id, company_id, COALESCE(category_id::text,''), COALESCE(sku,''), name,
		       COALESCE(description,''), price, currency, COALESCE(unit,''),
		       min_order_qty, in_stock, COALESCE(images, '{}'), COALESCE(manufacturer,''),
		       COALESCE(region,''), is_active, created_at::text
		FROM products WHERE id=$1`, id)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "query failed")
		return
	}
	defer rows.Close()
	list := scanProducts(rows)
	if len(list) == 0 {
		writeError(w, http.StatusNotFound, "product not found")
		return
	}
	writeJSON(w, http.StatusOK, list[0])
}

func (h *ProductHandler) CreateProduct(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r)
	var req struct {
		CategoryID   string   `json:"category_id"`
		SKU          string   `json:"sku"`
		Name         string   `json:"name"`
		Description  string   `json:"description"`
		Price        *float64 `json:"price"`
		Currency     string   `json:"currency"`
		Unit         string   `json:"unit"`
		MinOrderQty  *int     `json:"min_order_qty"`
		InStock      bool     `json:"in_stock"`
		Images       []string `json:"images"`
		Manufacturer string   `json:"manufacturer"`
		Region       string   `json:"region"`
	}
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid body")
		return
	}
	if req.Name == "" {
		writeError(w, http.StatusBadRequest, "name required")
		return
	}
	if req.Currency == "" {
		req.Currency = "RUB"
	}

	// get company id
	var companyID string
	if err := h.DB.QueryRow(r.Context(), `SELECT id FROM companies WHERE user_id=$1`, userID).Scan(&companyID); err != nil {
		writeError(w, http.StatusBadRequest, "create a company profile first")
		return
	}

	var catID *string
	if req.CategoryID != "" {
		catID = &req.CategoryID
	}
	if req.Images == nil {
		req.Images = []string{}
	}

	var productID string
	err := h.DB.QueryRow(r.Context(), `
		INSERT INTO products (company_id, category_id, sku, name, description, price, currency, unit, min_order_qty, in_stock, images, manufacturer, region)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING id`,
		companyID, catID, req.SKU, req.Name, req.Description, req.Price, req.Currency,
		req.Unit, req.MinOrderQty, req.InStock, req.Images, req.Manufacturer, req.Region,
	).Scan(&productID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to create product: "+err.Error())
		return
	}
	writeJSON(w, http.StatusCreated, map[string]string{"id": productID})
}

func (h *ProductHandler) UpdateProduct(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	userID := middleware.GetUserID(r)
	var companyID string
	if err := h.DB.QueryRow(r.Context(), `SELECT id FROM companies WHERE user_id=$1`, userID).Scan(&companyID); err != nil {
		writeError(w, http.StatusForbidden, "no company")
		return
	}
	var req struct {
		Name        string   `json:"name"`
		Description string   `json:"description"`
		Price       *float64 `json:"price"`
		InStock     bool     `json:"in_stock"`
		IsActive    bool     `json:"is_active"`
	}
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid body")
		return
	}
	_, err := h.DB.Exec(r.Context(), `
		UPDATE products SET name=$1, description=$2, price=$3, in_stock=$4, is_active=$5, updated_at=NOW()
		WHERE id=$6 AND company_id=$7`,
		req.Name, req.Description, req.Price, req.InStock, req.IsActive, id, companyID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "update failed")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "updated"})
}

func (h *ProductHandler) DeleteProduct(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	userID := middleware.GetUserID(r)
	var companyID string
	if err := h.DB.QueryRow(r.Context(), `SELECT id FROM companies WHERE user_id=$1`, userID).Scan(&companyID); err != nil {
		writeError(w, http.StatusForbidden, "no company")
		return
	}
	h.DB.Exec(r.Context(), `DELETE FROM products WHERE id=$1 AND company_id=$2`, id, companyID)
	writeJSON(w, http.StatusOK, map[string]string{"status": "deleted"})
}

func (h *ProductHandler) ListCategories(w http.ResponseWriter, r *http.Request) {
	rows, err := h.DB.Query(r.Context(), `SELECT id, COALESCE(parent_id::text,''), name, slug, COALESCE(icon,'') FROM categories ORDER BY name`)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "query failed")
		return
	}
	defer rows.Close()
	type cat struct {
		ID       string `json:"id"`
		ParentID string `json:"parent_id"`
		Name     string `json:"name"`
		Slug     string `json:"slug"`
		Icon     string `json:"icon"`
	}
	var list []cat
	for rows.Next() {
		var c cat
		if err := rows.Scan(&c.ID, &c.ParentID, &c.Name, &c.Slug, &c.Icon); err == nil {
			list = append(list, c)
		}
	}
	if list == nil {
		list = []cat{}
	}
	writeJSON(w, http.StatusOK, list)
}

type pgRows interface {
	Next() bool
	Scan(...any) error
}

func scanProducts(rows pgRows) []productDTO {
	var list []productDTO
	for rows.Next() {
		var p productDTO
		var images []string
		if err := rows.Scan(&p.ID, &p.CompanyID, &p.CategoryID, &p.SKU, &p.Name,
			&p.Description, &p.Price, &p.Currency, &p.Unit,
			&p.MinOrderQty, &p.InStock, &images, &p.Manufacturer,
			&p.Region, &p.IsActive, &p.CreatedAt); err == nil {
			p.Images = images
			list = append(list, p)
		}
	}
	if list == nil {
		list = []productDTO{}
	}
	return list
}
