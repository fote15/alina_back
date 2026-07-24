package handlers

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"alina-trade/back/internal/middleware"
)

type ReviewHandler struct {
	DB *pgxpool.Pool
}

type reviewDTO struct {
	ID                string  `json:"id"`
	OrderID           string  `json:"order_id"`
	ReviewerID        string  `json:"reviewer_id"`
	ReviewerName      string  `json:"reviewer_name"`
	RevieweeID        string  `json:"reviewee_id"`
	RevieweeName      string  `json:"reviewee_name"`
	QualityScore      int     `json:"quality_score"`
	TimingScore       int     `json:"timing_score"`
	CommunicationScore int    `json:"communication_score"`
	ComplianceScore   int     `json:"compliance_score"`
	AvgScore          float64 `json:"avg_score"`
	Comment           string  `json:"comment"`
	CreatedAt         string  `json:"created_at"`
}

func (h *ReviewHandler) CreateReview(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r)
	var companyID string
	if err := h.DB.QueryRow(r.Context(), `SELECT id FROM companies WHERE user_id=$1`, userID).Scan(&companyID); err != nil {
		writeError(w, http.StatusBadRequest, "no company profile")
		return
	}
	var req struct {
		OrderID            string `json:"order_id"`
		RevieweeID         string `json:"reviewee_id"`
		QualityScore       int    `json:"quality_score"`
		TimingScore        int    `json:"timing_score"`
		CommunicationScore int    `json:"communication_score"`
		ComplianceScore    int    `json:"compliance_score"`
		Comment            string `json:"comment"`
	}
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid body")
		return
	}

	var id string
	err := h.DB.QueryRow(r.Context(), `
		INSERT INTO reviews (order_id, reviewer_id, reviewee_id, quality_score, timing_score, communication_score, compliance_score, comment)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
		req.OrderID, companyID, req.RevieweeID,
		req.QualityScore, req.TimingScore, req.CommunicationScore, req.ComplianceScore, req.Comment,
	).Scan(&id)
	if err != nil {
		writeError(w, http.StatusConflict, "review already exists")
		return
	}

	// Update company rating
	h.DB.Exec(r.Context(), `
		UPDATE companies SET
		rating = (SELECT AVG((quality_score + timing_score + communication_score + compliance_score)::float/4) FROM reviews WHERE reviewee_id=$1),
		review_count = (SELECT COUNT(*) FROM reviews WHERE reviewee_id=$1)
		WHERE id=$1`, req.RevieweeID)

	writeJSON(w, http.StatusCreated, map[string]string{"id": id})
}

func (h *ReviewHandler) ListReviews(w http.ResponseWriter, r *http.Request) {
	companyID := chi.URLParam(r, "companyID")
	rows, err := h.DB.Query(r.Context(), `
		SELECT rv.id, rv.order_id, rv.reviewer_id, COALESCE(rc.name,''),
		       rv.reviewee_id, COALESCE(re.name,''),
		       rv.quality_score, rv.timing_score, rv.communication_score, rv.compliance_score,
		       (rv.quality_score + rv.timing_score + rv.communication_score + rv.compliance_score)::float/4,
		       COALESCE(rv.comment,''), rv.created_at
		FROM reviews rv
		JOIN companies rc ON rc.id=rv.reviewer_id
		JOIN companies re ON re.id=rv.reviewee_id
		WHERE rv.reviewee_id=$1 AND rv.is_moderated=false
		ORDER BY rv.created_at DESC`, companyID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "query failed")
		return
	}
	defer rows.Close()

	var list []reviewDTO
	for rows.Next() {
		var rv reviewDTO
		if err := rows.Scan(&rv.ID, &rv.OrderID, &rv.ReviewerID, &rv.ReviewerName,
			&rv.RevieweeID, &rv.RevieweeName, &rv.QualityScore, &rv.TimingScore,
			&rv.CommunicationScore, &rv.ComplianceScore, &rv.AvgScore,
			&rv.Comment, &rv.CreatedAt); err == nil {
			list = append(list, rv)
		}
	}
	if list == nil {
		list = []reviewDTO{}
	}
	writeJSON(w, http.StatusOK, list)
}
