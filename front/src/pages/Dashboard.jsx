import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import { formatCurrency, formatDate, statusBadge } from '../utils/ui';

export default function Dashboard() {
  const { user, company } = useAuth();
  const [stats, setStats] = useState({ rfqs: [], orders: [], proposals: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [rfqsR, ordersR, proposalsR] = await Promise.all([
          api.get('/api/rfqs?my=true').catch(() => ({ data: [] })),
          api.get('/api/orders').catch(() => ({ data: [] })),
          api.get('/api/proposals?my=true').catch(() => ({ data: [] })),
        ]);
        setStats({ rfqs: rfqsR.data || [], orders: ordersR.data || [], proposals: proposalsR.data || [] });
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  const activeOrders = stats.orders.filter(o => !['completed', 'cancelled'].includes(o.status));
  const pendingProposals = stats.proposals.filter(p => p.status === 'pending');

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">
            👋 Добро пожаловать{company ? `, ${company.name}` : ''}!
          </h1>
          <p className="page-subtitle">
            {user?.role === 'buyer' ? 'Покупатель' : user?.role === 'supplier' ? 'Поставщик' : 'Администратор'} • {user?.email}
          </p>
        </div>
        {!company && (
          <Link to="/profile" className="btn btn-primary">
            ➕ Создать профиль компании
          </Link>
        )}
      </div>

      {!company && (
        <div className="card mb-24 alert-banner" style={{ borderColor: 'var(--accent)', background: 'var(--accent-light)' }}>
          <div className="banner-content">
            <span style={{ fontSize: '1.5rem', flexShrink: 0 }}>⚠️</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700 }}>Заполните профиль компании</div>
              <div className="text-sm text-muted">Для доступа к функциям платформы необходимо создать профиль компании</div>
            </div>
            <Link to="/profile" className="btn btn-primary banner-action-btn">Перейти →</Link>
          </div>
        </div>
      )}

      <div className="stat-grid mb-24">
        {user?.role === 'buyer' && (
          <>
            <div className="stat-card">
              <div className="stat-icon" style={{ background: 'var(--blue-light)' }}>📋</div>
              <div className="stat-value">{stats.rfqs.length}</div>
              <div className="stat-label">Моих закупок</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon" style={{ background: 'var(--yellow-light)' }}>💼</div>
              <div className="stat-value">{pendingProposals.length}</div>
              <div className="stat-label">Ожидающих предложений</div>
            </div>
          </>
        )}
        {user?.role === 'supplier' && (
          <>
            <div className="stat-card">
              <div className="stat-icon" style={{ background: 'var(--yellow-light)' }}>💼</div>
              <div className="stat-value">{stats.proposals.length}</div>
              <div className="stat-label">Моих предложений</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon" style={{ background: 'var(--green-light)' }}>✅</div>
              <div className="stat-value">{stats.proposals.filter(p => p.status === 'accepted').length}</div>
              <div className="stat-label">Принятых предложений</div>
            </div>
          </>
        )}
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'var(--accent-light)' }}>📦</div>
          <div className="stat-value">{activeOrders.length}</div>
          <div className="stat-label">Активных заказов</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'var(--green-light)' }}>✅</div>
          <div className="stat-value">{stats.orders.filter(o => o.status === 'completed').length}</div>
          <div className="stat-label">Завершённых заказов</div>
        </div>
        {company && (
          <div className="stat-card">
            <div className="stat-icon" style={{ background: 'var(--yellow-light)' }}>⭐</div>
            <div className="stat-value">{company.rating ? company.rating.toFixed(1) : '—'}</div>
            <div className="stat-label">Рейтинг ({company.review_count} отзывов)</div>
          </div>
        )}
      </div>

      <div className="two-col-grid">
        {/* Recent Orders */}
        <div className="card">
          <div className="flex flex-center gap-8 mb-16">
            <span style={{ fontWeight: 700 }}>📦 Последние заказы</span>
            <Link to="/orders" className="btn btn-secondary btn-sm ml-auto">Все →</Link>
          </div>
          {loading ? <div className="loading-spinner"><div className="spinner" /></div>
            : activeOrders.length === 0
            ? <div className="empty-state" style={{ padding: 20 }}><div className="text-muted text-sm">Нет активных заказов</div></div>
            : activeOrders.slice(0, 4).map(o => (
              <Link to={`/orders/${o.id}`} key={o.id} style={{ display: 'block', marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                  <div>
                    <div className="text-sm fw-700">{o.buyer_name} → {o.supplier_name}</div>
                    <div className="text-sm text-muted">{formatCurrency(o.total_amount)} • {formatDate(o.created_at)}</div>
                  </div>
                  {statusBadge(o.status)}
                </div>
              </Link>
            ))
          }
        </div>

        {/* Quick Actions */}
        <div className="card">
          <div style={{ fontWeight: 700, marginBottom: 16 }}>⚡ Быстрые действия</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {user?.role === 'buyer' && (
              <>
                <Link to="/rfqs/create" className="btn btn-primary">➕ Создать закупку</Link>
                <Link to="/rfqs" className="btn btn-secondary">📋 Все закупки рынка</Link>
                <Link to="/suppliers" className="btn btn-secondary">🏭 Найти поставщиков</Link>
              </>
            )}
            {user?.role === 'supplier' && (
              <>
                <Link to="/rfqs" className="btn btn-primary">📋 Найти закупки</Link>
                <Link to="/products" className="btn btn-secondary">🛍️ Мой каталог</Link>
                <Link to="/proposals" className="btn btn-secondary">💼 Мои предложения</Link>
              </>
            )}
            {user?.role === 'admin' && (
              <Link to="/admin" className="btn btn-primary">🛡️ Панель управления</Link>
            )}
            <Link to="/calculator" className="btn btn-secondary">🧮 Калькулятор себестоимости</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
