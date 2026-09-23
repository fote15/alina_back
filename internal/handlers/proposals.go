package handlers

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"alina-trade/back/internal/middleware"
)

type ProposalHandler struct {
	DB *pgxpool.Pool
}

type proposalDTO struct {
	ID             string   `json:"id"`
	RFQID          string   `json:"rfq_id"`
	RFQTitle       string   `json:"rfq_title"`
	SupplierID     string   `json:"supplier_id"`
	SupplierName   string   `json:"supplier_name"`
	SupplierRating float64  `json:"supplier_rating"`
	SupplierDeals  int      `json:"supplier_deals"`
	Price          float64  `json:"price"`
	Currency       string   `json:"currency"`
	ProductionDays *int     `json:"production_days"`
	DeliveryDays   *int     `json:"delivery_days"`
	DeliveryCost   *float64 `json:"delivery_cost"`
	PaymentTerms   string   `json:"payment_terms"`
	Comment        string   `json:"comment"`
	Attachments    []string `json:"attachments"`
	Status         string   `json:"status"`
	CreatedAt      string   `json:"created_at"`
}

func (h *ProposalHandler) ListProposals(w http.ResponseWriter, r *http.Request) {
	rfqID := r.URL.Query().Get("rfq_id")
	supplierView := r.URL.Query().Get("my") == "true"
	userID := middleware.GetUserID(r)

	var rows interface {
		Next() bool
		Scan(...any) error
		Close()
	}
	var err error

	if supplierView {
		var companyID string
		if err := h.DB.QueryRow(r.Context(), `SELECT id FROM companies WHERE user_id=$1`, userID).Scan(&companyID); err != nil {
			writeJSON(w, http.StatusOK, []proposalDTO{})
			return
		}
		pgrows, e := h.DB.Query(r.Context(), `
			SELECT pr.id, pr.rfq_id, COALESCE(r.title,''), pr.supplier_id,
			       COALESCE(c.name,''), c.rating, c.deal_count,
			       pr.price, pr.currency,
			       pr.production_days, pr.delivery_days, pr.delivery_cost,
			       COALESCE(pr.payment_terms,''), COALESCE(pr.comment,''),
			       COALESCE(pr.attachments,'{}'), pr.status, pr.created_at::text
			FROM proposals pr
			JOIN rfqs r ON r.id=pr.rfq_id
			JOIN companies c ON c.id=pr.supplier_id
			WHERE pr.supplier_id=$1 ORDER BY pr.created_at DESC`, companyID)
		rows, err = pgrows, e
		if err != nil {
			writeError(w, http.StatusInternalServerError, "query failed")
			return
		}
		defer pgrows.Close()
	} else if rfqID != "" {
		pgrows, e := h.DB.Query(r.Context(), `
			SELECT pr.id, pr.rfq_id, COALESCE(r.title,''), pr.supplier_id,
			       COALESCE(c.name,''), c.rating, c.deal_count,
			       pr.price, pr.currency,
			       pr.production_days, pr.delivery_days, pr.delivery_cost,
			       COALESCE(pr.payment_terms,''), COALESCE(pr.comment,''),
			       COALESCE(pr.attachments,'{}'), pr.status, pr.created_at::text
			FROM proposals pr
			JOIN rfqs r ON r.id=pr.rfq_id
			JOIN companies c ON c.id=pr.supplier_id
			WHERE pr.rfq_id=$1 ORDER BY pr.price ASC`, rfqID)
		rows, err = pgrows, e
		if err != nil {
			writeError(w, http.StatusInternalServerError, "query failed")
			return
		}
		defer pgrows.Close()
	} else {
		writeJSON(w, http.StatusOK, []proposalDTO{})
		return
	}

	writeJSON(w, http.StatusOK, scanProposals(rows))
}

