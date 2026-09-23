import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const { register } = useAuth();
  const nav = useNavigate();
  const [role, setRole] = useState('buyer');
  const [form, setForm] = useState({ email: '', phone: '', password: '', confirm: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handle = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirm) { setError('Пароли не совпадают'); return; }
    if (form.password.length < 6) { setError('Пароль минимум 6 символов'); return; }
    setLoading(true);
    try {
      await register(form.email, form.password, form.phone, role);
      nav('/profile');
    } catch (err) {
      setError(err.response?.data?.error || 'Ошибка регистрации');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card" style={{ maxWidth: 480 }}>
        <div className="auth-logo">
          <div className="auth-logo-icon">🔷</div>
          <span className="auth-logo-text">Alina Trade</span>
        </div>
        <h1 className="auth-title">Регистрация</h1>
        <p className="auth-subtitle">Создайте аккаунт на B2B платформе</p>
        <div className="form-group mb-16">
          <label className="form-label">Тип аккаунта</label>
          <div className="role-tabs">
            <div className={`role-tab ${role === 'buyer' ? 'active' : ''}`} onClick={() => setRole('buyer')}>
              🛒 Покупатель
            </div>
            <div className={`role-tab ${role === 'supplier' ? 'active' : ''}`} onClick={() => setRole('supplier')}>
              🏭 Поставщик
            </div>
          </div>
        </div>
        <form className="auth-form" onSubmit={handle}>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input className="form-input" type="email" placeholder="company@email.ru"
              value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
          </div>
          <div className="form-group">
            <label className="form-label">Телефон (необязательно)</label>
            <input className="form-input" type="tel" placeholder="+7 (000) 000-00-00"
              value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Пароль</label>
              <input className="form-input" type="password" placeholder="Минимум 6 символов"
                value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required />
            </div>
            <div className="form-group">
              <label className="form-label">Подтвердите пароль</label>
              <input className="form-input" type="password" placeholder="Повторите пароль"
                value={form.confirm} onChange={e => setForm({ ...form, confirm: e.target.value })} required />
            </div>
          </div>
          {error && <div className="form-error">⚠️ {error}</div>}
          <button className="btn btn-primary btn-full btn-lg" disabled={loading}>
            {loading ? '⏳ Создание...' : '✓ Зарегистрироваться'}
          </button>
        </form>
        <p className="auth-switch">
          Уже есть аккаунт? <Link to="/login">Войти</Link>
        </p>
      </div>
    </div>
  );
}
