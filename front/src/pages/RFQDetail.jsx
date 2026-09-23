import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import { formatCurrency, formatDate, statusBadge } from '../utils/ui';

export default function RFQDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const { user, company } = useAuth();
  const [rfq, setRfq] = useState(null);
  const [proposals, setProposals] = useState([]);
  const [sortBy, setSortBy] = useState('price');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const load = () => {
    Promise.all([
      api.get(`/api/rfqs/${id}`),
      api.get(`/api/proposals?rfq_id=${id}`).catch(() => ({ data: [] })),
    ]).then(([rfqR, propR]) => {
      setRfq(rfqR.data);
      setProposals(propR.data || []);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [id]);

  const isOwner = rfq && company && rfq.buyer_id === company.id;
  const myProposal = proposals.find(p => p.supplier_id === company?.id);

  const sorted = [...proposals].sort((a, b) => {
    if (sortBy === 'price') return a.price - b.price;
    if (sortBy === 'delivery') return (a.delivery_days || 999) - (b.delivery_days || 999);
    if (sortBy === 'rating') return b.supplier_rating - a.supplier_rating;
    return 0;
  });

  const accept = async (proposalId) => {
    if (!confirm('Принять это предложение и создать заказ?')) return;
    const { data } = await api.post(`/api/proposals/${proposalId}/accept`);
    nav(`/orders/${data.order_id}`);
  };

  if (loading) return <div className="page-container"><div className="loading-spinner"><div className="spinner" /></div></div>;
  if (!rfq) return <div className="page-container"><div className="empty-state">Закупка не найдена</div></div>;

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">{rfq.title}</h1>
          <p className="page-subtitle">{rfq.buyer_name} {rfq.category_name && `• ${rfq.category_name}`}</p>
        </div>
        {statusBadge(rfq.status)}
      </div>

      <div className="card mb-24">
        <div className="text-sm" style={{ whiteSpace: 'pre-wrap' }}>{rfq.description || 'Без описания'}</div>
        <div className="divider" />
        <div className="form-row-3">
          <div><div className="text-sm text-muted">Количество</div><div>{rfq.quantity ? `${rfq.quantity} ${rfq.unit}` : '—'}</div></div>
          <div><div className="text-sm text-muted">Бюджет</div><div>{formatCurrency(rfq.budget_from)} – {formatCurrency(rfq.budget_to)}</div></div>
          <div><div className="text-sm text-muted">Срок поставки</div><div>{formatDate(rfq.delivery_date)}</div></div>
        </div>
        <div className="form-row mt-16">
          <div><div className="text-sm text-muted">Адрес доставки</div><div>{rfq.delivery_address || '—'}</div></div>
          <div><div className="text-sm text-muted">Условия оплаты</div><div>{rfq.payment_terms || '—'}</div></div>
        </div>
        <div className="mt-16"><div className="text-sm text-muted">Приём предложений до</div><div>{formatDate(rfq.proposals_deadline)}</div></div>
      </div>

      {user?.role === 'supplier' && rfq.status === 'open' && !myProposal && (
        <div className="mb-24">
          <button className="btn btn-primary btn-lg" onClick={() => setShowModal(true)}>💼 Отправить предложение</button>
        </div>
      )}
      {myProposal && (
        <div className="card mb-24" style={{ borderColor: 'var(--accent)' }}>
          <div className="flex flex-center gap-8">
            <span>Ваше предложение отправлено:</span>
            <strong>{formatCurrency(myProposal.price, myProposal.currency)}</strong>
            {statusBadge(myProposal.status)}
          </div>
        </div>
      )}

      <div className="page-header">
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700 }}>💼 Предложения ({proposals.length})</h2>
        {proposals.length > 1 && (
          <select className="form-select rfq-sort-select" value={sortBy} onChange={e => setSortBy(e.target.value)}>
            <option value="price">Сортировка: по цене</option>
            <option value="delivery">По сроку поставки</option>
            <option value="rating">По рейтингу</option>
          </select>
        )}
      </div>

      {proposals.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">💼</div>
          <div className="empty-state-title">Пока нет предложений</div>
        </div>
      ) : (
        <div className="comparison-table">
          <table>
            <thead>
              <tr>
                <th>Поставщик</th>
                <th>Цена</th>
                <th>Доставка</th>
                <th>Срок пр-ва</th>
                <th>Срок дост.</th>
                <th>Рейтинг</th>
                <th>Сделки</th>
                <th>Статус</th>
                {isOwner && rfq.status === 'open' && <th></th>}
              </tr>
            </thead>
            <tbody>
              {sorted.map((p, i) => (
                <tr key={p.id}>
                  <td className="fw-700">{p.supplier_name}</td>
                  <td className={i === 0 && sortBy === 'price' ? 'best-price' : ''}>{formatCurrency(p.price, p.currency)}</td>
                  <td>{formatCurrency(p.delivery_cost, p.currency)}</td>
                  <td>{p.production_days ? `${p.production_days} дн.` : '—'}</td>
                  <td>{p.delivery_days ? `${p.delivery_days} дн.` : '—'}</td>
                  <td>⭐ {p.supplier_rating?.toFixed(1) || '—'}</td>
                  <td>{p.supplier_deals}</td>
                  <td>{statusBadge(p.status)}</td>
                  {isOwner && rfq.status === 'open' && (
                    <td>
                      {p.status === 'pending' && (
                        <button className="btn btn-success btn-sm" onClick={() => accept(p.id)}>Принять</button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <ProposalModal rfqId={id} onClose={() => setShowModal(false)} onCreated={() => { setShowModal(false); load(); }} />
      )}
    </div>
  );
}

function ProposalModal({ rfqId, onClose, onCreated }) {
  const [form, setForm] = useState({
    price: '', production_days: '', delivery_days: '', delivery_cost: '', payment_terms: '', comment: '',
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setSaving(true);
    try {
      await api.post('/api/proposals', {
        rfq_id: rfqId,
        price: parseFloat(form.price),
        production_days: form.production_days ? parseInt(form.production_days, 10) : null,
        delivery_days: form.delivery_days ? parseInt(form.delivery_days, 10) : null,
        delivery_cost: form.delivery_cost ? parseFloat(form.delivery_cost) : null,
        payment_terms: form.payment_terms,
        comment: form.comment,
      });
      onCreated();
    } catch (err) {
      setError(err.response?.data?.error || 'Ошибка отправки предложения');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">💼 Коммерческое предложение</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form className="modal-form" onSubmit={submit}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Цена *</label>
              <input className="form-input" type="number" min="0" step="0.01" required value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Стоимость доставки</label>
              <input className="form-input" type="number" min="0" step="0.01" value={form.delivery_cost} onChange={e => setForm({ ...form, delivery_cost: e.target.value })} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Срок производства (дн.)</label>
              <input className="form-input" type="number" min="0" value={form.production_days} onChange={e => setForm({ ...form, production_days: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Срок поставки (дн.)</label>
              <input className="form-input" type="number" min="0" value={form.delivery_days} onChange={e => setForm({ ...form, delivery_days: e.target.value })} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Условия оплаты</label>
            <input className="form-input" value={form.payment_terms} onChange={e => setForm({ ...form, payment_terms: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Комментарий</label>
            <textarea className="form-input" rows={3} value={form.comment} onChange={e => setForm({ ...form, comment: e.target.value })} />
          </div>
          {error && <div className="form-error">⚠️ {error}</div>}
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Отмена</button>
            <button className="btn btn-primary" disabled={saving}>{saving ? 'Отправка...' : 'Отправить предложение'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
