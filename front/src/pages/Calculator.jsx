import { useState } from 'react';
import api from '../api/axios';
import { formatCurrency } from '../utils/ui';

const fields = [
  { key: 'material_cost', label: 'Стоимость сырья' },
  { key: 'logistics_cost', label: 'Логистика' },
  { key: 'packaging_cost', label: 'Упаковка' },
  { key: 'production_cost', label: 'Производство' },
  { key: 'commission', label: 'Комиссии' },
  { key: 'taxes', label: 'Налоги' },
  { key: 'other_costs', label: 'Обязательные затраты' },
  { key: 'extra_cost', label: 'Доп. поле для ввода' },
];

const emptyForm = fields.reduce((acc, f) => ({ ...acc, [f.key]: '' }), { desired_profit: '20' });

export default function Calculator() {
  const [form, setForm] = useState(emptyForm);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const calc = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {};
      fields.forEach(f => { payload[f.key] = parseFloat(form[f.key]) || 0; });
      payload.desired_profit = parseFloat(form.desired_profit) || 0;
      const { data } = await api.post('/api/calculator', payload);
      setResult(data);
    } finally {
      setLoading(false);
    }
  };

  const breakdownLabels = {
    breakdown_material: 'Сырьё', breakdown_logistics: 'Логистика', breakdown_packaging: 'Упаковка',
    breakdown_production: 'Производство', breakdown_commission: 'Комиссии', breakdown_taxes: 'Налоги',
    breakdown_other: 'Обязательные затраты', breakdown_extra: 'Доп. затраты',
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">🧮 Калькулятор себестоимости</h1>
          <p className="page-subtitle">Рассчитайте себестоимость и рекомендуемую цену продажи</p>
        </div>
      </div>

      <div className="calc-grid">
        <form className="card modal-form" onSubmit={calc}>
          {fields.map(f => (
            <div className="form-group" key={f.key}>
              <label className="form-label">{f.label}</label>
              <input
                className="form-input" type="number" min="0" step="0.01"
                value={form[f.key]}
                onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                placeholder="0"
              />
            </div>
          ))}
          <div className="form-group">
            <label className="form-label">Желаемая прибыль (%)</label>
            <input
              className="form-input" type="number" min="0" step="0.1"
              value={form.desired_profit}
              onChange={e => setForm({ ...form, desired_profit: e.target.value })}
            />
          </div>
          <button className="btn btn-primary btn-lg" disabled={loading}>{loading ? 'Расчёт...' : '= Рассчитать'}</button>
        </form>

        <div>
          {result ? (
            <div className="calc-result">
              <div className="text-sm text-muted mb-8">Себестоимость</div>
              <div className="calc-result-value">{formatCurrency(result.cost_price)}</div>
              <div className="divider" />
              <div className="text-sm text-muted mb-8">Рекомендуемая цена продажи</div>
              <div className="calc-result-value">{formatCurrency(result.recommended_price)}</div>
              <div className="text-sm text-muted mt-8">Прибыль: {formatCurrency(result.profit_amount)}</div>

              <div className="calc-breakdown">
                {Object.entries(breakdownLabels).map(([key, label]) => (
                  <div className="breakdown-item" key={key}>
                    <span>{label}</span>
                    <span className="fw-700">{formatCurrency(result[key])}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="empty-state" style={{ padding: 60 }}>
              <div className="empty-state-icon">🧮</div>
              <div className="empty-state-title">Заполните форму слева</div>
              <div className="empty-state-text">Результат расчёта появится здесь</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
