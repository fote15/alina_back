import { useEffect, useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import { formatCurrency } from '../utils/ui';

export default function Products() {
  const { user, company } = useAuth();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState('');
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const isSupplier = user?.role === 'supplier';

  const load = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (isSupplier && company) params.set('company_id', company.id);
    api.get(`/api/products?${params.toString()}`)
      .then(r => {
        let list = r.data || [];
        if (selectedCat) {
          list = list.filter(p => p.category_id === selectedCat);
        }
        setProducts(list);
      })
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [search, company, selectedCat]);
  useEffect(() => { api.get('/api/categories').then(r => setCategories(r.data || [])).catch(() => {}); }, []);

  const handleExportCSV = () => {
    const url = `${api.defaults.baseURL || ''}/api/products/export${company ? `?company_id=${company.id}` : ''}`;
    window.open(url, '_blank');
  };

  return (
    <div className="page-container">
      <div className="page-header mb-16">
        <div>
          <h1 className="page-title">🛍️ {isSupplier ? 'Мой каталог товаров (п. 24)' : 'Каталог товаров'}</h1>
          <p className="page-subtitle">{isSupplier ? 'Управление карточками и базовая загрузка каталога через Excel/CSV' : 'Поиск товаров от проверенных поставщиков'}</p>
        </div>
        {isSupplier && (
          <div className="flex gap-8 flex-wrap">
            <button className="btn btn-secondary" onClick={() => setShowImportModal(true)}>📥 Импорт CSV / Excel</button>
            <button className="btn btn-secondary" onClick={handleExportCSV}>📤 Экспорт CSV</button>
            <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>➕ Добавить товар</button>
          </div>
        )}
      </div>

      {/* Filter Bar */}
      <div className="card mb-24">
        <div className="form-row gap-16">
          <div className="search-input-wrap" style={{ flex: 2 }}>
            <span className="search-icon">🔍</span>
            <input
              className="search-input"
              placeholder="Поиск по наименованию товара, SKU, описанию..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <select
            className="form-select"
            style={{ flex: 1 }}
            value={selectedCat}
            onChange={e => setSelectedCat(e.target.value)}
          >
            <option value="">Все категории продукции</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.icon || '📦'} {c.name}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="loading-spinner"><div className="spinner" /></div>
      ) : products.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🛍️</div>
          <div className="empty-state-title">Товаров не найдено</div>
          {isSupplier ? (
            <div className="empty-state-text">
              Добавьте вручную или воспользуйтесь пакетной загрузкой через CSV / Excel файл (§4, §24)
            </div>
          ) : (
            <div className="empty-state-text">Попробуйте изменить поисковый запрос</div>
          )}
        </div>
      ) : (
        <div className="card-grid">
          {products.map(p => (
            <div className="card" key={p.id} style={{ display: 'flex', flexDirection: 'column' }}>
              <div className="flex flex-center gap-8 mb-8">
                <div className="fw-700" style={{ fontSize: '1.05rem' }}>{p.name}</div>
                {!p.in_stock && <span className="badge badge-gray ml-auto">Нет в наличии</span>}
              </div>
              {p.sku && <div className="text-xs text-muted mb-8">SKU: <span className="fw-600">{p.sku}</span></div>}
              <div className="text-sm text-muted mb-12" style={{ display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden', minHeight: 48 }}>
                {p.description || 'Описание товара временно отсутствует'}
              </div>
              <div className="divider" style={{ marginTop: 'auto' }} />
              <div className="flex flex-center gap-8">
                <div className="fw-800 text-accent" style={{ fontSize: '1.15rem' }}>{formatCurrency(p.price, p.currency)}</div>
                {p.min_order_qty && <span className="text-xs text-muted ml-auto">Мин. заказ: {p.min_order_qty} {p.unit || 'шт'}</span>}
              </div>
              {p.manufacturer && <div className="text-xs text-muted mt-8">Производитель: {p.manufacturer}</div>}
            </div>
          ))}
        </div>
      )}

      {showAddModal && (
        <ProductModal categories={categories} onClose={() => setShowAddModal(false)} onCreated={() => { setShowAddModal(false); load(); }} />
      )}

      {showImportModal && (
        <CSVImportModal onClose={() => setShowImportModal(false)} onImported={() => { setShowImportModal(false); load(); }} />
      )}
    </div>
  );
}

