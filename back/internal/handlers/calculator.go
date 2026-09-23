package handlers

import (
	"net/http"
)

type CalculatorHandler struct{}

type calcRequest struct {
	MaterialCost   float64 `json:"material_cost"`
	LogisticsCost  float64 `json:"logistics_cost"`
	PackagingCost  float64 `json:"packaging_cost"`
	ProductionCost float64 `json:"production_cost"`
	Commission     float64 `json:"commission"`
	Taxes          float64 `json:"taxes"`
	OtherCosts     float64 `json:"other_costs"`
	ExtraCost      float64 `json:"extra_cost"`
	DesiredProfit  float64 `json:"desired_profit"` // percent
}

type calcResponse struct {
	CostPrice          float64 `json:"cost_price"`
	RecommendedPrice   float64 `json:"recommended_price"`
	ProfitAmount       float64 `json:"profit_amount"`
	BreakdownMaterial  float64 `json:"breakdown_material"`
	BreakdownLogistics float64 `json:"breakdown_logistics"`
	BreakdownPackaging float64 `json:"breakdown_packaging"`
	BreakdownProduction float64 `json:"breakdown_production"`
	BreakdownCommission float64 `json:"breakdown_commission"`
	BreakdownTaxes     float64 `json:"breakdown_taxes"`
	BreakdownOther     float64 `json:"breakdown_other"`
	BreakdownExtra     float64 `json:"breakdown_extra"`
}

func (h *CalculatorHandler) Calculate(w http.ResponseWriter, r *http.Request) {
	var req calcRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid body")
		return
	}

	costPrice := req.MaterialCost + req.LogisticsCost + req.PackagingCost +
		req.ProductionCost + req.Commission + req.Taxes + req.OtherCosts + req.ExtraCost

	profitAmount := costPrice * (req.DesiredProfit / 100)
	recommendedPrice := costPrice + profitAmount

	writeJSON(w, http.StatusOK, calcResponse{
		CostPrice:           costPrice,
		RecommendedPrice:    recommendedPrice,
		ProfitAmount:        profitAmount,
		BreakdownMaterial:   req.MaterialCost,
		BreakdownLogistics:  req.LogisticsCost,
		BreakdownPackaging:  req.PackagingCost,
		BreakdownProduction: req.ProductionCost,
		BreakdownCommission: req.Commission,
		BreakdownTaxes:      req.Taxes,
		BreakdownOther:      req.OtherCosts,
		BreakdownExtra:      req.ExtraCost,
	})
}
