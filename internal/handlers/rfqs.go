package handlers

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"alina-trade/back/internal/middleware"
)

type RFQHandler struct {
	DB *pgxpool.Pool
}

type rfqDTO struct {
	ID                string  `json:"id"`
	BuyerID           string  `json:"buyer_id"`
	BuyerName         string  `json:"buyer_name"`
	Title             string  `json:"title"`
	Description       string  `json:"description"`
	CategoryID        string  `json:"category_id"`
	CategoryName      string  `json:"category_name"`
	Quantity          *int    `json:"quantity"`
	Unit              string  `json:"unit"`
	BudgetFrom        *float64 `json:"budget_from"`
	BudgetTo          *float64 `json:"budget_to"`
	Currency          string  `json:"currency"`
	DeliveryAddress   string  `json:"delivery_address"`
	DeliveryDate      string  `json:"delivery_date"`
	PaymentTerms      string  `json:"payment_terms"`
	Status            string  `json:"status"`
	IsPublished       bool    `json:"is_published"`
	ProposalsDeadline string  `json:"proposals_deadline"`
	Attachments       []string `json:"attachments"`
	ProposalCount     int     `json:"proposal_count"`
	CreatedAt         string  `json:"created_at"`
}

func (h *RFQHandler) ListRFQs(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	search := "%" + q.Get("search") + "%"
	status := q.Get("status")
	myOnly := q.Get("my") == "true"
	userID := middleware.GetUserID(r)

	var (
		baseQ string
		args  []any
	)

	if myOnly {
		var companyID string
		if err := h.DB.QueryRow(r.Context(), `SELECT id FROM companies WHERE user_id=$1`, userID).Scan(&companyID); err != nil {
			writeJSON(w, http.StatusOK, []rfqDTO{})
			return
		}
		baseQ = `SELECT r.id, r.buyer_id, COALESCE(c.name,''), r.title, COALESCE(r.description,''),
		         COALESCE(r.category_id::text,''), COALESCE(cat.name,''),
		         r.quantity, COALESCE(r.unit,''), r.budget_from, r.budget_to, r.currency,
		         COALESCE(r.delivery_address,''), COALESCE(r.delivery_date::text,''),
		         COALESCE(r.payment_terms,''), r.status, r.is_published,
		         COALESCE(r.proposals_deadline::text,''), COALESCE(r.attachments,'{}'),
		         (SELECT COUNT(*) FROM proposals p WHERE p.rfq_id=r.id), r.created_at::text
		         FROM rfqs r
		         JOIN companies c ON c.id=r.buyer_id
		         LEFT JOIN categories cat ON cat.id=r.category_id
		         WHERE r.buyer_id=$1 AND r.title ILIKE $2
		         ORDER BY r.created_at DESC LIMIT 100`
		args = []any{companyID, search}
	} else if status != "" {
		baseQ = `SELECT r.id, r.buyer_id, COALESCE(c.name,''), r.title, COALESCE(r.description,''),
		         COALESCE(r.category_id::text,''), COALESCE(cat.name,''),
		         r.quantity, COALESCE(r.unit,''), r.budget_from, r.budget_to, r.currency,
		         COALESCE(r.delivery_address,''), COALESCE(r.delivery_date::text,''),
		         COALESCE(r.payment_terms,''), r.status, r.is_published,
		         COALESCE(r.proposals_deadline::text,''), COALESCE(r.attachments,'{}'),
		         (SELECT COUNT(*) FROM proposals p WHERE p.rfq_id=r.id), r.created_at::text
		         FROM rfqs r
		         JOIN companies c ON c.id=r.buyer_id
		         LEFT JOIN categories cat ON cat.id=r.category_id
		         WHERE r.is_published=true AND r.status=$1 AND r.title ILIKE $2
		         ORDER BY r.created_at DESC LIMIT 100`
		args = []any{status, search}
	} else {
		baseQ = `SELECT r.id, r.buyer_id, COALESCE(c.name,''), r.title, COALESCE(r.description,''),
		         COALESCE(r.category_id::text,''), COALESCE(cat.name,''),
		         r.quantity, COALESCE(r.unit,''), r.budget_from, r.budget_to, r.currency,
		         COALESCE(r.delivery_address,''), COALESCE(r.delivery_date::text,''),
		         COALESCE(r.payment_terms,''), r.status, r.is_published,
		         COALESCE(r.proposals_deadline::text,''), COALESCE(r.attachments,'{}'),
		         (SELECT COUNT(*) FROM proposals p WHERE p.rfq_id=r.id), r.created_at::text
		         FROM rfqs r
		         JOIN companies c ON c.id=r.buyer_id
		         LEFT JOIN categories cat ON cat.id=r.category_id
		         WHERE r.is_published=true AND r.title ILIKE $1
		         ORDER BY r.created_at DESC LIMIT 100`
		args = []any{search}
	}

	rows, err := h.DB.Query(r.Context(), baseQ, args...)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "query failed: "+err.Error())
		return
	}
	defer rows.Close()

	writeJSON(w, http.StatusOK, scanRFQs(rows))
}