function ProductModal({ categories, onClose, onCreated }) {
  const [form, setForm] = useState({
    name: '', sku: '', category_id: '', description: '', price: '', unit: 'шт',
    min_order_qty: '1', manufacturer: '', region: '',
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setSaving(true);
    try {
      await api.post('/api/products', {
        ...form,
        price: form.price ? parseFloat(form.price) : null,
        min_order_qty: form.min_order_qty ? parseInt(form.min_order_qty, 10) : null,
        in_stock: true,
      });
      onCreated();
    } catch (err) {
      setError(err.response?.data?.error || 'Ошибка создания товара');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">➕ Создать новый товар</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form className="modal-form" onSubmit={submit}>
          <div className="form-group">
            <label className="form-label">Наименование товара *</label>
            <input className="form-input" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Например: Кабель силовой ВВГнг 3х2.5" />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">SKU / Артикул</label>
              <input className="form-input" value={form.sku} onChange={e => setForm({ ...form, sku: e.target.value })} placeholder="SKU-10928" />
            </div>
            <div className="form-group">
              <label className="form-label">Категория</label>
              <select className="form-select" value={form.category_id} onChange={e => setForm({ ...form, category_id: e.target.value })}>
                <option value="">Не выбрана</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Описание и характеристики</label>
            <textarea className="form-input" rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="form-row-3">
            <div className="form-group">
              <label className="form-label">Цена (₽)</label>
              <input className="form-input" type="number" min="0" step="0.01" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Ед. изм.</label>
              <input className="form-input" value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} placeholder="шт, кг, м..." />
            </div>
            <div className="form-group">
              <label className="form-label">Мин. партия</label>
              <input className="form-input" type="number" min="1" value={form.min_order_qty} onChange={e => setForm({ ...form, min_order_qty: e.target.value })} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Производитель</label>
              <input className="form-input" value={form.manufacturer} onChange={e => setForm({ ...form, manufacturer: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Регион производства</label>
              <input className="form-input" value={form.region} onChange={e => setForm({ ...form, region: e.target.value })} />
            </div>
          </div>
          {error && <div className="form-error">⚠️ {error}</div>}
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Отмена</button>
            <button className="btn btn-primary" disabled={saving}>{saving ? 'Сохранение...' : 'Сохранить товар'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CSVImportModal({ onClose, onImported }) {
  const [csvText, setCsvText] = useState(
`Название;SKU;Описание;Цена;Единица
Труба стальная 108х4;SKU-9901;Труба ГОСТ 10704-91;4500.00;м
Задвижка чугунная 30ч6бр DN100;SKU-9902;Задвижка параллельная;12800.00;шт
Профиль оцинкованный 60х27;SKU-9903;Длина 3 метра;185.00;шт`
  );
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef();

  const handleImport = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');

    try {
      if (file) {
        const formData = new FormData();
        formData.append('file', file);
        await api.post('/api/products/import', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      } else if (csvText.trim()) {
        // convert CSV lines to products array
        const lines = csvText.trim().split('\n');
        const products = [];
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line || (i === 0 && line.toLowerCase().includes('название'))) continue;
          const parts = line.split(/;|,/);
          if (parts.length > 0 && parts[0].trim()) {
            products.push({
              name: parts[0].trim(),
              sku: parts[1]?.trim() || '',
              description: parts[2]?.trim() || '',
              price: parts[3] ? parseFloat(parts[3].replace(',', '.').trim()) : 0,
              unit: parts[4]?.trim() || 'шт',
            });
          }
        }
        await api.post('/api/products/import', { products });
      }
      onImported();
    } catch (err) {
      setError(err.response?.data?.error || 'Ошибка загрузки CSV');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 640 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">📥 Пакетный импорт товаров (Excel / CSV)</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form className="modal-form" onSubmit={handleImport}>
          <p className="text-sm text-muted">
            Выберите файл `.csv` или вставьте строк каталога в формате <code>Название;SKU;Описание;Цена;Единица</code>.
          </p>

          <div className="form-group">
            <label className="form-label">Загрузить файл .csv / .txt</label>
            <input
              type="file"
              accept=".csv,.txt"
              className="form-input"
              ref={fileInputRef}
              onChange={e => setFile(e.target.files[0])}
            />
          </div>

          <div className="divider" />

          <div className="form-group">
            <label className="form-label">Или вставьте данные CSV прямо сюда:</label>
            <textarea
              className="form-input text-xs"
              rows={6}
              style={{ fontFamily: 'monospace' }}
              value={csvText}
              onChange={e => setCsvText(e.target.value)}
            />
          </div>

          {error && <div className="form-error">⚠️ {error}</div>}

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Отмена</button>
            <button className="btn btn-primary" disabled={loading}>
              {loading ? 'Импортирование...' : 'Загрузить товары в каталог'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
