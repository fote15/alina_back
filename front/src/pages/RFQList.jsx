import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import { formatCurrency, formatDate, statusBadge } from '../utils/ui';

export default function RFQList() {
  const { user } = useAuth();
  const [rfqs, setRfqs] = useState([]);
  const [categories, setCategories] = useState([]);
  
  // Filter states
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [status, setStatus] = useState('');
  const [minBudget, setMinBudget] = useState('');
  const [maxBudget, setMaxBudget] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [myOnly, setMyOnly] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/api/categories')
      .then(r => setCategories(r.data || []))
      .catch(() => setCategories([]));
  }, []);

  const loadRFQs = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (categoryId) params.set('category_id', categoryId);
    if (status) params.set('status', status);
    if (minBudget) params.set('min_budget', minBudget);
    if (maxBudget) params.set('max_budget', maxBudget);
    if (sortBy) params.set('sort_by', sortBy);
    if (myOnly) params.set('my', 'true');

    api.get(`/api/rfqs?${params.toString()}`)
      .then(r => setRfqs(r.data || []))
      .catch(() => setRfqs([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadRFQs();
  }, [search, categoryId, status, minBudget, maxBudget, sortBy, myOnly]);

  const resetFilters = () => {
    setSearch('');
    setCategoryId('');
    setStatus('');
    setMinBudget('');
    setMaxBudget('');
    setSortBy('newest');
    setMyOnly(false);
  };

  const hasActiveFilters = search || categoryId || status || minBudget || maxBudget || myOnly || sortBy !== 'newest';

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">📋 Реестр закупок</h1>
          <p className="page-subtitle">{myOnly ? 'Закупки вашей компании' : 'Поиск коммерческих закупок по критериям'}</p>
        </div>
        {user?.role === 'buyer' && (
          <Link to="/rfqs/create" className="btn btn-primary">➕ Создать закупку</Link>
        )}
      </div>

      {/* Procurement Criteria Filter Box */}
      <div className="card filter-panel mb-24">
        <div className="filter-title-row flex flex-center gap-12 mb-16">
          <span style={{ fontSize: '1.2rem' }}>🎛️</span>
          <span style={{ fontWeight: 700, fontSize: '1.05rem' }}>Критерии поиска закупок</span>
          {hasActiveFilters && (
            <button className="btn btn-secondary btn-sm ml-auto" onClick={resetFilters}>
              🔄 Сбросить фильтры
            </button>
          )}
        </div>

        <div className="form-row-3 gap-16 mb-16">
          <div className="form-group">
            <label className="form-label text-xs">Поиск по наименованию</label>
            <div className="search-input-wrap">
              <span className="search-icon">🔍</span>
              <input
                className="search-input"
                placeholder="Поиск по названию или описанию..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label text-xs">Категория продукции</label>
            <select
              className="form-select"
              value={categoryId}
              onChange={e => setCategoryId(e.target.value)}
            >
              <option value="">Все категории</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.icon || '📦'} {c.name}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label text-xs">Статус закупки</label>
            <select
              className="form-select"
              value={status}
              onChange={e => setStatus(e.target.value)}
            >
              <option value="">Все статусы</option>
              <option value="open">Активные (Прием предложений)</option>
              <option value="in_review">На рассмотрении</option>
              <option value="completed">Завершенные</option>
              <option value="cancelled">Отмененные</option>
            </select>
          </div>
        </div>

        <div className="form-row-4 gap-16">
          <div className="form-group">
            <label className="form-label text-xs">Бюджет от (₽)</label>
            <input
              type="number"
              className="form-input"
              placeholder="0"
              value={minBudget}
              onChange={e => setMinBudget(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label text-xs">Бюджет до (₽)</label>
            <input
              type="number"
              className="form-input"
              placeholder="10 000 000"
              value={maxBudget}
              onChange={e => setMaxBudget(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label text-xs">Сортировка</label>
            <select
              className="form-select"
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
            >
              <option value="newest">📅 Сначала новые</option>
              <option value="budget_desc">💰 Сначала с большим бюджетом</option>
              <option value="budget_asc">💸 Сначала с меньшим бюджетом</option>
              <option value="deadline_asc">⏳ Сначала истекающие</option>
            </select>
          </div>

          <div className="form-group" style={{ display: 'flex', alignItems: 'flex-end' }}>
            {user?.role === 'buyer' && (
              <button
                type="button"
                className={`btn w-100 ${myOnly ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setMyOnly(m => !m)}
              >
                {myOnly ? '✓ Мои закупки' : 'Все закупки'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* RFQ Cards Grid */}
      {loading ? (
        <div className="loading-spinner"><div className="spinner" /></div>
      ) : rfqs.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📭</div>
          <div className="empty-state-title">Закупок не найдено</div>
          <div className="empty-state-text">Попробуйте изменить критерии поиска или сбросить фильтры</div>
          {hasActiveFilters && (
            <button className="btn btn-secondary mt-16" onClick={resetFilters}>Сбросить все фильтры</button>
          )}
        </div>
      ) : (
        <div className="card-grid">
          {rfqs.map(r => (
            <Link to={`/rfqs/${r.id}`} key={r.id} className="rfq-card">
              <div className="rfq-card-header">
                <div className="rfq-card-title">{r.title}</div>
                {statusBadge(r.status)}
              </div>
              <div className="rfq-card-buyer">{r.buyer_name} {r.category_name && `• ${r.category_name}`}</div>
              <div className="text-sm text-muted mb-12" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                {r.description}
              </div>
              <div className="rfq-card-meta">
                {r.quantity && <span className="rfq-meta-item">📦 {r.quantity} {r.unit}</span>}
                {(r.budget_from || r.budget_to) && (
                  <span className="rfq-meta-item">💰 {formatCurrency(r.budget_from)} – {formatCurrency(r.budget_to)}</span>
                )}
                <span className="rfq-meta-item">💼 {r.proposal_count} предложений</span>
                <span className="rfq-meta-item">📅 {formatDate(r.created_at)}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
