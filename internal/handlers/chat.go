package handlers

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"alina-trade/back/internal/middleware"
)

type ChatHandler struct {
	DB *pgxpool.Pool
}

type messageDTO struct {
	ID        string `json:"id"`
	OrderID   string `json:"order_id"`
	SenderID  string `json:"sender_id"`
	SenderEmail string `json:"sender_email"`
	Content   string `json:"content"`
	FileURL   string `json:"file_url"`
	FileName  string `json:"file_name"`
	IsRead    bool   `json:"is_read"`
	CreatedAt string `json:"created_at"`
}

func (h *ChatHandler) GetMessages(w http.ResponseWriter, r *http.Request) {
	orderID := chi.URLParam(r, "orderID")
	userID := middleware.GetUserID(r)

	// Mark messages as read
	h.DB.Exec(r.Context(), `UPDATE messages SET is_read=true WHERE order_id=$1 AND sender_id!=$2`, orderID, userID)

	rows, err := h.DB.Query(r.Context(), `
		SELECT m.id, m.order_id, m.sender_id, COALESCE(u.email,''),
		       COALESCE(m.content,''), COALESCE(m.file_url,''), COALESCE(m.file_name,''),
		       m.is_read, m.created_at::text
		FROM messages m
		JOIN users u ON u.id=m.sender_id
		WHERE m.order_id=$1
		ORDER BY m.created_at ASC`, orderID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "query failed")
		return
	}
	defer rows.Close()

	var list []messageDTO
	for rows.Next() {
		var m messageDTO
		if err := rows.Scan(&m.ID, &m.OrderID, &m.SenderID, &m.SenderEmail,
			&m.Content, &m.FileURL, &m.FileName, &m.IsRead, &m.CreatedAt); err == nil {
			list = append(list, m)
		}
	}
	if list == nil {
		list = []messageDTO{}
	}
	writeJSON(w, http.StatusOK, list)
}

func (h *ChatHandler) SendMessage(w http.ResponseWriter, r *http.Request) {
	orderID := chi.URLParam(r, "orderID")
	userID := middleware.GetUserID(r)

	var req struct {
		Content  string `json:"content"`
		FileURL  string `json:"file_url"`
		FileName string `json:"file_name"`
	}
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid body")
		return
	}
	if req.Content == "" && req.FileURL == "" {
		writeError(w, http.StatusBadRequest, "content or file required")
		return
	}

	var id string
	err := h.DB.QueryRow(r.Context(), `
		INSERT INTO messages (order_id, sender_id, content, file_url, file_name)
		VALUES ($1,$2,$3,$4,$5) RETURNING id`,
		orderID, userID, req.Content, req.FileURL, req.FileName,
	).Scan(&id)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to send message: "+err.Error())
		return
	}

	// Notify the other party
	h.DB.Exec(r.Context(), `
		INSERT INTO notifications (user_id, type, title, body, entity_type, entity_id)
		SELECT u.id, 'message', 'Новое сообщение', $1, 'order', $2
		FROM orders o
		JOIN companies bc ON bc.id=o.buyer_id JOIN users u ON u.id=bc.user_id
		WHERE o.id=$2 AND u.id!=$3
		UNION ALL
		SELECT u.id, 'message', 'Новое сообщение', $1, 'order', $2
		FROM orders o
		JOIN companies sc ON sc.id=o.supplier_id JOIN users u ON u.id=sc.user_id
		WHERE o.id=$2 AND u.id!=$3`,
		req.Content, orderID, userID)

	writeJSON(w, http.StatusCreated, map[string]string{"id": id})
}
