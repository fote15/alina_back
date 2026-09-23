import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

const emptyForm = {
  name: '', inn: '', kpp: '', ogrn: '', legal_address: '', actual_address: '',
  director: '', description: '', website: '', phone: '', email: '', region: '',
};

export default function Profile() {
  const { user, company, refreshCompany, logout } = useAuth();
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);

  // INN verification state
  const [innLoading, setInnLoading] = useState(false);
  const [innReport, setInnReport] = useState(null);

  useEffect(() => {
    if (company) {
      setForm({
        name: company.name || '', inn: company.inn || '', kpp: company.kpp || '',
        ogrn: company.ogrn || '', legal_address: company.legal_address || '',
        actual_address: company.actual_address || '', director: company.director || '',
        description: company.description || '', website: company.website || '',
        phone: company.phone || '', email: company.email || '', region: company.region || '',
      });

      if (company.inn) {
        api.get(`/api/companies/lookup-inn?inn=${company.inn}`)
          .then(r => setInnReport(r.data))
          .catch(() => setInnReport(null));
      }
    } else {
      setEditing(true);
    }
  }, [company]);

  const handleLookupINN = async () => {
    if (!form.inn || (form.inn.length !== 10 && form.inn.length !== 12)) {
      setError('Введите корректный ИНН (10 или 12 цифр)');
      return;
    }
    setError(''); setInnLoading(true);
    try {
      const res = await api.get(`/api/companies/lookup-inn?inn=${form.inn}`);
      const d = res.data;
      setForm(prev => ({
        ...prev,
        name: d.name || prev.name,
        kpp: d.kpp || prev.kpp,
        ogrn: d.ogrn || prev.ogrn,
        legal_address: d.legal_address || prev.legal_address,
        director: d.director || prev.director,
        region: d.region || prev.region,
      }));
      setInnReport(d);
      setSuccess('Данные компании автоматически подтянуты из DaData / ФНС (§3.2)');
    } catch (err) {
      setError(err.response?.data?.error || 'Ошибка проверки ИНН');
    } finally {
      setInnLoading(false);
    }
  };

  const handle = async (e) => {
    e.preventDefault();
    setError(''); setSuccess(''); setSaving(true);
    try {
      if (company) {
        await api.put('/api/my/company', form);
        setSuccess('Профиль компании обновлён');
      } else {
        await api.post('/api/my/company', form);
        setSuccess('Компания создана');
      }
      refreshCompany();
      setEditing(false);
    } catch (err) {
      setError(err.response?.data?.error || 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  const isNew = !company;

  return (
    <div className="page-container">
      <div className="page-header mb-24">
        <div>
          <h1 className="page-title">🏢 Профиль компании</h1>
          <p className="page-subtitle">{user?.role === 'buyer' ? 'Покупатель' : user?.role === 'supplier' ? 'Поставщик' : 'Администратор'}</p>
        </div>
        {company && !editing && (
          <button className="btn btn-secondary" onClick={() => setEditing(true)}>✏️ Редактировать профиль</button>
        )}
      </div>

      {!editing && company ? (
        <div className="card">
          <div className="flex flex-center gap-16 mb-16">
            <div className="supplier-logo">{company.name?.[0]?.toUpperCase() || '?'}</div>
            <div>
              <div style={{ fontSize: '1.3rem', fontWeight: 800 }}>{company.name}</div>
              <div className="text-sm text-muted">{company.region || 'Регион не указан'}</div>
            </div>
            {company.is_verified && <span className="badge badge-green ml-auto">✓ Проверен контрагент (ФНС)</span>}
          </div>
          <div className="divider" />
          <div className="form-row-4 gap-16">
            <div><div className="text-xs text-muted">ИНН</div><div className="fw-700">{company.inn || '—'}</div></div>
            <div><div className="text-xs text-muted">КПП</div><div className="fw-700">{company.kpp || '—'}</div></div>
            <div><div className="text-xs text-muted">ОГРН</div><div className="fw-700">{company.ogrn || '—'}</div></div>
            <div><div className="text-xs text-muted">Руководитель</div><div className="fw-700">{company.director || '—'}</div></div>
          </div>
          <div className="mt-16"><div className="text-xs text-muted">Юридический адрес</div><div className="text-sm">{company.legal_address || '—'}</div></div>
          {company.actual_address && <div className="mt-12"><div className="text-xs text-muted">Фактический адрес</div><div className="text-sm">{company.actual_address}</div></div>}
          <div className="mt-12"><div className="text-xs text-muted">Описание</div><div className="text-sm">{company.description || '—'}</div></div>
          
          <div className="form-row mt-16 gap-16">
            <div><div className="text-xs text-muted">Телефон</div><div>{company.phone || '—'}</div></div>
            <div><div className="text-xs text-muted">Email</div><div>{company.email || '—'}</div></div>
            <div><div className="text-xs text-muted">Сайт</div><div>{company.website || '—'}</div></div>
          </div>

          <div className="divider" />

          {/* Verification Box (§3.2) */}
          {innReport && (
            <div className="card mb-24" style={{ background: 'var(--bg-input)', border: '1px solid var(--border-light)' }}>
              <div className="flex flex-center gap-12 mb-12">
                <span>🛡️</span>
                <span className="fw-700">Отчет проверки компании по ИНН {company.inn}</span>
                <span className="badge badge-green ml-auto">Статус: {innReport.status}</span>
              </div>
              <div className="text-xs text-muted mb-12">Источник: {innReport.source}</div>
              <div className="flex gap-8 flex-wrap">
                {innReport.badges?.map((b, idx) => (
                  <span key={idx} className="badge badge-blue">{b}</span>
                ))}
              </div>
            </div>
          )}

          <div className="stat-grid">
            <div className="stat-card">
              <div className="stat-value">⭐ {company.rating ? company.rating.toFixed(1) : '5.0'}</div>
              <div className="stat-label">Рейтинг ({company.review_count} отзывов)</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{company.deal_count || 0}</div>
              <div className="stat-label">Успешных сделок</div>
            </div>
            <div className="stat-card">
              <div className="stat-value" style={{ textTransform: 'capitalize' }}>{company.subscription || 'basic'}</div>
              <div className="stat-label">Тариф подписки</div>
            </div>
          </div>
          <div className="divider" />
          <div className="profile-actions">
            <button type="button" className="btn btn-danger" onClick={logout}>
              🚪 Выйти из аккаунта
            </button>
          </div>
        </div>
      ) : (
        <form className="card" style={{ maxWidth: 780 }} onSubmit={handle}>
          {isNew && (
            <div className="text-sm text-muted mb-16">
              Введите ИНН вашей компании и нажмите «🔍 Автозаполнение по ИНН» для автоматической проверки в ФНС / Rusprofile (§3.2).
            </div>
          )}
          <div className="modal-form">
            <div className="form-group">
              <label className="form-label">ИНН организации *</label>
              <div className="flex gap-8">
                <input
                  className="form-input"
                  placeholder="7707083893"
                  value={form.inn}
                  onChange={e => setForm({ ...form, inn: e.target.value })}
                  maxLength={12}
                />
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ whiteSpace: 'nowrap' }}
                  onClick={handleLookupINN}
                  disabled={innLoading}
                >
                  {innLoading ? '⏳ Проверка...' : '🔍 Заполнить по ИНН'}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Наименование компании *</label>
              <input className="form-input" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>

            <div className="form-row-3">
              <div className="form-group">
                <label className="form-label">КПП</label>
                <input className="form-input" value={form.kpp} onChange={e => setForm({ ...form, kpp: e.target.value })} maxLength={9} />
              </div>
              <div className="form-group">
                <label className="form-label">ОГРН</label>
                <input className="form-input" value={form.ogrn} onChange={e => setForm({ ...form, ogrn: e.target.value })} maxLength={15} />
              </div>
              <div className="form-group">
                <label className="form-label">Руководитель</label>
                <input className="form-input" value={form.director} onChange={e => setForm({ ...form, director: e.target.value })} />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Юридический адрес</label>
                <input className="form-input" value={form.legal_address} onChange={e => setForm({ ...form, legal_address: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Фактический адрес</label>
                <input className="form-input" value={form.actual_address} onChange={e => setForm({ ...form, actual_address: e.target.value })} />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Регион работы</label>
              <input className="form-input" value={form.region} onChange={e => setForm({ ...form, region: e.target.value })} placeholder="г. Москва" />
            </div>

            <div className="form-group">
              <label className="form-label">Описание деятельности</label>
              <textarea className="form-input" rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
            </div>

            <div className="form-row-3">
              <div className="form-group">
                <label className="form-label">Телефон</label>
                <input className="form-input" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input className="form-input" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Сайт</label>
                <input className="form-input" value={form.website} onChange={e => setForm({ ...form, website: e.target.value })} />
              </div>
            </div>

            {error && <div className="form-error">⚠️ {error}</div>}
            {success && <div className="text-sm text-green mb-12">✓ {success}</div>}

            <div className="modal-footer" style={{ justifyContent: 'flex-start' }}>
              <button className="btn btn-primary" disabled={saving}>{saving ? 'Сохранение...' : '✓ Сохранить данные'}</button>
              {company && <button type="button" className="btn btn-secondary" onClick={() => setEditing(false)}>Отмена</button>}
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
