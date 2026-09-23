package handlers

import (
	"bytes"
	"encoding/csv"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"strings"

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

func (h *ProductHandler) ImportProducts(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r)
	var companyID string
	if err := h.DB.QueryRow(r.Context(), `SELECT id FROM companies WHERE user_id=$1`, userID).Scan(&companyID); err != nil {
		writeError(w, http.StatusForbidden, "create company profile first")
		return
	}

	var req struct {
		CSVData  string `json:"csv_data"`
		Products []struct {
			Name         string   `json:"name"`
			SKU          string   `json:"sku"`
			Description  string   `json:"description"`
			Price        *float64 `json:"price"`
			Currency     string   `json:"currency"`
			Unit         string   `json:"unit"`
			MinOrderQty  *int     `json:"min_order_qty"`
			Manufacturer string   `json:"manufacturer"`
			Region       string   `json:"region"`
		} `json:"products"`
	}

	if err := decodeJSON(r, &req); err == nil && len(req.Products) > 0 {
		inserted := 0
		for _, p := range req.Products {
			if p.Name == "" {
				continue
			}
			curr := p.Currency
			if curr == "" {
				curr = "RUB"
			}
			unit := p.Unit
			if unit == "" {
				unit = "шт"
			}
			_, err := h.DB.Exec(r.Context(), `
				INSERT INTO products (company_id, sku, name, description, price, currency, unit, min_order_qty, in_stock, images, manufacturer, region)
				VALUES ($1,$2,$3,$4,$5,$6,$7,$8,true,'{}',$9,$10)`,
				companyID, p.SKU, p.Name, p.Description, p.Price, curr, unit, p.MinOrderQty, p.Manufacturer, p.Region)
			if err == nil {
				inserted++
			}
		}
		writeJSON(w, http.StatusOK, map[string]any{"status": "imported", "count": inserted})
		return
	}

	// Fallback to CSV format parsing if provided as raw text
	r.ParseMultipartForm(10 << 20)
	var reader *csv.Reader

	file, _, err := r.FormFile("file")
	if err == nil {
		defer file.Close()
		buf, _ := io.ReadAll(file)
		reader = csv.NewReader(bytes.NewReader(buf))
	} else if req.CSVData != "" {
		reader = csv.NewReader(strings.NewReader(req.CSVData))
	} else {
		writeError(w, http.StatusBadRequest, "no products or file provided")
		return
	}

	reader.LazyQuotes = true
	records, err := reader.ReadAll()
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid CSV content: "+err.Error())
		return
	}

	count := 0
	for i, record := range records {
		if i == 0 && (strings.Contains(strings.ToLower(record[0]), "name") || strings.Contains(strings.ToLower(record[0]), "название")) {
			continue
		}
		if len(record) < 1 || strings.TrimSpace(record[0]) == "" {
			continue
		}
		name := record[0]
		sku := ""
		if len(record) > 1 {
			sku = record[1]
		}
		desc := ""
		if len(record) > 2 {
			desc = record[2]
		}
		var price *float64
		if len(record) > 3 {
			if p, err := strconv.ParseFloat(strings.ReplaceAll(record[3], ",", "."), 64); err == nil {
				price = &p
			}
		}
		unit := "шт"
		if len(record) > 4 && record[4] != "" {
			unit = record[4]
		}

		_, err := h.DB.Exec(r.Context(), `
			INSERT INTO products (company_id, sku, name, description, price, currency, unit, in_stock, images)
			VALUES ($1,$2,$3,$4,$5,'RUB',$6,true,'{}')`,
			companyID, sku, name, desc, price, unit)
		if err == nil {
			count++
		}
	}

	writeJSON(w, http.StatusOK, map[string]any{"status": "imported", "count": count})
}

func (h *ProductHandler) ExportProducts(w http.ResponseWriter, r *http.Request) {
	companyID := r.URL.Query().Get("company_id")
	if companyID == "" {
		userID := middleware.GetUserID(r)
		h.DB.QueryRow(r.Context(), `SELECT id FROM companies WHERE user_id=$1`, userID).Scan(&companyID)
	}

	rows, err := h.DB.Query(r.Context(), `
		SELECT COALESCE(sku,''), name, COALESCE(description,''), COALESCE(price, 0), COALESCE(unit,'шт'), COALESCE(manufacturer,'')
		FROM products WHERE company_id=$1 AND is_active=true ORDER BY name`, companyID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "query failed")
		return
	}
	defer rows.Close()

	w.Header().Set("Content-Type", "text/csv; charset=utf-8")
	w.Header().Set("Content-Disposition", `attachment; filename="products_catalog.csv"`)

	// UTF-8 BOM for Excel compatibility
	w.Write([]byte{0xEF, 0xBB, 0xBF})
	writer := csv.NewWriter(w)
	writer.Write([]string{"Название", "SKU", "Описание", "Цена (руб)", "Единица", "Производитель"})

	for rows.Next() {
		var sku, name, desc, unit, mfr string
		var price float64
		if err := rows.Scan(&sku, &name, &desc, &price, &unit, &mfr); err == nil {
			writer.Write([]string{name, sku, desc, fmt.Sprintf("%.2f", price), unit, mfr})
		}
	}
	writer.Flush()
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
