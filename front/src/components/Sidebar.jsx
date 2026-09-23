import { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import { initials, formatDateTime } from '../utils/ui';

const buyerNav = [
  { to: '/dashboard', icon: '🏠', label: 'Главная' },
  { to: '/rfqs', icon: '📋', label: 'Закупки' },
  { to: '/rfqs/create', icon: '➕', label: 'Новая закупка' },
  { to: '/proposals', icon: '💼', label: 'Предложения' },
  { to: '/orders', icon: '📦', label: 'Заказы' },
  { to: '/suppliers', icon: '🏭', label: 'Поставщики' },
  { to: '/analytics', icon: '📈', label: 'Аналитика рынка' },
  { to: '/calculator', icon: '🧮', label: 'Калькулятор' },
  { to: '/profile', icon: '⚙️', label: 'Профиль' },
];
const supplierNav = [
  { to: '/dashboard', icon: '🏠', label: 'Главная' },
  { to: '/rfqs', icon: '📋', label: 'Закупки' },
  { to: '/proposals', icon: '💼', label: 'Мои предложения' },
  { to: '/orders', icon: '📦', label: 'Заказы' },
  { to: '/products', icon: '🛍️', label: 'Каталог' },
  { to: '/analytics', icon: '📈', label: 'Аналитика рынка' },
  { to: '/calculator', icon: '🧮', label: 'Калькулятор' },
  { to: '/profile', icon: '⚙️', label: 'Профиль' },
];
const adminNav = [
  { to: '/dashboard', icon: '🏠', label: 'Главная' },
  { to: '/admin', icon: '🛡️', label: 'Панель Админа' },
  { to: '/rfqs', icon: '📋', label: 'Закупки' },
  { to: '/suppliers', icon: '🏭', label: 'Поставщики' },
  { to: '/analytics', icon: '📈', label: 'Аналитика' },
];

export default function Sidebar({ mobileOpen, onClose }) {
  const { user, company, logout } = useAuth();
  const loc = useLocation();
  const navigate = useNavigate();
  const nav = user?.role === 'supplier' ? supplierNav : user?.role === 'admin' ? adminNav : buyerNav;

  const handleLogout = () => {
    if (onClose) onClose();
    logout();
    navigate('/login');
  };

  const handleProfileClick = () => {
    if (onClose) onClose();
    navigate('/profile');
  };

  return (
    <aside className={`sidebar ${mobileOpen ? 'open' : ''}`}>
      <div className="sidebar-logo">
        <div className="sidebar-logo-brand">
          <div className="sidebar-logo-icon">🔷</div>
          <span className="sidebar-logo-text">Alina Trade</span>
        </div>
        <button
          className="sidebar-close-btn"
          onClick={onClose}
          type="button"
          aria-label="Закрыть меню"
        >
          ✕
        </button>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-section-label">Навигация</div>
        {nav.map(item => (
          <Link
            key={item.to}
            to={item.to}
            className={`nav-item ${loc.pathname === item.to || loc.pathname.startsWith(item.to + '/') ? 'active' : ''}`}
            onClick={onClose}
          >
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
          </Link>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div
          className="user-pill"
          onClick={handleProfileClick}
          title="Открыть профиль"
          role="button"
          tabIndex={0}
        >
          <div className="user-avatar">{initials(company?.name || user?.email || 'U')}</div>
          <div className="user-info">
            <div className="user-name">{company?.name || user?.email}</div>
            <div className="user-role">{user?.role === 'buyer' ? 'Покупатель' : user?.role === 'supplier' ? 'Поставщик' : user?.role || 'Пользователь'}</div>
          </div>
          <span className="user-pill-arrow">⚙️</span>
        </div>

        <button
          className="sidebar-logout-btn"
          onClick={handleLogout}
          type="button"
          title="Выйти из аккаунта"
        >
          <span className="sidebar-logout-icon">🚪</span>
          <span className="sidebar-logout-text">Выйти</span>
        </button>
      </div>
    </aside>
  );
}

export function Topbar({ title, onMenuClick }) {
  const [notifs, setNotifs] = useState([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const ref = useRef();

  useEffect(() => {
    api.get('/api/notifications/unread').then(r => setUnread(r.data.count)).catch(() => {});
    const t = setInterval(() => {
      api.get('/api/notifications/unread').then(r => setUnread(r.data.count)).catch(() => {});
    }, 30000);
    return () => clearInterval(t);
  }, []);

  const openNotifs = () => {
    if (!open) {
      api.get('/api/notifications').then(r => { setNotifs(r.data); setOpen(true); });
    } else {
      setOpen(false);
    }
  };

  const markRead = () => {
    api.post('/api/notifications/read').then(() => { setUnread(0); setNotifs(n => n.map(x => ({...x, is_read:true}))); });
  };

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button
          className="topbar-menu-btn"
          onClick={onMenuClick}
          type="button"
          aria-label="Открыть меню"
        >
          ☰
        </button>
        <span className="topbar-title">{title}</span>
      </div>

      <div className="topbar-actions" ref={ref}>
        <button
          className="notif-btn"
          onClick={openNotifs}
          type="button"
          aria-label="Уведомления"
        >
          🔔
          {unread > 0 && <span className="notif-dot" />}
        </button>

        {open && (
          <div className="notif-panel">
            <div className="notif-header">
              <span>Уведомления</span>
              {unread > 0 && <button className="btn btn-secondary btn-sm" onClick={markRead}>Прочитать все</button>}
            </div>
            <div className="notif-list">
              {notifs.length === 0
                ? <div className="notif-empty">Нет уведомлений</div>
                : notifs.map(n => (
                  <div key={n.id} className={`notif-item ${!n.is_read ? 'unread' : ''}`}>
                    <div className="notif-title">{n.title}</div>
                    {n.body && <div className="notif-body">{n.body}</div>}
                    <div className="notif-time">{formatDateTime(n.created_at)}</div>
                  </div>
                ))
              }
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
