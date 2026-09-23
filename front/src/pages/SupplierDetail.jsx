import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api/axios';
import { formatCurrency, formatDate, initials, Stars } from '../utils/ui';

export default function SupplierDetail() {
  const { id } = useParams();
  const [company, setCompany] = useState(null);
  const [products, setProducts] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [innReport, setInnReport] = useState(null);
  const [activeTab, setActiveTab] = useState('products');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get(`/api/companies/${id}`),
      api.get(`/api/products?company_id=${id}`).catch(() => ({ data: [] })),
      api.get(`/api/companies/${id}/reviews`).catch(() => ({ data: [] })),
    ]).then(([c, p, r]) => {
      setCompany(c.data);
      setProducts(p.data || []);
      setReviews(r.data || []);

      if (c.data?.inn) {
        api.get(`/api/companies/lookup-inn?inn=${c.data.inn}`)
          .then(res => setInnReport(res.data))
          .catch(() => setInnReport(null));
      }
    }).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="page-container"><div className="loading-spinner"><div className="spinner" /></div></div>;
  if (!company) return <div className="page-container"><div className="empty-state">Компания не найдена</div></div>;

  const filteredProducts = products.filter(p =>
    !search || p.name?.toLowerCase().includes(search.toLowerCase()) || p.sku?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="page-container">
      {/* Storefront Header (§24) */}
      <div className="card mb-24" style={{ background: 'linear-gradient(135deg, var(--bg-card) 0%, var(--bg-card-hover) 100%)', border: '1px solid var(--border-light)' }}>
        <div className="flex flex-center gap-20 flex-wrap mb-16">
          <div className="supplier-logo" style={{ width: 80, height: 80, fontSize: '2rem', borderRadius: 16 }}>
            {company.logo_url ? <img src={company.logo_url} alt={company.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 16 }} /> : initials(company.name)}
          </div>
          <div>
            <div className="flex flex-center gap-12 flex-wrap">
              <h1 style={{ fontSize: '1.6rem', fontWeight: 800 }}>{company.name}</h1>
              {company.is_verified && <span className="badge badge-green">✓ ЕГРЮЛ Проверено</span>}
              <span className="badge badge-blue">Тариф: {company.subscription || 'Standart'}</span>
            </div>
            <div className="text-sm text-muted mt-4">
              📍 {company.region || 'Регион не указан'} {company.inn && `• ИНН: ${company.inn}`} {company.kpp && `• КПП: ${company.kpp}`} {company.director && `• Руководитель: ${company.director}`}
            </div>
          </div>
        </div>

        {company.description && (
          <div className="text-sm mt-12 mb-16" style={{ lineHeight: 1.6, color: 'var(--text-primary)' }}>
            {company.description}
          </div>
        )}

        <div className="divider" />

        {/* Contacts & Info row */}
        <div className="form-row-4 gap-16 text-xs text-muted mb-16">
          {company.phone && <div>📞 <strong>Телефон:</strong> {company.phone}</div>}
          {company.email && <div>✉️ <strong>Email:</strong> {company.email}</div>}
          {company.website && <div>🌐 <strong>Сайт:</strong> <a href={company.website} target="_blank" rel="noreferrer" className="text-accent">{company.website}</a></div>}
          {company.legal_address && <div>🏢 <strong>Юр. адрес:</strong> {company.legal_address}</div>}
        </div>

        <div className="stat-grid">
          <div className="stat-card">
            <div className="stat-value">⭐ {company.rating ? company.rating.toFixed(1) : '5.0'}</div>
            <div className="stat-label">Рейтинг ({company.review_count} отзывов)</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{company.deal_count || 12}</div>
            <div className="stat-label">Успешных сделок</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{products.length}</div>
            <div className="stat-label">Товаров в каталоге</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-8 mb-24 border-b pb-8">
        <button className={`btn ${activeTab === 'products' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('products')}>
          🛍️ Каталог товаров ({products.length})
        </button>
        <button className={`btn ${activeTab === 'verification' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('verification')}>
          🛡️ Проверка ИНН и ФНС
        </button>
        <button className={`btn ${activeTab === 'reviews' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('reviews')}>
          💬 Отзывы ({reviews.length})
        </button>
      </div>

      {/* Tab: Products */}
      {activeTab === 'products' && (
        <div>
          <div className="search-bar mb-24">
            <div className="search-input-wrap">
              <span className="search-icon">🔍</span>
              <input className="search-input" placeholder="Поиск по товарам витрины..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>

          {filteredProducts.length === 0 ? (
            <div className="empty-state" style={{ padding: 40 }}>
              <div className="empty-state-icon">🛍️</div>
              <div className="empty-state-title">Товаров не найдено</div>
            </div>
          ) : (
            <div className="card-grid">
              {filteredProducts.map(p => (
                <div className="card" key={p.id}>
                  <div className="fw-700 mb-4" style={{ fontSize: '1.05rem' }}>{p.name}</div>
                  {p.sku && <div className="text-xs text-muted mb-8">SKU: {p.sku}</div>}
                  <div className="text-sm text-muted mb-12" style={{ minHeight: 36, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {p.description || 'Описание отсутствует'}
                  </div>
                  <div className="divider" />
                  <div className="flex flex-center gap-8">
                    <div className="fw-800 text-accent" style={{ fontSize: '1.15rem' }}>{formatCurrency(p.price, p.currency)}</div>
                    {p.min_order_qty && <span className="text-xs text-muted ml-auto">от {p.min_order_qty} {p.unit || 'шт'}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Verification by INN */}
      {activeTab === 'verification' && (
        <div className="card">
          <div className="flex flex-center gap-12 mb-16">
            <span style={{ fontSize: '1.4rem' }}>🛡️</span>
            <div>
              <div style={{ fontWeight: 800, fontSize: '1.1rem' }}>Результат проверки контрагента по ИНН (§3.2)</div>
              <div className="text-xs text-muted">Источник: Audit-It / DaData API / ЕГРЮЛ ФНС РФ</div>
            </div>
            {innReport?.is_verified && <span className="badge badge-green ml-auto">✓ Высокий уровень надежности</span>}
          </div>

          <div className="divider" />

          {innReport ? (
            <div>
              <div className="form-row-3 gap-16 mb-16">
                <div><div className="text-xs text-muted">Официальное наименование</div><div className="fw-700">{innReport.full_name}</div></div>
                <div><div className="text-xs text-muted">ИНН / КПП</div><div className="fw-700">{innReport.inn} / {innReport.kpp || '—'}</div></div>
                <div><div className="text-xs text-muted">ОГРН</div><div className="fw-700">{innReport.ogrn}</div></div>
              </div>

              <div className="form-row gap-16 mb-16">
                <div><div className="text-xs text-muted">Генеральный директор</div><div className="fw-700">{innReport.director}</div></div>
                <div><div className="text-xs text-muted">Статус организации</div><div className="fw-700 text-green">✓ {innReport.status}</div></div>
              </div>

              <div className="form-row gap-16 mb-16">
                <div><div className="text-xs text-muted">Юридический адрес</div><div className="text-sm">{innReport.legal_address}</div></div>
                <div><div className="text-xs text-muted">Основной ОКВЭД</div><div className="text-sm">{innReport.okved}</div></div>
              </div>

              <div className="divider" />

              <div className="flex gap-8 flex-wrap mt-16">
                {innReport.badges?.map((b, i) => (
                  <span key={i} className="badge badge-green">{b}</span>
                ))}
              </div>
            </div>
          ) : (
            <div className="empty-state">
              <div className="text-muted text-sm">Данные проверки ИНН временно недоступны</div>
            </div>
          )}
        </div>
      )}

      {/* Tab: Reviews */}
      {activeTab === 'reviews' && (
        <div>
          {reviews.length === 0 ? (
            <div className="empty-state" style={{ padding: 40 }}><div className="text-muted text-sm">Пока нет отзывов</div></div>
          ) : (
            <div className="card-grid">
              {reviews.map(r => (
                <div className="card" key={r.id}>
                  <div className="flex flex-center gap-8 mb-8">
                    <span className="fw-700">{r.reviewer_name}</span>
                    <Stars value={r.avg_score} />
                  </div>
                  <div className="text-sm text-muted">{r.comment}</div>
                  <div className="text-xs text-muted mt-12">{formatDate(r.created_at)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
