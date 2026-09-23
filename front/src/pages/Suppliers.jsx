import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import { initials } from '../utils/ui';

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    api.get(`/api/companies?${params.toString()}`)
      .then(r => setSuppliers(r.data || []))
      .catch(() => setSuppliers([]))
      .finally(() => setLoading(false));
  }, [search]);

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">🏭 Поставщики</h1>
          <p className="page-subtitle">Найдите надёжных поставщиков по рейтингу и региону</p>
        </div>
      </div>

      <div className="search-bar">
        <div className="search-input-wrap">
          <span className="search-icon">🔍</span>
          <input className="search-input" placeholder="Поиск по названию компании..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {loading ? (
        <div className="loading-spinner"><div className="spinner" /></div>
      ) : suppliers.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🏭</div>
          <div className="empty-state-title">Поставщиков не найдено</div>
        </div>
      ) : (
        <div className="card-grid">
          {suppliers.map(s => (
            <Link to={`/suppliers/${s.id}`} key={s.id} className="supplier-card">
              <div className="flex flex-center gap-12">
                <div className="supplier-logo">{initials(s.name)}</div>
                <div>
                  <div className="supplier-name">{s.name}</div>
                  <div className="supplier-region">{s.region || 'Регион не указан'}</div>
                </div>
                {s.is_verified && <span className="badge badge-green ml-auto">✓</span>}
              </div>
              <div className="supplier-stats">
                <span>⭐ {s.rating ? s.rating.toFixed(1) : '—'}</span>
                <span>💬 {s.review_count} отзывов</span>
                <span>🤝 {s.deal_count} сделок</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
