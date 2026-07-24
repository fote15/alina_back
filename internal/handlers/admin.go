package handlers

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type AdminHandler struct {
	DB *pgxpool.Pool
}

func (h *AdminHandler) ListUsers(w http.ResponseWriter, r *http.Request) {
	rows, err := h.DB.Query(r.Context(), `
		SELECT u.id, u.email, COALESCE(u.phone,''), u.role, u.created_at,
		       COALESCE(c.id::text,''), COALESCE(c.name,''), c.is_verified
		FROM users u
		LEFT JOIN companies c ON c.user_id=u.id
		ORDER BY u.created_at DESC LIMIT 200`)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "query failed")
		return
	}
	defer rows.Close()
	type userAdminDTO struct {
		ID          string `json:"id"`
		Email       string `json:"email"`
		Phone       string `json:"phone"`
		Role        string `json:"role"`
		CreatedAt   string `json:"created_at"`
		CompanyID   string `json:"company_id"`
		CompanyName string `json:"company_name"`
		IsVerified  bool   `json:"is_verified"`
	}
	var list []userAdminDTO
	for rows.Next() {
		var u userAdminDTO
		if err := rows.Scan(&u.ID, &u.Email, &u.Phone, &u.Role, &u.CreatedAt,
			&u.CompanyID, &u.CompanyName, &u.IsVerified); err == nil {
			list = append(list, u)
		}
	}
	if list == nil {
		list = []userAdminDTO{}
	}
	writeJSON(w, http.StatusOK, list)
}

func (h *AdminHandler) VerifyCompany(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	h.DB.Exec(r.Context(), `UPDATE companies SET is_verified=true WHERE id=$1`, id)
	writeJSON(w, http.StatusOK, map[string]string{"status": "verified"})
}

func (h *AdminHandler) BlockUser(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	// Simple approach: change role to 'blocked'
	h.DB.Exec(r.Context(), `UPDATE users SET role='blocked' WHERE id=$1`, id)
	writeJSON(w, http.StatusOK, map[string]string{"status": "blocked"})
}

func (h *AdminHandler) ListReviewsMod(w http.ResponseWriter, r *http.Request) {
	rows, err := h.DB.Query(r.Context(), `
		SELECT rv.id, rv.order_id, COALESCE(rc.name,''), COALESCE(re.name,''),
		       rv.quality_score, COALESCE(rv.comment,''), rv.is_moderated, rv.created_at
		FROM reviews rv
		JOIN companies rc ON rc.id=rv.reviewer_id
		JOIN companies re ON re.id=rv.reviewee_id
		ORDER BY rv.created_at DESC LIMIT 100`)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "query failed")
		return
	}
	defer rows.Close()
	type revAdmin struct {
		ID          string `json:"id"`
		OrderID     string `json:"order_id"`
		ReviewerName string `json:"reviewer_name"`
		RevieweeName string `json:"reviewee_name"`
		QualityScore int   `json:"quality_score"`
		Comment     string `json:"comment"`
		IsModerated bool   `json:"is_moderated"`
		CreatedAt   string `json:"created_at"`
	}
	var list []revAdmin
	for rows.Next() {
		var rv revAdmin
		if err := rows.Scan(&rv.ID, &rv.OrderID, &rv.ReviewerName, &rv.RevieweeName,
			&rv.QualityScore, &rv.Comment, &rv.IsModerated, &rv.CreatedAt); err == nil {
			list = append(list, rv)
		}
	}
	if list == nil {
		list = []revAdmin{}
	}
	writeJSON(w, http.StatusOK, list)
}

func (h *AdminHandler) ModerateReview(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	h.DB.Exec(r.Context(), `UPDATE reviews SET is_moderated=true WHERE id=$1`, id)
	writeJSON(w, http.StatusOK, map[string]string{"status": "moderated"})
}

func (h *AdminHandler) GetStats(w http.ResponseWriter, r *http.Request) {
	var totalUsers, totalCompanies, totalRFQs, totalOrders, completedOrders int64
	var totalVolume float64
	h.DB.QueryRow(r.Context(), `SELECT COUNT(*) FROM users`).Scan(&totalUsers)
	h.DB.QueryRow(r.Context(), `SELECT COUNT(*) FROM companies`).Scan(&totalCompanies)
	h.DB.QueryRow(r.Context(), `SELECT COUNT(*) FROM rfqs`).Scan(&totalRFQs)
	h.DB.QueryRow(r.Context(), `SELECT COUNT(*) FROM orders`).Scan(&totalOrders)
	h.DB.QueryRow(r.Context(), `SELECT COUNT(*) FROM orders WHERE status='completed'`).Scan(&completedOrders)
	h.DB.QueryRow(r.Context(), `SELECT COALESCE(SUM(total_amount),0) FROM orders WHERE status='completed'`).Scan(&totalVolume)
	writeJSON(w, http.StatusOK, map[string]any{
		"total_users":      totalUsers,
		"total_companies":  totalCompanies,
		"total_rfqs":       totalRFQs,
		"total_orders":     totalOrders,
		"completed_orders": completedOrders,
		"total_volume":     totalVolume,
	})
}

func (h *AdminHandler) ListCategories(w http.ResponseWriter, r *http.Request) {
	rows, err := h.DB.Query(r.Context(), `SELECT id, COALESCE(parent_id::text,''), name, slug FROM categories ORDER BY name`)
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
	}
	var list []cat
	for rows.Next() {
		var c cat
		rows.Scan(&c.ID, &c.ParentID, &c.Name, &c.Slug)
		list = append(list, c)
	}
	if list == nil {
		list = []cat{}
	}
	writeJSON(w, http.StatusOK, list)
}

func (h *AdminHandler) CreateCategory(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Name     string `json:"name"`
		Slug     string `json:"slug"`
		ParentID string `json:"parent_id"`
		Icon     string `json:"icon"`
	}
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid body")
		return
	}
	var parentID *string
	if req.ParentID != "" {
		parentID = &req.ParentID
	}
	var id string
	h.DB.QueryRow(r.Context(), `INSERT INTO categories (parent_id, name, slug, icon) VALUES ($1,$2,$3,$4) RETURNING id`,
		parentID, req.Name, req.Slug, req.Icon).Scan(&id)
	writeJSON(w, http.StatusCreated, map[string]string{"id": id})
}
