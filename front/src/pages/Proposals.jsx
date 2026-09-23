import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import { formatCurrency, formatDate, statusBadge } from '../utils/ui';

export default function Proposals() {
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/api/proposals?my=true')
      .then(r => setProposals(r.data || []))
      .catch(() => setProposals([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">💼 Мои предложения</h1>
          <p className="page-subtitle">Коммерческие предложения, отправленные на закупки</p>
        </div>
      </div>

      {loading ? (
        <div className="loading-spinner"><div className="spinner" /></div>
      ) : proposals.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">💼</div>
          <div className="empty-state-title">Предложений пока нет</div>
          <div className="empty-state-text">Найдите подходящие закупки и отправьте предложение</div>
          <Link to="/rfqs" className="btn btn-primary mt-16">📋 Найти закупки</Link>
        </div>
      ) : (
        <div className="table-wrap card">
          <table>
            <thead>
              <tr>
                <th>Закупка</th>
                <th>Цена</th>
                <th>Срок пр-ва</th>
                <th>Срок дост.</th>
                <th>Статус</th>
                <th>Дата</th>
              </tr>
            </thead>
            <tbody>
              {proposals.map(p => (
                <tr key={p.id}>
                  <td><Link to={`/rfqs/${p.rfq_id}`} className="fw-700 text-accent">{p.rfq_title}</Link></td>
                  <td>{formatCurrency(p.price, p.currency)}</td>
                  <td>{p.production_days ? `${p.production_days} дн.` : '—'}</td>
                  <td>{p.delivery_days ? `${p.delivery_days} дн.` : '—'}</td>
                  <td>{statusBadge(p.status)}</td>
                  <td className="text-muted text-sm">{formatDate(p.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
