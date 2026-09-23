import { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import { formatCurrency, formatDate, formatDateTime, statusBadge } from '../utils/ui';

const STATUS_FLOW = ['draft', 'confirmed', 'paid', 'in_production', 'shipped', 'delivered', 'completed'];
const STATUS_LABELS = {
  draft: 'Черновик', confirmed: 'Подтверждён', paid: 'Оплачен', in_production: 'В производстве',
  shipped: 'Отгружен', delivered: 'Доставлен', completed: 'Завершён', cancelled: 'Отменён',
};

export default function OrderDetail() {
  const { id } = useParams();
  const { user, company } = useAuth();
  const [order, setOrder] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showReview, setShowReview] = useState(false);
  const [reviewDone, setReviewDone] = useState(false);

  const load = () => {
    api.get(`/api/orders/${id}`).then(r => {
      setOrder(r.data.order);
      setHistory(r.data.history || []);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [id]);

  const isBuyer = order && company && order.buyer_id === company.id;
  const isSupplier = order && company && order.supplier_id === company.id;

  const advance = async () => {
    const idx = STATUS_FLOW.indexOf(order.status);
    const next = STATUS_FLOW[idx + 1];
    if (!next) return;
    await api.patch(`/api/orders/${id}/status`, { status: next });
    load();
  };

  const cancel = async () => {
    if (!confirm('Отменить заказ?')) return;
    await api.patch(`/api/orders/${id}/status`, { status: 'cancelled' });
    load();
  };

  if (loading) return <div className="page-container"><div className="loading-spinner"><div className="spinner" /></div></div>;
  if (!order) return <div className="page-container"><div className="empty-state">Заказ не найден</div></div>;

  const currentIdx = STATUS_FLOW.indexOf(order.status);
  const isCancelled = order.status === 'cancelled';

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">📦 Заказ #{order.id.slice(0, 8)}</h1>
          <p className="page-subtitle">{order.buyer_name} → {order.supplier_name}</p>
        </div>
        {statusBadge(order.status)}
      </div>

      <div className="two-col-grid">
        <div className="card">
          <div style={{ fontWeight: 700, marginBottom: 16 }}>Информация о заказе</div>
          <div className="form-row">
            <div><div className="text-sm text-muted">Сумма</div><div className="fw-700">{formatCurrency(order.total_amount, order.currency)}</div></div>
            <div><div className="text-sm text-muted">Дата создания</div><div>{formatDate(order.created_at)}</div></div>
          </div>
          <div className="mt-16"><div className="text-sm text-muted">Адрес доставки</div><div>{order.delivery_address || '—'}</div></div>
          <div className="mt-16"><div className="text-sm text-muted">Примечания</div><div>{order.notes || '—'}</div></div>

          {!isCancelled && (isBuyer || isSupplier) && (
            <div className="modal-footer" style={{ justifyContent: 'flex-start', marginTop: 20 }}>
              {currentIdx < STATUS_FLOW.length - 1 && (
                <button className="btn btn-primary btn-sm" onClick={advance}>
                  Далее: {STATUS_LABELS[STATUS_FLOW[currentIdx + 1]]} →
                </button>
              )}
              {order.status !== 'completed' && (
                <button className="btn btn-danger btn-sm" onClick={cancel}>Отменить заказ</button>
              )}
            </div>
          )}

          {order.status === 'completed' && !reviewDone && (isBuyer || isSupplier) && (
            <button className="btn btn-secondary mt-16" onClick={() => setShowReview(true)}>⭐ Оставить отзыв</button>
          )}
          {reviewDone && <div className="text-sm text-green mt-16">✓ Отзыв отправлен</div>}
        </div>

        <div className="card">
          <div style={{ fontWeight: 700, marginBottom: 16 }}>История статусов</div>
          <div className="timeline">
            {history.map((h, i) => (
              <div className="timeline-item" key={i}>
                <div className={`timeline-dot ${i === history.length - 1 ? 'current' : 'done'}`}>✓</div>
                <div className="timeline-content">
                  <div className="timeline-title">{STATUS_LABELS[h.status] || h.status}</div>
                  {h.comment && <div className="text-sm text-muted">{h.comment}</div>}
                  <div className="timeline-date">{formatDateTime(h.created_at)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card mt-16">
        <div style={{ fontWeight: 700, marginBottom: 16 }}>💬 Чат с {isBuyer ? order.supplier_name : order.buyer_name}</div>
        <Chat orderId={id} />
      </div>

      {showReview && (
        <ReviewModal
          orderId={id}
          revieweeId={isBuyer ? order.supplier_id : order.buyer_id}
          revieweeName={isBuyer ? order.supplier_name : order.buyer_name}
          onClose={() => setShowReview(false)}
          onDone={() => { setShowReview(false); setReviewDone(true); }}
        />
      )}
    </div>
  );
}

function Chat({ orderId }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const endRef = useRef();

  const load = () => api.get(`/api/orders/${orderId}/messages`).then(r => setMessages(r.data || []));

  useEffect(() => {
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [orderId]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const send = async (e) => {
    e.preventDefault();
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      await api.post(`/api/orders/${orderId}/messages`, { content: text });
      setText('');
      await load();
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="chat-container" style={{ height: 420 }}>
      <div className="chat-messages">
        {messages.length === 0 ? (
          <div className="empty-state" style={{ padding: 20 }}>
            <div className="text-muted text-sm">Сообщений пока нет. Начните переписку!</div>
          </div>
        ) : messages.map(m => (
          <div key={m.id} className={`chat-bubble ${m.sender_id === user?.id ? 'mine' : 'theirs'}`}>
            <div>{m.content}</div>
            {m.file_url && <div><a href={m.file_url} target="_blank" rel="noreferrer">📎 {m.file_name || 'Файл'}</a></div>}
            <div className="chat-bubble-meta">{formatDateTime(m.created_at)}</div>
          </div>
        ))}
        <div ref={endRef} />
      </div>
      <form className="chat-input-area" onSubmit={send}>
        <textarea
          className="chat-input"
          placeholder="Введите сообщение..."
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(e); } }}
        />
        <button className="btn btn-primary" disabled={sending}>Отправить</button>
      </form>
    </div>
  );
}

function ReviewModal({ orderId, revieweeId, revieweeName, onClose, onDone }) {
  const [scores, setScores] = useState({ quality_score: 5, timing_score: 5, communication_score: 5, compliance_score: 5 });
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setSaving(true);
    try {
      await api.post('/api/reviews', { order_id: orderId, reviewee_id: revieweeId, comment, ...scores });
      onDone();
    } catch (err) {
      setError(err.response?.data?.error || 'Ошибка отправки отзыва');
    } finally {
      setSaving(false);
    }
  };

  const scoreField = (key, label) => (
    <div className="form-group">
      <label className="form-label">{label}</label>
      <div className="stars">
        {[1, 2, 3, 4, 5].map(n => (
          <span key={n} className={`star ${n <= scores[key] ? 'filled' : ''}`} style={{ cursor: 'pointer', fontSize: '1.4rem' }}
            onClick={() => setScores({ ...scores, [key]: n })}>★</span>
        ))}
      </div>
    </div>
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">⭐ Отзыв о {revieweeName}</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form className="modal-form" onSubmit={submit}>
          {scoreField('quality_score', 'Качество')}
          {scoreField('timing_score', 'Соблюдение сроков')}
          {scoreField('communication_score', 'Коммуникация')}
          {scoreField('compliance_score', 'Соответствие условиям')}
          <div className="form-group">
            <label className="form-label">Комментарий</label>
            <textarea className="form-input" rows={3} value={comment} onChange={e => setComment(e.target.value)} />
          </div>
          {error && <div className="form-error">⚠️ {error}</div>}
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Отмена</button>
            <button className="btn btn-primary" disabled={saving}>{saving ? 'Отправка...' : 'Отправить отзыв'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
