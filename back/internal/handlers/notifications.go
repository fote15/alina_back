package handlers

import (
	"net/http"

	"github.com/jackc/pgx/v5/pgxpool"

	"alina-trade/back/internal/middleware"
)

type NotificationHandler struct {
	DB *pgxpool.Pool
}

type notificationDTO struct {
	ID         string `json:"id"`
	Type       string `json:"type"`
	Title      string `json:"title"`
	Body       string `json:"body"`
	EntityType string `json:"entity_type"`
	EntityID   string `json:"entity_id"`
	IsRead     bool   `json:"is_read"`
	CreatedAt  string `json:"created_at"`
}

func (h *NotificationHandler) ListNotifications(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r)
	rows, err := h.DB.Query(r.Context(), `
		SELECT id, type, title, COALESCE(body,''), COALESCE(entity_type,''),
		       COALESCE(entity_id::text,''), is_read, created_at::text
		FROM notifications WHERE user_id=$1
		ORDER BY created_at DESC LIMIT 50`, userID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "query failed")
		return
	}
	defer rows.Close()

	var list []notificationDTO
	for rows.Next() {
		var n notificationDTO
		if err := rows.Scan(&n.ID, &n.Type, &n.Title, &n.Body,
			&n.EntityType, &n.EntityID, &n.IsRead, &n.CreatedAt); err == nil {
			list = append(list, n)
		}
	}
	if list == nil {
		list = []notificationDTO{}
	}
	writeJSON(w, http.StatusOK, list)
}

func (h *NotificationHandler) MarkRead(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r)
	h.DB.Exec(r.Context(), `UPDATE notifications SET is_read=true WHERE user_id=$1`, userID)
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (h *NotificationHandler) UnreadCount(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r)
	var count int
	h.DB.QueryRow(r.Context(), `SELECT COUNT(*) FROM notifications WHERE user_id=$1 AND is_read=false`, userID).Scan(&count)
	writeJSON(w, http.StatusOK, map[string]int{"count": count})
}
