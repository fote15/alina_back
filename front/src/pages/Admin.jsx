import { useEffect, useState } from 'react';
import api from '../api/axios';
import { formatCurrency, formatDate, Stars } from '../utils/ui';

const TABS = [
  { key: 'stats', label: '📊 Статистика' },
  { key: 'users', label: '👥 Пользователи' },
  { key: 'reviews', label: '💬 Модерация отзывов' },
  { key: 'categories', label: '🗂️ Категории' },
];

export default function Admin() {
  const [tab, setTab] = useState('stats');

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">🛡️ Панель администратора</h1>
          <p className="page-subtitle">Управление платформой</p>
        </div>
      </div>

      <div className="search-bar">
        {TABS.map(t => (
          <button key={t.key} className={`btn ${tab === t.key ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'stats' && <StatsTab />}
      {tab === 'users' && <UsersTab />}
      {tab === 'reviews' && <ReviewsTab />}
      {tab === 'categories' && <CategoriesTab />}
    </div>
  );
}

function StatsTab() {
  const [stats, setStats] = useState(null);
  useEffect(() => { api.get('/api/admin/stats').then(r => setStats(r.data)); }, []);
  if (!stats) return <div className="loading-spinner"><div className="spinner" /></div>;
  return (
    <div className="stat-grid">
      <div className="stat-card"><div className="stat-value">{stats.total_users}</div><div className="stat-label">Пользователей</div></div>
      <div className="stat-card"><div className="stat-value">{stats.total_companies}</div><div className="stat-label">Компаний</div></div>
      <div className="stat-card"><div className="stat-value">{stats.total_rfqs}</div><div className="stat-label">Закупок</div></div>
      <div className="stat-card"><div className="stat-value">{stats.total_orders}</div><div className="stat-label">Заказов</div></div>
      <div className="stat-card"><div className="stat-value">{stats.completed_orders}</div><div className="stat-label">Завершённых заказов</div></div>
      <div className="stat-card"><div className="stat-value">{formatCurrency(stats.total_volume)}</div><div className="stat-label">Оборот платформы</div></div>
    </div>
  );
}

function UsersTab() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const load = () => api.get('/api/admin/users').then(r => setUsers(r.data || [])).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const block = async (id) => { await api.post(`/api/admin/users/${id}/block`); load(); };
  const verify = async (companyId) => { await api.post(`/api/admin/companies/${companyId}/verify`); load(); };

  if (loading) return <div className="loading-spinner"><div className="spinner" /></div>;
  return (
    <div className="table-wrap card">
      <table>
        <thead>
          <tr><th>Email</th><th>Роль</th><th>Компания</th><th>Регистрация</th><th></th></tr>
        </thead>
        <tbody>
          {users.map(u => (
            <tr key={u.id}>
              <td>{u.email}</td>
              <td><span className="badge badge-blue">{u.role}</span></td>
              <td>{u.company_name || '—'} {u.is_verified && <span className="badge badge-green">✓</span>}</td>
              <td className="text-muted text-sm">{formatDate(u.created_at)}</td>
              <td>
                <div className="flex gap-8">
                  {u.company_id && !u.is_verified && (
                    <button className="btn btn-success btn-sm" onClick={() => verify(u.company_id)}>Верифицировать</button>
                  )}
                  {u.role !== 'blocked' && (
                    <button className="btn btn-danger btn-sm" onClick={() => block(u.id)}>Заблокировать</button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ReviewsTab() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const load = () => api.get('/api/admin/reviews').then(r => setReviews(r.data || [])).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const moderate = async (id) => { await api.post(`/api/admin/reviews/${id}/moderate`); load(); };

  if (loading) return <div className="loading-spinner"><div className="spinner" /></div>;
  if (reviews.length === 0) return <div className="empty-state"><div className="empty-state-title">Нет отзывов на модерации</div></div>;
  return (
    <div className="card-grid">
      {reviews.map(r => (
        <div className="card" key={r.id}>
          <div className="flex flex-center gap-8 mb-8">
            <span className="fw-700">{r.reviewer_name}</span>
            <span className="text-muted">→</span>
            <span className="fw-700">{r.reviewee_name}</span>
          </div>
          <Stars value={r.quality_score} />
          <div className="text-sm mt-8">{r.comment}</div>
          <div className="modal-footer" style={{ justifyContent: 'flex-start', marginTop: 12 }}>
            {!r.is_moderated
              ? <button className="btn btn-success btn-sm" onClick={() => moderate(r.id)}>Одобрить (скрыть жалобы)</button>
              : <span className="badge badge-green">Промодерировано</span>}
          </div>
        </div>
      ))}
    </div>
  );
}

function CategoriesTab() {
  const [categories, setCategories] = useState([]);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(true);
  const load = () => api.get('/api/admin/categories').then(r => setCategories(r.data || [])).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const add = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    const slug = name.toLowerCase().replace(/[^a-zа-я0-9]+/gi, '-').replace(/^-+|-+$/g, '');
    await api.post('/api/admin/categories', { name, slug });
    setName('');
    load();
  };

  if (loading) return <div className="loading-spinner"><div className="spinner" /></div>;
  return (
    <div>
      <form className="search-bar" onSubmit={add}>
        <input className="search-input" style={{ paddingLeft: 12, maxWidth: 300 }} placeholder="Новая категория..." value={name} onChange={e => setName(e.target.value)} />
        <button className="btn btn-primary">➕ Добавить</button>
      </form>
      <div className="card-grid">
        {categories.map(c => (
          <div className="card" key={c.id}>
            <div className="fw-700">{c.name}</div>
            <div className="text-sm text-muted">{c.slug}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
