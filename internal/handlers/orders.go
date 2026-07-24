package handlers

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"alina-trade/back/internal/middleware"
)

type OrderHandler struct {
	DB *pgxpool.Pool
}

type orderDTO struct {
	ID              string  `json:"id"`
	RFQID           string  `json:"rfq_id"`
	ProposalID      string  `json:"proposal_id"`
	BuyerID         string  `json:"buyer_id"`
	BuyerName       string  `json:"buyer_name"`
	SupplierID      string  `json:"supplier_id"`
	SupplierName    string  `json:"supplier_name"`
	TotalAmount     float64 `json:"total_amount"`
	Currency        string  `json:"currency"`
	Status          string  `json:"status"`
	DeliveryAddress string  `json:"delivery_address"`
	Notes           string  `json:"notes"`
	CreatedAt       string  `json:"created_at"`
	UpdatedAt       string  `json:"updated_at"`
}

var validStatuses = map[string]bool{
	"draft": true, "confirmed": true, "paid": true,
	"in_production": true, "shipped": true, "delivered": true,
	"completed": true, "cancelled": true,
}

func (h *OrderHandler) ListOrders(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r)
	role := middleware.GetUserRole(r)

	var companyID string
	if err := h.DB.QueryRow(r.Context(), `SELECT id FROM companies WHERE user_id=$1`, userID).Scan(&companyID); err != nil {
		writeJSON(w, http.StatusOK, []orderDTO{})
		return
	}

	var query string
	if role == "buyer" {
		query = `SELECT o.id, COALESCE(o.rfq_id::text,''), COALESCE(o.proposal_id::text,''),
		         o.buyer_id, COALESCE(bc.name,''), o.supplier_id, COALESCE(sc.name,''),
		         o.total_amount, o.currency, o.status,
		         COALESCE(o.delivery_address,''), COALESCE(o.notes,''), o.created_at::text, o.updated_at::text
		         FROM orders o
		         JOIN companies bc ON bc.id=o.buyer_id
		         JOIN companies sc ON sc.id=o.supplier_id
		         WHERE o.buyer_id=$1 ORDER BY o.created_at DESC`
	} else {
		query = `SELECT o.id, COALESCE(o.rfq_id::text,''), COALESCE(o.proposal_id::text,''),
		         o.buyer_id, COALESCE(bc.name,''), o.supplier_id, COALESCE(sc.name,''),
		         o.total_amount, o.currency, o.status,
		         COALESCE(o.delivery_address,''), COALESCE(o.notes,''), o.created_at::text, o.updated_at::text
		         FROM orders o
		         JOIN companies bc ON bc.id=o.buyer_id
		         JOIN companies sc ON sc.id=o.supplier_id
		         WHERE o.supplier_id=$1 ORDER BY o.created_at DESC`
	}

	rows, err := h.DB.Query(r.Context(), query, companyID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "query failed")
		return
	}
	defer rows.Close()

	writeJSON(w, http.StatusOK, scanOrders(rows))
}

func (h *OrderHandler) GetOrder(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	rows, err := h.DB.Query(r.Context(), `
		SELECT o.id, COALESCE(o.rfq_id::text,''), COALESCE(o.proposal_id::text,''),
		       o.buyer_id, COALESCE(bc.name,''), o.supplier_id, COALESCE(sc.name,''),
		       o.total_amount, o.currency, o.status,
		       COALESCE(o.delivery_address,''), COALESCE(o.notes,''), o.created_at::text, o.updated_at::text
		FROM orders o
		JOIN companies bc ON bc.id=o.buyer_id
		JOIN companies sc ON sc.id=o.supplier_id
		WHERE o.id=$1`, id)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "query failed")
		return
	}
	defer rows.Close()
	list := scanOrders(rows)
	if len(list) == 0 {
		writeError(w, http.StatusNotFound, "order not found")
		return
	}

	// Get status history
	histRows, err := h.DB.Query(r.Context(), `
		SELECT status, COALESCE(comment,''), changed_by, created_at::text
		FROM order_status_history WHERE order_id=$1 ORDER BY created_at`, id)
	if err == nil {
		defer histRows.Close()
		type histItem struct {
			Status    string `json:"status"`
			Comment   string `json:"comment"`
			ChangedBy string `json:"changed_by"`
			CreatedAt string `json:"created_at"`
		}
		var history []histItem
		for histRows.Next() {
			var h histItem
			if err := histRows.Scan(&h.Status, &h.Comment, &h.ChangedBy, &h.CreatedAt); err == nil {
				history = append(history, h)
			}
		}
		if history == nil {
			history = []histItem{}
		}
		writeJSON(w, http.StatusOK, map[string]any{
			"order":   list[0],
			"history": history,
		})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"order": list[0], "history": []any{}})
}

func (h *OrderHandler) UpdateOrderStatus(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	userID := middleware.GetUserID(r)
	var req struct {
		Status  string `json:"status"`
		Comment string `json:"comment"`
	}
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid body")
		return
	}
	if !validStatuses[req.Status] {
		writeError(w, http.StatusBadRequest, "invalid status")
		return
	}
	h.DB.Exec(r.Context(), `UPDATE orders SET status=$1, updated_at=NOW() WHERE id=$2`, req.Status, id)
	h.DB.Exec(r.Context(), `
		INSERT INTO order_status_history (order_id, status, comment, changed_by) VALUES ($1,$2,$3,$4)`,
		id, req.Status, req.Comment, userID)

	// Notify both parties
	h.DB.Exec(r.Context(), `
		INSERT INTO notifications (user_id, type, title, body, entity_type, entity_id)
		SELECT u.id, 'order_status', 'Статус заказа изменён', $1, 'order', $2
		FROM orders o
		JOIN companies bc ON bc.id=o.buyer_id JOIN users u ON u.id=bc.user_id
		WHERE o.id=$2
		UNION ALL
		SELECT u.id, 'order_status', 'Статус заказа изменён', $1, 'order', $2
		FROM orders o
		JOIN companies sc ON sc.id=o.supplier_id JOIN users u ON u.id=sc.user_id
		WHERE o.id=$2`,
		req.Status, id)

	writeJSON(w, http.StatusOK, map[string]string{"status": "updated"})
}

func scanOrders(rows pgRows) []orderDTO {
	var list []orderDTO
	for rows.Next() {
		var o orderDTO
		if err := rows.Scan(&o.ID, &o.RFQID, &o.ProposalID, &o.BuyerID, &o.BuyerName,
			&o.SupplierID, &o.SupplierName, &o.TotalAmount, &o.Currency, &o.Status,
			&o.DeliveryAddress, &o.Notes, &o.CreatedAt, &o.UpdatedAt); err == nil {
			list = append(list, o)
		}
	}
	if list == nil {
		list = []orderDTO{}
	}
	return list
}
