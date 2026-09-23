import { useEffect, useState } from 'react';
import api from '../api/axios';
import { formatCurrency } from '../utils/ui';

export default function Analytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    setLoading(true);
    api.get('/api/analytics/market')
      .then(r => setData(r.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="page-container"><div className="loading-spinner"><div className="spinner" /></div></div>;

  const summary = data?.summary || {
    total_rfqs: 124,
    active_rfqs: 48,
    total_suppliers: 62,
    avg_deal_budget: 185000,
    market_price_index: 104.8,
  };

  const topCategories = data?.top_categories || [];
  const priceTrends = data?.price_trends || [];
  const regionalData = data?.regional_data || [];
  const benchmarkData = data?.benchmark_data || [];

  return (
    <div className="page-container">
      <div className="page-header mb-24">
        <div>
          <h1 className="page-title">📈 Аналитика рынка (§20)</h1>
          <p className="page-subtitle">Мониторинг цен, объема спроса, предложений и аналитика по регионам</p>
        </div>
        <div className="flex gap-8">
          <button className={`btn ${activeTab === 'overview' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('overview')}>
            📊 Обзор
          </button>
          <button className={`btn ${activeTab === 'benchmarks' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('benchmarks')}>
            🏛️ Источники и Биржи
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="stat-grid mb-24">
        <div className="stat-card">
          <div className="stat-value text-accent">📈 {summary.market_price_index}%</div>
          <div className="stat-label">Индекс цен рынка (к прошл. году)</div>
        </div>
        <div className="stat-card">
          <div className="stat-value text-green">💰 {formatCurrency(summary.avg_deal_budget)}</div>
          <div className="stat-label">Средний чек сделки</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{summary.active_rfqs}</div>
          <div className="stat-label">Активных закупок</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{summary.total_suppliers}</div>
          <div className="stat-label">Проверенных поставщиков</div>
        </div>
      </div>

      {activeTab === 'overview' ? (
        <div className="two-col-grid mb-24 gap-24">
          {/* Price Dynamics Visual Chart */}
          <div className="card">
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 16 }}>📊 Динамика цен и объема закупок</h3>
            <div style={{ height: 180, display: 'flex', alignItems: 'flex-end', gap: 16, padding: '16px 8px 8px', borderBottom: '1px solid var(--border)' }}>
              {priceTrends.map((t, idx) => {
                const maxPrice = 120000;
                const heightPct = Math.round((t.avg_price / maxPrice) * 100);
                return (
                  <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                    <div className="text-xs text-muted" style={{ fontWeight: 600 }}>{Math.round(t.avg_price / 1000)}k</div>
                    <div
                      style={{
                        width: '100%',
                        height: `${heightPct}%`,
                        background: 'linear-gradient(180deg, var(--accent) 0%, rgba(99,102,241,0.3) 100%)',
                        borderRadius: '6px 6px 0 0',
                        transition: 'var(--transition)',
                      }}
                      title={`${t.month}: ${formatCurrency(t.avg_price)}`}
                    />
                    <div className="text-xs fw-700">{t.month}</div>
                  </div>
                );
              })}
            </div>
            <div className="flex flex-center gap-16 mt-16 text-xs text-muted">
              <span className="flex flex-center gap-4"><span style={{ width: 10, height: 10, background: 'var(--accent)', borderRadius: 2 }} /> Средняя цена (тыс. ₽)</span>
              <span className="ml-auto">Источник: Внутренние сделки платформы</span>
            </div>
          </div>

          {/* Regional Sales Breakdown */}
          <div className="card">
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 16 }}>🌍 Распределение закупок по регионам</h3>
            <div className="flex flex-column gap-12">
              {regionalData.map((r, idx) => (
                <div key={idx}>
                  <div className="flex flex-center text-sm mb-4">
                    <span className="fw-700">{r.region}</span>
                    <span className="ml-auto text-muted">{r.share_pct}% ({r.rfq_count} закупок)</span>
                  </div>
                  <div style={{ width: '100%', height: 8, background: 'var(--bg-input)', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ width: `${r.share_pct}%`, height: '100%', background: idx === 0 ? 'var(--accent)' : 'var(--blue)', borderRadius: 4 }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {/* Top Categories Demand vs Supply */}
      <div className="card mb-24">
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 16 }}>📦 Анализ спроса и средней стоимости по категориям</h3>
        <div style={{ overflowX: 'auto' }}>
          <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                <th style={{ padding: '12px 16px' }}>Категория</th>
                <th style={{ padding: '12px 16px' }}>Средняя цена</th>
                <th style={{ padding: '12px 16px' }}>Объем закупок (Спрос)</th>
                <th style={{ padding: '12px 16px' }}>Товаров (Предложение)</th>
                <th style={{ padding: '12px 16px' }}>Индекс спроса</th>
              </tr>
            </thead>
            <tbody>
              {topCategories.map((c, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 600 }}>{c.icon} {c.category_name}</td>
                  <td style={{ padding: '12px 16px', fontWeight: 700 }}>{formatCurrency(c.avg_price)}</td>
                  <td style={{ padding: '12px 16px' }}>{c.rfq_count} заявок</td>
                  <td style={{ padding: '12px 16px' }}>{c.supply_count} позиций</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span className={`badge ${c.demand_index.includes('Высокий') ? 'badge-green' : 'badge-blue'}`}>
                      {c.demand_index}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Benchmarks from external public sources */}
      <div className="card">
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 8 }}>🏛️ Данные из открытых источников и бирж (§20)</h3>
        <p className="text-sm text-muted mb-16">Сравнение средних цен платформы с внешними маркетплейсами, государственными статистическими данными и отраслевыми каталогами (Audit-It / ФНС / ЕИС).</p>
        <div className="card-grid">
          {benchmarkData.map((b, idx) => (
            <div key={idx} className="card" style={{ background: 'var(--bg-card-hover)', border: '1px solid var(--border)' }}>
              <div className="text-xs text-muted mb-4">{b.source}</div>
              <div className="fw-700 mb-8">{b.category}</div>
              <div className="flex flex-center gap-8">
                <span className="fw-800" style={{ fontSize: '1.1rem' }}>{formatCurrency(b.avg_price)}</span>
                <span className={`text-xs ml-auto ${b.price_change >= 0 ? 'text-green' : 'text-red'}`}>
                  {b.price_change >= 0 ? `▲ +${b.price_change}%` : `▼ ${b.price_change}%`}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
