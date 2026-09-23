import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

export default function RFQCreate() {
  const nav = useNavigate();
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({
    title: '', description: '', category_id: '', quantity: '', unit: '',
    budget_from: '', budget_to: '', delivery_address: '', delivery_date: '',
    payment_terms: '', proposals_deadline: '',
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/api/categories').then(r => setCategories(r.data || [])).catch(() => {});
  }, []);

  const handle = async (e) => {
    e.preventDefault();
    setError(''); setSaving(true);
    try {
      const payload = {
        ...form,
        quantity: form.quantity ? parseInt(form.quantity, 10) : null,
        budget_from: form.budget_from ? parseFloat(form.budget_from) : null,
        budget_to: form.budget_to ? parseFloat(form.budget_to) : null,
        delivery_date: form.delivery_date || null,
        proposals_deadline: form.proposals_deadline ? new Date(form.proposals_deadline).toISOString() : null,
      };
      const { data } = await api.post('/api/rfqs', payload);
      nav(`/rfqs/${data.id}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Ошибка создания закупки');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">➕ Создать закупку</h1>
          <p className="page-subtitle">Заполните параметры, и поставщики смогут отправить предложения</p>
        </div>
      </div>

      <form className="card modal-form" style={{ maxWidth: 720 }} onSubmit={handle}>
        <div className="form-group">
          <label className="form-label">Название закупки *</label>
          <input className="form-input" required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Например: Закупка арматуры А500С" />
        </div>
        <div className="form-group">
          <label className="form-label">Описание</label>
          <textarea className="form-input" rows={4} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Технические требования, детали закупки..." />
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Категория</label>
            <select className="form-select" value={form.category_id} onChange={e => setForm({ ...form, category_id: e.target.value })}>
              <option value="">Не выбрана</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="form-row" style={{ gap: 16 }}>
            <div className="form-group">
              <label className="form-label">Количество</label>
              <input className="form-input" type="number" min="0" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Ед. измерения</label>
              <input className="form-input" value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} placeholder="шт, кг, т..." />
            </div>
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Бюджет от</label>
            <input className="form-input" type="number" min="0" value={form.budget_from} onChange={e => setForm({ ...form, budget_from: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Бюджет до</label>
            <input className="form-input" type="number" min="0" value={form.budget_to} onChange={e => setForm({ ...form, budget_to: e.target.value })} />
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Адрес доставки</label>
          <input className="form-input" value={form.delivery_address} onChange={e => setForm({ ...form, delivery_address: e.target.value })} />
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Желаемый срок поставки</label>
            <input className="form-input" type="date" value={form.delivery_date} onChange={e => setForm({ ...form, delivery_date: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Окончание приёма предложений</label>
            <input className="form-input" type="date" value={form.proposals_deadline} onChange={e => setForm({ ...form, proposals_deadline: e.target.value })} />
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Условия оплаты</label>
          <input className="form-input" value={form.payment_terms} onChange={e => setForm({ ...form, payment_terms: e.target.value })} placeholder="Например: 50% предоплата, 50% по факту поставки" />
        </div>
        {error && <div className="form-error">⚠️ {error}</div>}
        <div className="modal-footer" style={{ justifyContent: 'flex-start' }}>
          <button className="btn btn-primary" disabled={saving}>{saving ? 'Публикация...' : '✓ Опубликовать закупку'}</button>
        </div>
      </form>
    </div>
  );
}
