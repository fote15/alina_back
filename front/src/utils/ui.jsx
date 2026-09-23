export function statusBadge(status) {
  const map = {
    open: { label: 'Открыта', cls: 'badge-green' },
    in_review: { label: 'На рассмотрении', cls: 'badge-blue' },
    closed: { label: 'Закрыта', cls: 'badge-gray' },
    cancelled: { label: 'Отменена', cls: 'badge-red' },
    pending: { label: 'Ожидает', cls: 'badge-yellow' },
    accepted: { label: 'Принято', cls: 'badge-green' },
    rejected: { label: 'Отклонено', cls: 'badge-red' },
    withdrawn: { label: 'Отозвано', cls: 'badge-gray' },
    draft: { label: 'Черновик', cls: 'badge-gray' },
    confirmed: { label: 'Подтверждён', cls: 'badge-blue' },
    paid: { label: 'Оплачен', cls: 'badge-accent' },
    in_production: { label: 'В производстве', cls: 'badge-yellow' },
    shipped: { label: 'Отгружен', cls: 'badge-blue' },
    delivered: { label: 'Доставлен', cls: 'badge-accent' },
    completed: { label: 'Завершён', cls: 'badge-green' },
  };
  const v = map[status] || { label: status, cls: 'badge-gray' };
  return <span className={`badge ${v.cls}`}>{v.label}</span>;
}

export function Stars({ value }) {
  const n = Math.round(value || 0);
  return (
    <div className="stars">
      {[1,2,3,4,5].map(i => (
        <span key={i} className={`star ${i <= n ? 'filled' : ''}`}>★</span>
      ))}
    </div>
  );
}

export function formatCurrency(amount, currency = 'RUB') {
  if (amount == null) return '—';
  return new Intl.NumberFormat('ru-RU', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);
}

export function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatDateTime(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleString('ru-RU', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export function initials(name) {
  if (!name) return '?';
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}