func (h *ProposalHandler) CreateProposal(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r)
	var companyID string
	if err := h.DB.QueryRow(r.Context(), `SELECT id FROM companies WHERE user_id=$1`, userID).Scan(&companyID); err != nil {
		writeError(w, http.StatusBadRequest, "create company profile first")
		return
	}

	var req struct {
		RFQID          string   `json:"rfq_id"`
		Price          float64  `json:"price"`
		Currency       string   `json:"currency"`
		ProductionDays *int     `json:"production_days"`
		DeliveryDays   *int     `json:"delivery_days"`
		DeliveryCost   *float64 `json:"delivery_cost"`
		PaymentTerms   string   `json:"payment_terms"`
		Comment        string   `json:"comment"`
		Attachments    []string `json:"attachments"`
	}
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid body")
		return
	}
	if req.RFQID == "" || req.Price <= 0 {
		writeError(w, http.StatusBadRequest, "rfq_id and price required")
		return
	}
	if req.Currency == "" {
		req.Currency = "RUB"
	}
	if req.Attachments == nil {
		req.Attachments = []string{}
	}

	var id string
	err := h.DB.QueryRow(r.Context(), `
		INSERT INTO proposals (rfq_id, supplier_id, price, currency, production_days, delivery_days,
		                       delivery_cost, payment_terms, comment, attachments)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`,
		req.RFQID, companyID, req.Price, req.Currency, req.ProductionDays, req.DeliveryDays,
		req.DeliveryCost, req.PaymentTerms, req.Comment, req.Attachments,
	).Scan(&id)
	if err != nil {
		writeError(w, http.StatusConflict, "proposal already exists or invalid data")
		return
	}

	// Create notification for buyer
	h.DB.Exec(r.Context(), `
		INSERT INTO notifications (user_id, type, title, body, entity_type, entity_id)
		SELECT u.id, 'new_proposal', 'Новое предложение', 'Поставщик отправил предложение на вашу закупку', 'rfq', $1
		FROM rfqs r JOIN companies c ON c.id=r.buyer_id JOIN users u ON u.id=c.user_id WHERE r.id=$2`,
		req.RFQID, req.RFQID)

	writeJSON(w, http.StatusCreated, map[string]string{"id": id})
}

func (h *ProposalHandler) AcceptProposal(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	userID := middleware.GetUserID(r)
	var companyID string
	if err := h.DB.QueryRow(r.Context(), `SELECT id FROM companies WHERE user_id=$1`, userID).Scan(&companyID); err != nil {
		writeError(w, http.StatusForbidden, "no company")
		return
	}

	// Get proposal details
	var rfqID, supplierID string
	var price float64
	var currency string
	err := h.DB.QueryRow(r.Context(), `
		SELECT p.rfq_id, p.supplier_id, p.price, p.currency
		FROM proposals p JOIN rfqs r ON r.id=p.rfq_id
		WHERE p.id=$1 AND r.buyer_id=$2`, id, companyID,
	).Scan(&rfqID, &supplierID, &price, &currency)
	if err != nil {
		writeError(w, http.StatusNotFound, "proposal not found or access denied")
		return
	}

	// Accept this proposal, reject others
	h.DB.Exec(r.Context(), `UPDATE proposals SET status='rejected', updated_at=NOW() WHERE rfq_id=$1 AND id!=$2`, rfqID, id)
	h.DB.Exec(r.Context(), `UPDATE proposals SET status='accepted', updated_at=NOW() WHERE id=$1`, id)
	h.DB.Exec(r.Context(), `UPDATE rfqs SET status='closed', updated_at=NOW() WHERE id=$1`, rfqID)

	// Create order
	var orderID string
	h.DB.QueryRow(r.Context(), `
		INSERT INTO orders (rfq_id, proposal_id, buyer_id, supplier_id, total_amount, currency)
		VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
		rfqID, id, companyID, supplierID, price, currency,
	).Scan(&orderID)

	// Status history
	h.DB.Exec(r.Context(), `
		INSERT INTO order_status_history (order_id, status, comment, changed_by) VALUES ($1,'draft','Order created',$2)`,
		orderID, userID)

	// Notify supplier
	h.DB.Exec(r.Context(), `
		INSERT INTO notifications (user_id, type, title, body, entity_type, entity_id)
		SELECT u.id, 'proposal_accepted', 'Предложение принято!', 'Покупатель выбрал ваше предложение', 'order', $1
		FROM companies c JOIN users u ON u.id=c.user_id WHERE c.id=$2`,
		orderID, supplierID)

	writeJSON(w, http.StatusOK, map[string]string{"order_id": orderID})
}

func (h *ProposalHandler) RejectProposal(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	h.DB.Exec(r.Context(), `UPDATE proposals SET status='rejected', updated_at=NOW() WHERE id=$1`, id)
	writeJSON(w, http.StatusOK, map[string]string{"status": "rejected"})
}

type proposalRows interface {
	Next() bool
	Scan(...any) error
}

func scanProposals(rows proposalRows) []proposalDTO {
	var list []proposalDTO
	for rows.Next() {
		var p proposalDTO
		var attachments []string
		if err := rows.Scan(&p.ID, &p.RFQID, &p.RFQTitle, &p.SupplierID, &p.SupplierName,
			&p.SupplierRating, &p.SupplierDeals, &p.Price, &p.Currency,
			&p.ProductionDays, &p.DeliveryDays, &p.DeliveryCost,
			&p.PaymentTerms, &p.Comment, &attachments, &p.Status, &p.CreatedAt); err == nil {
			p.Attachments = attachments
			list = append(list, p)
		}
	}
	if list == nil {
		list = []proposalDTO{}
	}
	return list
}