func (h *RFQHandler) GetRFQ(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	rows, err := h.DB.Query(r.Context(), `
		SELECT r.id, r.buyer_id, COALESCE(c.name,''), r.title, COALESCE(r.description,''),
		       COALESCE(r.category_id::text,''), COALESCE(cat.name,''),
		       r.quantity, COALESCE(r.unit,''), r.budget_from, r.budget_to, r.currency,
		       COALESCE(r.delivery_address,''), COALESCE(r.delivery_date::text,''),
		       COALESCE(r.payment_terms,''), r.status, r.is_published,
		       COALESCE(r.proposals_deadline::text,''), COALESCE(r.attachments,'{}'),
		       (SELECT COUNT(*) FROM proposals p WHERE p.rfq_id=r.id), r.created_at::text
		FROM rfqs r
		JOIN companies c ON c.id=r.buyer_id
		LEFT JOIN categories cat ON cat.id=r.category_id
		WHERE r.id=$1`, id)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "query failed")
		return
	}
	defer rows.Close()
	list := scanRFQs(rows)
	if len(list) == 0 {
		writeError(w, http.StatusNotFound, "rfq not found")
		return
	}
	writeJSON(w, http.StatusOK, list[0])
}

func (h *RFQHandler) CreateRFQ(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r)
	var companyID string
	if err := h.DB.QueryRow(r.Context(), `SELECT id FROM companies WHERE user_id=$1`, userID).Scan(&companyID); err != nil {
		writeError(w, http.StatusBadRequest, "create company profile first")
		return
	}
	var req struct {
		Title             string   `json:"title"`
		Description       string   `json:"description"`
		CategoryID        string   `json:"category_id"`
		Quantity          *int     `json:"quantity"`
		Unit              string   `json:"unit"`
		BudgetFrom        *float64 `json:"budget_from"`
		BudgetTo          *float64 `json:"budget_to"`
		Currency          string   `json:"currency"`
		DeliveryAddress   string   `json:"delivery_address"`
		DeliveryDate      string   `json:"delivery_date"`
		PaymentTerms      string   `json:"payment_terms"`
		ProposalsDeadline string   `json:"proposals_deadline"`
	}
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid body")
		return
	}
	if req.Title == "" {
		writeError(w, http.StatusBadRequest, "title required")
		return
	}
	if req.Currency == "" {
		req.Currency = "RUB"
	}
	var catID *string
	if req.CategoryID != "" {
		catID = &req.CategoryID
	}
	var delivDate *string
	if req.DeliveryDate != "" {
		delivDate = &req.DeliveryDate
	}
	var deadline *string
	if req.ProposalsDeadline != "" {
		deadline = &req.ProposalsDeadline
	}

	var id string
	err := h.DB.QueryRow(r.Context(), `
		INSERT INTO rfqs (buyer_id, title, description, category_id, quantity, unit,
		                  budget_from, budget_to, currency, delivery_address, delivery_date,
		                  payment_terms, proposals_deadline)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING id`,
		companyID, req.Title, req.Description, catID, req.Quantity, req.Unit,
		req.BudgetFrom, req.BudgetTo, req.Currency, req.DeliveryAddress, delivDate,
		req.PaymentTerms, deadline,
	).Scan(&id)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to create RFQ: "+err.Error())
		return
	}

	// notify suppliers
	go h.notifySuppliers(id, req.Title)

	writeJSON(w, http.StatusCreated, map[string]string{"id": id})
}

func (h *RFQHandler) UpdateRFQStatus(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	userID := middleware.GetUserID(r)
	var companyID string
	if err := h.DB.QueryRow(r.Context(), `SELECT id FROM companies WHERE user_id=$1`, userID).Scan(&companyID); err != nil {
		writeError(w, http.StatusForbidden, "no company")
		return
	}
	var req struct {
		Status string `json:"status"`
	}
	decodeJSON(r, &req)
	h.DB.Exec(r.Context(), `UPDATE rfqs SET status=$1, updated_at=NOW() WHERE id=$2 AND buyer_id=$3`,
		req.Status, id, companyID)
	writeJSON(w, http.StatusOK, map[string]string{"status": "updated"})
}

func (h *RFQHandler) notifySuppliers(rfqID, title string) {
	// In a real app, this would query suppliers by category and notify them
	// Skipped for simplicity
}

func scanRFQs(rows pgRows) []rfqDTO {
	var list []rfqDTO
	for rows.Next() {
		var r rfqDTO
		var attachments []string
		var proposalCount int
		if err := rows.Scan(&r.ID, &r.BuyerID, &r.BuyerName, &r.Title, &r.Description,
			&r.CategoryID, &r.CategoryName, &r.Quantity, &r.Unit, &r.BudgetFrom, &r.BudgetTo,
			&r.Currency, &r.DeliveryAddress, &r.DeliveryDate, &r.PaymentTerms,
			&r.Status, &r.IsPublished, &r.ProposalsDeadline, &attachments, &proposalCount, &r.CreatedAt); err == nil {
			r.Attachments = attachments
			r.ProposalCount = proposalCount
			list = append(list, r)
		}
	}
	if list == nil {
		list = []rfqDTO{}
	}
	return list
}
