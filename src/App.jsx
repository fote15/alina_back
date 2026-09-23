import React, { useState, useEffect } from 'react';

// --- MOCK INITIAL DATA ---
const INITIAL_PROCUREMENTS = [
  { id: 'ЗП-091', title: 'Трубы стальные Д50', category: 'Трубы', qty: 500, unit: 'шт', bidsCount: 4, dateEnd: '2026-07-20', status: 'Активна' },
  { id: 'ЗП-090', title: 'Листовой металл 2мм', category: 'Металлопрокат', qty: 200, unit: 'кг', bidsCount: 2, dateEnd: '2026-07-22', status: 'Активна' },
  { id: 'ЗП-089', title: 'Крепёж М8×30 DIN 933', category: 'Крепёж', qty: 10000, unit: 'шт', bidsCount: 3, dateEnd: '2026-07-18', status: 'Сравнение' },
  { id: 'ЗП-085', title: 'Кабель ВВГнг 3×2.5', category: 'Электрика', qty: 1000, unit: 'м', bidsCount: 5, dateEnd: '2026-07-10', status: 'Завершена' }
];

const INITIAL_CATALOG = [
  { id: 1, title: 'Болт М8×30 DIN 933', sku: 'BLT-M8-30-933', category: 'Крепёж', price: 3.2, unit: 'шт', minQty: 1000, term: 3, icon: '🔩' },
  { id: 2, title: 'Труба стальная Д50×3.5', sku: 'PIP-ST-50-35', category: 'Трубы', price: 145, unit: 'м', minQty: 50, term: 5, icon: '🔧' },
  { id: 3, title: 'Кабель ВВГнг 3×2.5', sku: 'CBL-VVG-325', category: 'Электрика', price: 89, unit: 'м', minQty: 100, term: 2, icon: '⚡' },
  { id: 4, title: 'Лист металл 2.0×1250×2500', sku: 'SHT-ST-2-1250', category: 'Металлопрокат', price: 4200, unit: 'лист', minQty: 10, term: 7, icon: '🏗️' },
  { id: 5, title: 'Герметик силиконовый 600мл', sku: 'SLT-SI-600', category: 'Химия', price: 320, unit: 'шт', minQty: 24, term: 1, icon: '🧪' },
  { id: 6, title: 'Розетка IEK 16А IP44', sku: 'SCK-IEK-16-44', category: 'Электрика', price: 210, unit: 'шт', minQty: 50, term: 2, icon: '🔌' }
];

const INITIAL_ORDERS = [
  {
    id: 'ЗК-145',
    supplier: 'ООО Метиз-Про',
    title: 'Крепёж М8×30 DIN 933',
    qty: 10000,
    amount: 36800,
    status: 'В пути',
    tracker: 'СДЭК #1234567890',
    paid: 18400,
    timeline: [
      { title: 'Заказ принят поставщиком', time: '14.07.2026, 09:12', done: true },
      { title: 'Отгружен со склада в ТК', time: '14.07.2026, 15:40', done: true },
      { title: 'В пути (Казань → Москва)', time: 'Ожидаемая доставка: 16.07.2026', done: true, active: true },
      { title: 'На терминале выдачи СДЭК', time: '—', done: false },
      { title: 'Доставлен получателю', time: '—', done: false }
    ]
  },
  { id: 'ЗК-141', supplier: 'ИП Краснов А.В.', title: 'Листовой металл 2мм', qty: 200, amount: 67500, status: 'Доставлен', tracker: 'ПЭК #PK-98711', paid: 67500, timeline: [] },
  { id: 'ЗК-138', supplier: 'ЗАО Крепёж-Опт', title: 'Кабель ВВГнг 3×2.5', qty: 1000, amount: 310000, status: 'Оплачен', tracker: 'Деловые Линии #DL-4488', paid: 310000, timeline: [] }
];

const INITIAL_CHAT = [
  {
    name: 'ООО Метиз-Про',
    avatar: 'М',
    lastMsg: 'Подтверждаем отгрузку партии',
    messages: [
      { sender: 'them', text: 'Добрый день! Подтверждаем готовность выполнить вашу закупку #ЗП-089. Болты М8×30 в наличии на складе.', time: '14:23' },
      { sender: 'me', text: 'Отлично! Уточните, возможна ли доставка до 16 июля?', time: '14:31' },
      { sender: 'them', text: 'Да, при оформлении заказа сегодня доставка СДЭК будет 15-16 июля. Прикрепляю накладную.', time: '14:35' },
      { sender: 'me', text: 'Принято. Выбираем вас победителем закупки. Ожидайте подтверждение системы.', time: '14:40' }
    ]
  },
  {
    name: 'ИП Краснов А.В.',
    avatar: 'К',
    lastMsg: 'Можем снизить цену при объёме...',
    messages: [
      { sender: 'them', text: 'Здравствуйте. Готовы предложить скидку 5% при заказе от 20000 шт.', time: '11:02' }
    ]
  },
  {
    name: 'ЗАО Крепёж-Опт',
    avatar: 'З',
    lastMsg: 'Добрый день! Уточните сроки...',
    messages: [
      { sender: 'them', text: 'Добрый день! Уточните сроки проведения тендера?', time: '09:15' }
    ]
  }
];

export default function App() {
  const [role, setRole] = useState('buyer'); // buyer | supplier | admin
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authTab, setAuthTab] = useState('login'); // login | reg
  const [page, setPage] = useState('dashboard');
  const [toast, setToast] = useState(null);
  const [notifOpen, setNotifOpen] = useState(false);

  // App core state
  const [procurements, setProcurements] = useState(INITIAL_PROCUREMENTS);
  const [catalog, setCatalog] = useState(INITIAL_CATALOG);
  const [orders, setOrders] = useState(INITIAL_ORDERS);
  const [chats, setChats] = useState(INITIAL_CHAT);
  const [activeChat, setActiveChat] = useState(0);

  // Forms and Modals
  const [modalOpen, setModalOpen] = useState(null); // 'new-proc' | 'new-product' | 'excel-upload' | 'pay' | null
  const [newProcName, setNewProcName] = useState('');
  const [newProcCategory, setNewProcCategory] = useState('Крепёж');
  const [newProcQty, setNewProcQty] = useState('');
  const [newProcUnit, setNewProcUnit] = useState('шт');
  const [newProcDate, setNewProcDate] = useState('');
  const [newProcSku, setNewProcSku] = useState('');
  const [newProcDesc, setNewProcDesc] = useState('');

  const [newProdName, setNewProdName] = useState('');
  const [newProdSku, setNewProdSku] = useState('');
  const [newProdPrice, setNewProdPrice] = useState('');
  const [newProdUnit, setNewProdUnit] = useState('шт');
  const [newProdMin, setNewProdMin] = useState('');
  const [newProdTerm, setNewProdTerm] = useState('');
  const [newProdCategory, setNewProdCategory] = useState('Крепёж');

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('Все');
  const [filterTab, setFilterTab] = useState('Все');

  // Company registration check mock
  const [innInput, setInnInput] = useState('');
  const [innCompany, setInnCompany] = useState(null);

  // Calculator
  const [cost1, setCost1] = useState(15000);
  const [cost2, setCost2] = useState(8000);
  const [cost3, setCost3] = useState(3200);
  const [cost4, setCost4] = useState(1200);
  const [cost5, setCost5] = useState(2500);
  const [profitPct, setProfitPct] = useState(25);

  // Admin section: pending approvals
  const [adminUsers, setAdminUsers] = useState([
    { name: 'ООО Метиз-Про', inn: '7707083893', role: 'Поставщик', deals: 340, status: 'Активен' },
    { name: 'АО Промстрой', inn: '5045017616', role: 'Покупатель', deals: 42, status: 'Активен' },
    { name: 'ИП Краснов А.В.', inn: '504501761600', role: 'Поставщик', deals: 87, status: 'На проверке' },
    { name: 'ООО РосМет', inn: '7734023912', role: 'Поставщик', deals: 12, status: 'Заблокирован' }
  ]);

  // Chat input
  const [msgText, setMsgText] = useState('');

  // Auto notification generator
  const [notifs, setNotifs] = useState([
    { id: 1, icon: '✅', title: 'Новое предложение получено', text: 'ООО Метиз-Про · 2 мин назад' },
    { id: 2, icon: '💬', title: 'Новое сообщение в чате', text: 'Закупка #ЗП-089 · 14 мин назад' },
    { id: 3, icon: '📦', title: 'Заказ #ЗК-145 отгружен', text: 'СДЭК · накладная прикреплена · 1 ч назад' }
  ]);

  // Show toast utility
  const triggerToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  // INN Auto-fill simulation
  const handleInnChange = (val) => {
    setInnInput(val);
    if (val.length >= 10) {
      setInnCompany({
        name: 'ООО «Металлинвест»',
        ogrn: '1027700229502',
        address: 'г. Москва, ул. Промышленная, 14',
        director: 'Петров Александр Владимирович',
        status: 'Действующее'
      });
    } else {
      setInnCompany(null);
    }
  };

  // Switch Auth Role
  const selectAuthRole = (r) => {
    setRole(r);
  };

  // Confirm Auth
  const handleAuth = (e) => {
    e.preventDefault();
    setIsLoggedIn(true);
    setPage('dashboard');
    triggerToast(`Вход выполнен в качестве роли: ${role === 'buyer' ? 'Покупатель' : role === 'supplier' ? 'Поставщик' : 'Администратор'}`);
  };

  // Switch Page Router
  const navigate = (target) => {
    setPage(target);
    setNotifOpen(false);
  };

  // Create procurement request
  const handleAddProcurement = () => {
    if (!newProcName) return;
    const newProc = {
      id: `ЗП-${Math.floor(Math.random() * 900 + 100)}`,
      title: newProcName,
      category: newProcCategory,
      qty: parseFloat(newProcQty) || 1,
      unit: newProcUnit,
      bidsCount: 0,
      dateEnd: newProcDate || '2026-07-25',
      status: 'Активна'
    };
    setProcurements([newProc, ...procurements]);
    setNewProcName('');
    setNewProcQty('');
    setNewProcSku('');
    setNewProcDesc('');
    setModalOpen(null);

    // Auto notification simulation: another supplier responds
    triggerToast('✅ Закупка опубликована! Подходящие поставщики уведомлены автоматически.');
    setTimeout(() => {
      setNotifs(prev => [
        { id: Date.now(), icon: '⚡', title: 'Получен авто-отклик!', text: `ООО Метиз-Про предложил цену по закупке "${newProc.title}"` },
        ...prev
      ]);
    }, 4000);
  };

  // Add catalog item
  const handleAddProduct = () => {
    if (!newProdName || !newProdPrice) return;
    const newItem = {
      id: Date.now(),
      title: newProdName,
      sku: newProdSku || `SKU-${Math.floor(Math.random() * 90000 + 10000)}`,
      category: newProdCategory,
      price: parseFloat(newProdPrice),
      unit: newProdUnit,
      minQty: parseFloat(newProdMin) || 100,
      term: parseFloat(newProdTerm) || 3,
      icon: '📦'
    };
    setCatalog([newItem, ...catalog]);
    setNewProdName('');
    setNewProdSku('');
    setNewProdPrice('');
    setNewProdMin('');
    setNewProdTerm('');
    setModalOpen(null);
    triggerToast('✅ Новый товар добавлен в каталог');
  };

  // Excel drag and drop import mock
  const handleExcelDrop = (e) => {
    e.preventDefault();
    triggerToast('⌛ Файл Excel загружается... Выполняется автоматический разбор каталога и SKU.');
    setTimeout(() => {
      const mockImported = [
        { id: 201, title: 'Гайка оцинкованная М8', sku: 'NUT-M8-ZP', category: 'Крепёж', price: 1.1, unit: 'шт', minQty: 5000, term: 2, icon: '🔩' },
        { id: 202, title: 'Шайба плоская 8мм', sku: 'WSH-8-ZP', category: 'Крепёж', price: 0.4, unit: 'шт', minQty: 10000, term: 1, icon: '🔩' }
      ];
      setCatalog(prev => [...mockImported, ...prev]);
      triggerToast('✅ Успешно импортировано 2 новых товара из Excel!');
    }, 1500);
  };

  // Send message in chat
  const handleSendMsg = () => {
    if (!msgText.trim()) return;
    const updatedChats = [...chats];
    const targetChat = updatedChats[activeChat];
    targetChat.messages.push({
      sender: 'me',
      text: msgText,
      time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
    });
    targetChat.lastMsg = msgText;
    setChats(updatedChats);
    setMsgText('');

    // Simulated quick supplier reply
    setTimeout(() => {
      const replyingChats = [...chats];
      replyingChats[activeChat].messages.push({
        sender: 'them',
        text: 'Спасибо, мы приняли информацию. Счёт и спецификация будут подготовлены в ближайшее время.',
        time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
      });
      replyingChats[activeChat].lastMsg = 'Счёт и спецификация будут подготовлены...';
      setChats(replyingChats);
    }, 1500);
  };

  // Choose Offer Winner
  const handleSelectWinner = (supplierName) => {
    triggerToast(`🏆 Поздравляем! Победителем закупки выбран ${supplierName}. Создан заказ.`);
    const newOrder = {
      id: `ЗК-${Math.floor(Math.random() * 100 + 150)}`,
      supplier: supplierName,
      title: 'Крепёж М8×30 DIN 933',
      qty: 10000,
      amount: 36800,
      status: 'Черновик',
      tracker: 'Не назначен',
      paid: 0,
      timeline: [
        { title: 'Заказ создан', time: 'Только что', done: true, active: true },
        { title: 'Оплата аванса/счета', time: '—', done: false },
        { title: 'Передано в производство', time: '—', done: false },
        { title: 'Отправлено покупателю', time: '—', done: false }
      ]
    };
    setOrders([newOrder, ...orders]);
    setTimeout(() => navigate('orders'), 1000);
  };

  // Calculator calculations
  const totalCost = cost1 + cost2 + cost3 + cost4 + cost5;
  const recommendedPrice = Math.round(totalCost * (1 + profitPct / 100));

  // Switch role directly (convenience for demo evaluation)
  const toggleDemoRole = (newRole) => {
    setRole(newRole);
    setPage('dashboard');
    triggerToast(`Режим демо переключен на: ${newRole === 'buyer' ? 'Покупатель' : newRole === 'supplier' ? 'Поставщик' : 'Администратор'}`);
  };

  // Render navigation buttons depending on active role
  const getNavLinks = () => {
    if (role === 'buyer') {
      return [
        { id: 'dashboard', label: 'Дашборд' },
        { id: 'procurements', label: 'Мои закупки' },
        { id: 'compare', label: 'Сравнение' },
        { id: 'orders', label: 'Заказы и ЭДО' },
        { id: 'catalog', label: 'Каталог поставщиков' },
        { id: 'chat', label: 'Чат' },
        { id: 'analytics', label: 'Аналитика рынка' }
      ];
    } else if (role === 'supplier') {
      return [
        { id: 'dashboard', label: 'Дашборд' },
        { id: 'catalog', label: 'Мой каталог' },
        { id: 'procurements', label: 'Активные закупки' },
        { id: 'orders', label: 'Заказы в работе' },
        { id: 'profile', label: 'Профиль компании' },
        { id: 'chat', label: 'Чат с покупателями' },
        { id: 'analytics', label: 'Калькулятор цен' }
      ];
    } else {
      return [
        { id: 'dashboard', label: 'Дашборд' },
        { id: 'admin', label: 'Панель модератора' },
        { id: 'analytics', label: 'Аналитика и Тарифы' },
        { id: 'chat', label: 'Обращения клиентов' }
      ];
    }
  };

  // Render auth view
  if (!isLoggedIn) {
    return (
      <div className="auth-container">
        <div className="auth-box glass">
          <div className="logo" style={{ marginBottom: '32px', justifyContent: 'center' }}>
            <div className="logo-icon">📦</div>
            <span>TradePro</span>
          </div>

          <div className="auth-tabs">
            <button
              className={`auth-tab ${authTab === 'login' ? 'active' : ''}`}
              onClick={() => setAuthTab('login')}
            >
              Вход
            </button>
            <button
              className={`auth-tab ${authTab === 'reg' ? 'active' : ''}`}
              onClick={() => setAuthTab('reg')}
            >
              Регистрация
            </button>
          </div>

          {authTab === 'login' ? (
            <form onSubmit={handleAuth}>
              <div className="form-group">
                <label className="form-label">Email / Электронная почта</label>
                <input type="email" placeholder="example@company.ru" defaultValue="demo@tradepro.ru" required />
              </div>
              <div className="form-group">
                <label className="form-label">Пароль</label>
                <input type="password" placeholder="••••••••" defaultValue="password123" required />
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label className="form-label" style={{ marginBottom: '10px' }}>Выберите демонстрационный доступ:</label>
                <div className="role-grid">
                  <div
                    className={`role-option ${role === 'buyer' ? 'active' : ''}`}
                    onClick={() => selectAuthRole('buyer')}
                  >
                    <div className="role-icon">🛒</div>
                    <div className="role-label">Покупатель</div>
                  </div>
                  <div
                    className={`role-option ${role === 'supplier' ? 'active' : ''}`}
                    onClick={() => selectAuthRole('supplier')}
                  >
                    <div className="role-icon">🏭</div>
                    <div className="role-label">Поставщик</div>
                  </div>
                  <div
                    className={`role-option ${role === 'admin' ? 'active' : ''}`}
                    onClick={() => selectAuthRole('admin')}
                  >
                    <div className="role-icon">⚙️</div>
                    <div className="role-label">Админ</div>
                  </div>
                </div>
              </div>

              <button type="submit" className="btn btn-accent" style={{ width: '100%' }}>
                Войти в систему
              </button>
              <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '12px', color: 'var(--text-muted)' }}>
                🔑 Нажмите «Войти в систему» для входа в демо-режим.
              </div>
            </form>
          ) : (
            <form onSubmit={handleAuth}>
              <div className="form-group">
                <label className="form-label">ИНН Компании (введите 10 цифр для демо проверки)</label>
                <input
                  type="text"
                  placeholder="7707083893"
                  value={innInput}
                  onChange={(e) => handleInnChange(e.target.value)}
                  maxLength={12}
                />
              </div>

              {innCompany && (
                <div style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)', padding: '14px', borderRadius: '8px', fontSize: '13px', marginBottom: '18px' }}>
                  <div style={{ color: 'var(--green)', fontWeight: 'bold', marginBottom: '4px' }}>✓ Компания верифицирована (ФНС / DaData)</div>
                  <div><strong>Название:</strong> {innCompany.name}</div>
                  <div><strong>Адрес:</strong> {innCompany.address}</div>
                  <div><strong>Директор:</strong> {innCompany.director}</div>
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Email для связи</label>
                <input type="email" placeholder="client@firm.ru" required />
              </div>
              <div className="form-group">
                <label className="form-label">Телефон подтверждения</label>
                <input type="tel" placeholder="+7 (999) 000-00-00" required />
              </div>
              <div className="form-group">
                <label className="form-label">Пароль</label>
                <input type="password" placeholder="Минимум 8 символов" required />
              </div>

              <button type="submit" className="btn btn-accent" style={{ width: '100%' }}>
                Создать B2B-кабинет
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      {/* --- TOP BAR --- */}
      <header className="topbar glass">
        <div className="topbar-left">
          <div className="logo" style={{ cursor: 'pointer' }} onClick={() => navigate('dashboard')}>
            <div className="logo-icon">📦</div>
            <span>TradePro</span>
          </div>
          <nav className="topbar-nav">
            {getNavLinks().map((link) => (
              <button
                key={link.id}
                className={`nav-btn ${page === link.id ? 'active' : ''}`}
                onClick={() => navigate(link.id)}
              >
                {link.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="topbar-right">
          {/* Demo Quick Role Switcher */}
          <div style={{ display: 'flex', gap: '4px', background: 'rgba(255,255,255,0.03)', padding: '3px', borderRadius: '8px' }}>
            <button className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: '11px' }} onClick={() => toggleDemoRole('buyer')}>Купить</button>
            <button className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: '11px' }} onClick={() => toggleDemoRole('supplier')}>Продать</button>
            <button className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: '11px' }} onClick={() => toggleDemoRole('admin')}>Админ</button>
          </div>

          <div style={{ position: 'relative' }}>
            <button className="btn btn-ghost" style={{ padding: '8px' }} onClick={() => setNotifOpen(!notifOpen)}>
              🔔 <span style={{ background: 'var(--red)', borderRadius: '50%', width: '6px', height: '6px', display: 'inline-block', position: 'relative', top: '-6px' }}></span>
            </button>
            {notifOpen && (
              <div className="glass" style={{ position: 'absolute', right: 0, top: '44px', width: '320px', borderRadius: '12px', border: '1px solid var(--border)', zIndex: 500, overflow: 'hidden' }}>
                <div style={{ padding: '14px', borderBottom: '1px solid var(--border)', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Уведомления</span>
                  <span style={{ fontSize: '11px', color: 'var(--accent)', cursor: 'pointer' }} onClick={() => setNotifs([])}>Очистить</span>
                </div>
                <div>
                  {notifs.length === 0 ? (
                    <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>Нет новых уведомлений</div>
                  ) : (
                    notifs.map((n) => (
                      <div key={n.id} style={{ display: 'flex', gap: '10px', padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)', cursor: 'pointer' }}>
                        <span style={{ fontSize: '18px' }}>{n.icon}</span>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: '600' }}>{n.title}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{n.text}</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span className={`badge ${role === 'buyer' ? 'badge-green' : role === 'supplier' ? 'badge-blue' : 'badge-purple'}`}>
              {role === 'buyer' ? 'Покупатель' : role === 'supplier' ? 'Поставщик' : 'Администратор'}
            </span>
            <div className="avatar-placeholder" style={{ cursor: 'pointer' }} onClick={() => setIsLoggedIn(false)} title="Нажмите для выхода">
              {role === 'buyer' ? 'ИИ' : role === 'supplier' ? 'МП' : 'АД'}
            </div>
          </div>
        </div>
      </header>

      {/* --- PAGE MAIN CONTAINER --- */}
      <main className="page-container">

        {/* ================================================================
            PAGE: DASHBOARD
        ================================================================ */}
        {page === 'dashboard' && (
          <div>
            <div className="page-header">
              <div>
                <h1 className="page-title">{role === 'buyer' ? 'Панель управления закупками' : role === 'supplier' ? 'Панель поставщика' : 'Управление платформой'}</h1>
                <p className="page-subtitle">Добро пожаловать в B2B TradePro. Вот ключевые показатели компании за текущую неделю.</p>
              </div>
              {role === 'buyer' && (
                <button className="btn btn-accent" onClick={() => setModalOpen('new-proc')}>
                  + Опубликовать закупку
                </button>
              )}
              {role === 'supplier' && (
                <button className="btn btn-accent" onClick={() => setModalOpen('new-product')}>
                  + Разместить товар
                </button>
              )}
            </div>

            {/* Stat widgets */}
            <div className="grid-4">
              {role === 'buyer' ? (
                <>
                  <div className="stat-card glass">
                    <div className="stat-label">Активные закупки</div>
                    <div className="stat-value">12</div>
                    <div className="stat-trend trend-up">↑ 3 за сегодня</div>
                  </div>
                  <div className="stat-card glass">
                    <div className="stat-label">Предложений получено</div>
                    <div className="stat-value">47</div>
                    <div className="stat-trend trend-up">↑ 11 за неделю</div>
                  </div>
                  <div className="stat-card glass">
                    <div className="stat-label">Заказов на исполнении</div>
                    <div className="stat-value">5</div>
                    <div className="stat-trend">2 на стадии доставки</div>
                  </div>
                  <div className="stat-card glass">
                    <div className="stat-label">Сэкономлено (бюджет)</div>
                    <div className="stat-value">84 200 ₽</div>
                    <div className="stat-trend trend-up">↑ 14.5% средняя выгода</div>
                  </div>
                </>
              ) : role === 'supplier' ? (
                <>
                  <div className="stat-card glass">
                    <div className="stat-label">Подходящие закупки</div>
                    <div className="stat-value">34</div>
                    <div className="stat-trend trend-up">↑ 8 новых сегодня</div>
                  </div>
                  <div className="stat-card glass">
                    <div className="stat-label">Отправлено КП</div>
                    <div className="stat-value">18</div>
                    <div className="stat-trend">4 в процессе сравнения</div>
                  </div>
                  <div className="stat-card glass">
                    <div className="stat-label">Заказы в производстве</div>
                    <div className="stat-value">7</div>
                    <div className="stat-trend">Общая сумма 480 000 ₽</div>
                  </div>
                  <div className="stat-card glass">
                    <div className="stat-label">Конверсия в победу</div>
                    <div className="stat-value">32%</div>
                    <div className="stat-trend trend-up">↑ 4% за месяц</div>
                  </div>
                </>
              ) : (
                <>
                  <div className="stat-card glass">
                    <div className="stat-label">Всего верифицировано</div>
                    <div className="stat-value">1 842 компании</div>
                    <div className="stat-trend trend-up">↑ 14 за сегодня</div>
                  </div>
                  <div className="stat-card glass">
                    <div className="stat-label">Активные торги</div>
                    <div className="stat-value">247 лотов</div>
                    <div className="stat-trend trend-up">Оборот 4.2 млн ₽</div>
                  </div>
                  <div className="stat-card glass">
                    <div className="stat-label">Жалобы / Модерация</div>
                    <div className="stat-value" style={{ color: 'var(--yellow)' }}>18</div>
                    <div className="stat-trend">требуют решения</div>
                  </div>
                  <div className="stat-card glass">
                    <div className="stat-label">Загрузка серверов API</div>
                    <div className="stat-value" style={{ color: 'var(--green)' }}>99.98%</div>
                    <div className="stat-trend">Отказов нет</div>
                  </div>
                </>
              )}
            </div>

            {/* Sub-tables / Widgets */}
            <div className="grid-2">
              <div className="data-card glass">
                <div className="card-header">
                  <div className="card-title">Текущие B2B закупки на платформе</div>
                  <button className="btn btn-ghost btn-sm" onClick={() => navigate('procurements')}>Все закупки</button>
                </div>
                <div className="table-responsive">
                  <table>
                    <thead>
                      <tr>
                        <th>Название</th>
                        <th>Кол-во</th>
                        <th>Срок</th>
                        <th>Статус</th>
                      </tr>
                    </thead>
                    <tbody>
                      {procurements.slice(0, 3).map((p) => (
                        <tr key={p.id}>
                          <td><strong>{p.title}</strong></td>
                          <td>{p.qty} {p.unit}</td>
                          <td>{p.dateEnd}</td>
                          <td>
                            <span className={`badge ${p.status === 'Активна' ? 'badge-green' : p.status === 'Сравнение' ? 'badge-yellow' : 'badge-gray'}`}>
                              {p.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="data-card glass">
                <div className="card-header">
                  <div className="card-title">Активные заказы & Статус логистики</div>
                  <button className="btn btn-ghost btn-sm" onClick={() => navigate('orders')}>Все заказы</button>
                </div>
                <div className="table-responsive">
                  <table>
                    <thead>
                      <tr>
                        <th>Заказ</th>
                        <th>Сумма</th>
                        <th>Служба</th>
                        <th>Статус</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.slice(0, 3).map((o) => (
                        <tr key={o.id}>
                          <td><strong>{o.id}</strong> <br /> <small style={{ color: 'var(--text-muted)' }}>{o.supplier}</small></td>
                          <td>{o.amount.toLocaleString()} ₽</td>
                          <td>СДЭК / ПЭК</td>
                          <td>
                            <span className={`badge ${o.status === 'В пути' ? 'badge-blue' : o.status === 'Доставлен' ? 'badge-green' : 'badge-yellow'}`}>
                              {o.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Sales Volume Chart */}
            <div className="data-card glass">
              <div className="card-header">
                <div className="card-title">Динамика цен и объема сделок (тыс. ₽)</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Аналитика за последние 6 месяцев</div>
              </div>
              <div style={{ padding: '24px' }}>
                <div className="bar-chart">
                  {[
                    { label: 'Янв', val: 320 },
                    { label: 'Фев', val: 410 },
                    { label: 'Мар', val: 380 },
                    { label: 'Апр', val: 490 },
                    { label: 'Май', val: 420 },
                    { label: 'Июн', val: 580 }
                  ].map((item, idx) => {
                    const pct = (item.val / 600) * 100;
                    return (
                      <div key={idx} className="bar-container">
                        <div className="chart-bar-fill" style={{ height: `${pct}%` }}>
                          <span className="chart-tooltip">{item.val}k</span>
                        </div>
                        <span className="chart-axis-label">{item.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================
            PAGE: PROCUREMENTS
        ================================================================ */}
        {page === 'procurements' && (
          <div>
            <div className="page-header">
              <div>
                <h1 className="page-title">Коммерческие закупки на тендере</h1>
                <p className="page-subtitle">Актуальные лоты от покупателей. Отправляйте коммерческие предложения напрямую.</p>
              </div>
              {role === 'buyer' && (
                <button className="btn btn-accent" onClick={() => setModalOpen('new-proc')}>
                  + Создать закупку
                </button>
              )}
            </div>

            {/* Filter Bar */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', alignItems: 'center' }}>
              <input
                type="text"
                placeholder="🔍  Поиск по названию лота, SKU..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ flex: 1 }}
              />
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                style={{ width: '220px' }}
              >
                <option value="Все">Все категории</option>
                <option value="Крепёж">Крепёж</option>
                <option value="Трубы">Трубы</option>
                <option value="Металлопрокат">Металлопрокат</option>
                <option value="Электрика">Электрика</option>
              </select>
            </div>

            <div className="filter-tabs">
              {['Все', 'Активные', 'На сравнении', 'Завершенные'].map((tab) => (
                <button
                  key={tab}
                  className={`filter-tab ${filterTab === tab ? 'active' : ''}`}
                  onClick={() => setFilterTab(tab)}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* List Table */}
            <div className="data-card glass">
              <div className="table-responsive">
                <table>
                  <thead>
                    <tr>
                      <th>Номер</th>
                      <th>Название лота</th>
                      <th>Категория</th>
                      <th>Объем партии</th>
                      <th>Количество откликов</th>
                      <th>Крайний срок</th>
                      <th>Статус</th>
                      <th>Действие</th>
                    </tr>
                  </thead>
                  <tbody>
                    {procurements
                      .filter(p => {
                        const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase());
                        const matchesCat = categoryFilter === 'Все' || p.category === categoryFilter;
                        
                        let matchesTab = true;
                        if (filterTab === 'Активные') matchesTab = p.status === 'Активна';
                        else if (filterTab === 'На сравнении') matchesTab = p.status === 'Сравнение';
                        else if (filterTab === 'Завершенные') matchesTab = p.status === 'Завершена';

                        return matchesSearch && matchesCat && matchesTab;
                      })
                      .map((p) => (
                        <tr key={p.id}>
                          <td style={{ color: 'var(--text-muted)' }}>{p.id}</td>
                          <td><strong>{p.title}</strong></td>
                          <td>{p.category}</td>
                          <td>{p.qty} {p.unit}</td>
                          <td>{p.bidsCount} предл.</td>
                          <td>{p.dateEnd}</td>
                          <td>
                            <span className={`badge ${p.status === 'Активна' ? 'badge-green' : p.status === 'Сравнение' ? 'badge-yellow' : 'badge-gray'}`}>
                              {p.status}
                            </span>
                          </td>
                          <td>
                            {role === 'buyer' && p.status === 'Сравнение' ? (
                              <button className="btn btn-accent btn-sm" onClick={() => navigate('compare')}>
                                Сравнить →
                              </button>
                            ) : role === 'supplier' ? (
                              <button className="btn btn-ghost btn-sm" onClick={() => {
                                triggerToast(`Отклик отправлен на лот ${p.id}. Напишите покупателю в чат.`);
                                navigate('chat');
                              }}>
                                Откликнуться
                              </button>
                            ) : (
                              <button className="btn btn-ghost btn-sm" onClick={() => navigate('compare')}>
                                Просмотр
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================
            PAGE: COMPARE (AUTOMATIC OFFER COMPARISON & SCORING)
        ================================================================ */}
        {page === 'compare' && (
          <div>
            <div className="page-header">
              <div>
                <h1 className="page-title">Сравнение коммерческих предложений</h1>
                <p className="page-subtitle">Автоматическое сравнение предложений поставщиков по цене, доставке и срокам производства.</p>
              </div>
              <button className="btn btn-ghost" onClick={() => navigate('procurements')}>
                ← Вернуться в закупки
              </button>
            </div>

            <div style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.15)', padding: '16px', borderRadius: '12px', fontSize: '13.5px', color: 'var(--text)', marginBottom: '24px' }}>
              📊 <strong>Интеллектуальная оценка:</strong> Система автоматически сформировала сводный отчет. Победитель по наименьшей стоимости за единицу, оптимальной логистике и высокой надежности поставщика выделен синим.
            </div>

            {/* Comparison Grid */}
            <div className="compare-container glass">
              <div className="compare-grid">
                {/* Headers */}
                <div className="comp-header">Параметры закупки</div>
                <div className="comp-header highlight">
                  🏆 ООО «Метиз-Про»
                  <div style={{ fontSize: '12px', color: 'var(--green)', marginTop: '4px' }}>Рекомендуемый · 4.9 ★</div>
                </div>
                <div className="comp-header">ИП Краснов А.В.
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Надежный · 4.5 ★</div>
                </div>
                <div className="comp-header">ЗАО «Крепёж-Опт»
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Обычный · 4.2 ★</div>
                </div>

                {/* Row: Price */}
                <div className="comp-cell comp-label">Цена за ед.</div>
                <div className="comp-cell highlight" style={{ color: 'var(--green)', fontWeight: 'bold' }}>3.20 ₽</div>
                <div className="comp-cell">3.75 ₽</div>
                <div className="comp-cell">3.50 ₽</div>

                {/* Row: Shipping Cost */}
                <div className="comp-cell comp-label">Стоимость доставки</div>
                <div className="comp-cell highlight">4 800 ₽</div>
                <div className="comp-cell" style={{ color: 'var(--green)' }}>3 200 ₽ (Скидка)</div>
                <div className="comp-cell">5 500 ₽</div>

                {/* Row: Production Time */}
                <div className="comp-cell comp-label">Срок производства</div>
                <div className="comp-cell highlight">3 рабочих дня</div>
                <div className="comp-cell">5 рабочих дней</div>
                <div className="comp-cell">7 рабочих дней</div>

                {/* Row: Delivery Time */}
                <div className="comp-cell comp-label">Срок доставки</div>
                <div className="comp-cell highlight">2 дня (СДЭК)</div>
                <div className="comp-cell">3 дня (Деловые линии)</div>
                <div className="comp-cell">5 дней (ПЭК)</div>

                {/* Row: Payment Terms */}
                <div className="comp-cell comp-label">Условия оплаты</div>
                <div className="comp-cell highlight">Аванс 50% / Постоплата 50%</div>
                <div className="comp-cell">Постоплата 30 дней</div>
                <div className="comp-cell">Предоплата 100%</div>

                {/* Row: Total */}
                <div className="comp-cell comp-label">Итого с доставкой</div>
                <div className="comp-cell highlight" style={{ fontWeight: 'bold', fontSize: '16px', color: 'var(--accent)' }}>36 800 ₽</div>
                <div className="comp-cell" style={{ fontWeight: 'bold' }}>40 700 ₽</div>
                <div className="comp-cell" style={{ fontWeight: 'bold' }}>40 500 ₽</div>

                {/* Row: Supplier Score */}
                <div className="comp-cell comp-label">Рейтинг сделок</div>
                <div className="comp-cell highlight">★ 4.9 (340 сделок)</div>
                <div className="comp-cell">★ 4.5 (87 сделок)</div>
                <div className="comp-cell">★ 4.2 (12 сделок)</div>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '14px' }}>
              <button className="btn btn-accent" onClick={() => handleSelectWinner('ООО Метиз-Про')}>
                Выбрать победителя — ООО «Метиз-Про»
              </button>
              <button className="btn btn-ghost" onClick={() => navigate('chat')}>
                💬 Обсудить условия в чате
              </button>
            </div>
          </div>
        )}

        {/* ================================================================
            PAGE: ORDERS & LOGISTICS / E-SIGN & DOCUMENTS
        ================================================================ */}
        {page === 'orders' && (
          <div>
            <div className="page-header">
              <div>
                <h1 className="page-title">Сделки, Логистика и Документы (ЭДО)</h1>
                <p className="page-subtitle">Электронный документооборот, автоматическая генерация счетов и онлайн-подписание договора.</p>
              </div>
            </div>

            {orders.map((o) => (
              <div key={o.id} className="data-card glass" style={{ marginBottom: '24px', padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '16px', marginBottom: '20px' }}>
                  <div>
                    <h3 style={{ fontSize: '18px', fontWeight: '800' }}>Сделка #{o.id}</h3>
                    <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Поставщик: <strong>{o.supplier}</strong> · Объём: {o.qty.toLocaleString()} шт</span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--accent)' }}>{o.amount.toLocaleString()} ₽</div>
                    <span className={`badge ${o.status === 'В пути' ? 'badge-blue' : o.status === 'Доставлен' ? 'badge-green' : 'badge-yellow'}`}>
                      {o.status}
                    </span>
                  </div>
                </div>

                <div className="grid-2">
                  {/* Logistics timeline */}
                  <div>
                    <h4 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '16px' }}>📍 Логистика и отслеживание доставки</h4>
                    {o.tracker === 'Не назначен' ? (
                      <div style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
                        Ожидает подтверждения и выпуска накладных в СДЭК/ПЭК через Open API.
                      </div>
                    ) : (
                      <div className="timeline">
                        <div className="timeline-item">
                          <div className="timeline-node done">✓</div>
                          <div className="timeline-content">
                            <div className="timeline-title">Заказ сформирован и оплачен аванс</div>
                            <div className="timeline-time">14.07.2026, 09:12</div>
                          </div>
                        </div>
                        <div className="timeline-item">
                          <div className="timeline-node done">✓</div>
                          <div className="timeline-content">
                            <div className="timeline-title">Принят к доставке логистической компанией</div>
                            <div className="timeline-time">14.07.2026, 15:40</div>
                          </div>
                        </div>
                        <div className="timeline-item">
                          <div className="timeline-node active">🚚</div>
                          <div className="timeline-content">
                            <div className="timeline-title">В пути (Транзит терминал СДЭК)</div>
                            <div className="timeline-time">Плановая дата выдачи: завтра</div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Documents & Invoicing */}
                  <div>
                    <h4 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '16px' }}>📄 Документы ЭДО и оплата</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '18px' }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => triggerToast('Загрузка сгенерированного Счёта в формате PDF...')}>
                        📄 Счёт на оплату (.PDF)
                      </button>
                      <button className="btn btn-ghost btn-sm" onClick={() => triggerToast('Загрузка Договора поставки с факсимиле...')}>
                        📋 Договор (.PDF)
                      </button>
                      <button className="btn btn-ghost btn-sm" onClick={() => triggerToast('Загрузка УПД (Универсальный документ)...')}>
                        🧾 УПД (.PDF)
                      </button>
                      <button className="btn btn-green btn-sm" onClick={() => triggerToast('Подписание документа квалифицированной подписью (ЭЦП) выполнено.')}>
                        🔏 Подписать договор ЭЦП
                      </button>
                    </div>

                    <div style={{ background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                        <span>Оплачено по сделке:</span>
                        <strong>{o.paid.toLocaleString()} ₽ / {o.amount.toLocaleString()} ₽</strong>
                      </div>
                      <div style={{ height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${(o.paid / o.amount) * 100}%`, background: 'var(--green)' }}></div>
                      </div>
                      {o.paid < o.amount && (
                        <button
                          className="btn btn-accent btn-sm"
                          style={{ width: '100%', marginTop: '12px' }}
                          onClick={() => {
                            setNewProcQty(o.amount - o.paid);
                            setNewProcName(o.id);
                            setModalOpen('pay');
                          }}
                        >
                          Оплатить остаток через ЮMoney
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ================================================================
            PAGE: CATALOG (SUPPLIER CATALOG AND BUYER'S PRODUCT SEARCH)
        ================================================================ */}
        {page === 'catalog' && (
          <div>
            <div className="page-header">
              <div>
                <h1 className="page-title">{role === 'buyer' ? 'Поиск товаров и поставщиков' : 'Мой каталог товаров (SKU)'}</h1>
                <p className="page-subtitle">Добавляйте товары вручную или загружайте файлы Excel/CSV для автоматического заполнения SKU.</p>
              </div>
              {role === 'supplier' && (
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button className="btn btn-ghost" onClick={() => setModalOpen('excel-upload')}>
                    📥 Загрузить Excel / CSV
                  </button>
                  <button className="btn btn-accent" onClick={() => setModalOpen('new-product')}>
                    + Новый товар
                  </button>
                </div>
              )}
            </div>

            {/* Catalog Grid */}
            <div className="catalog-grid">
              {catalog.map((item) => (
                <div key={item.id} className="catalog-item glass border">
                  <div className="catalog-img">
                    {item.icon}
                  </div>
                  <div className="catalog-body">
                    <div className="catalog-title">{item.title}</div>
                    <div className="catalog-sku">SKU: {item.sku}</div>
                    <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                      Мин. партия: {item.minQty} {item.unit}
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                      Производство: {item.term} дн.
                    </div>
                    <div className="catalog-price-row">
                      <div className="catalog-price">{item.price} ₽</div>
                      <div className="catalog-unit">/ {item.unit}</div>
                    </div>
                    {role === 'buyer' && (
                      <button
                        className="btn btn-ghost btn-sm"
                        style={{ width: '100%', marginTop: '12px' }}
                        onClick={() => {
                          triggerToast(`Запрос отправлен поставщику по SKU: ${item.sku}`);
                          navigate('chat');
                        }}
                      >
                        Запросить КП
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ================================================================
            PAGE: CHAT
        ================================================================ */}
        {page === 'chat' && (
          <div>
            <div className="page-header">
              <div>
                <h1 className="page-title">Диалоги и переписка по закупкам</h1>
                <p className="page-subtitle">Согласовывайте объёмы поставок, условия разгрузки и скидки в режиме реального времени.</p>
              </div>
            </div>

            <div className="chat-layout glass">
              <div className="chat-sidebar">
                <div className="chat-search">
                  <input type="text" placeholder="Поиск диалога..." />
                </div>
                <div className="chat-users-list">
                  {chats.map((c, idx) => (
                    <div
                      key={idx}
                      className={`chat-user-item ${activeChat === idx ? 'active' : ''}`}
                      onClick={() => setActiveChat(idx)}
                    >
                      <div className="avatar-placeholder">{c.avatar}</div>
                      <div style={{ overflow: 'hidden', flex: 1 }}>
                        <div style={{ fontWeight: 'bold', fontSize: '13px' }}>{c.name}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {c.lastMsg}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="chat-content">
                <div className="chat-header">
                  <div className="avatar-placeholder">{chats[activeChat]?.avatar}</div>
                  <div>
                    <h3 style={{ fontSize: '15px', fontWeight: 'bold' }}>{chats[activeChat]?.name}</h3>
                    <span style={{ fontSize: '11px', color: 'var(--green)' }}>● В сети</span>
                  </div>
                </div>

                <div className="chat-body">
                  {chats[activeChat]?.messages.map((m, idx) => (
                    <div
                      key={idx}
                      className={`message-bubble ${m.sender === 'me' ? 'msg-sent' : 'msg-received'}`}
                    >
                      <div>{m.text}</div>
                      <div className="msg-meta">{m.time}</div>
                    </div>
                  ))}
                </div>

                <div className="chat-footer">
                  <input
                    type="text"
                    placeholder="Введите ваше сообщение..."
                    value={msgText}
                    onChange={(e) => setMsgText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSendMsg();
                    }}
                  />
                  <button className="btn btn-accent" onClick={handleSendMsg}>
                    Отправить
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================
            PAGE: ANALYTICS & PRICING CALCULATOR
        ================================================================ */}
        {page === 'analytics' && (
          <div>
            <div className="page-header">
              <div>
                <h1 className="page-title">Инструменты Аналитики & Себестоимости</h1>
                <p className="page-subtitle">Калькулятор для расчёта рентабельности и мониторинг рыночных цен.</p>
              </div>
            </div>

            <div className="grid-2">
              {/* Cost Calculator */}
              <div className="data-card glass" style={{ padding: '24px' }}>
                <h3 className="card-title" style={{ marginBottom: '20px' }}>🏭 Калькулятор себестоимости и маржи</h3>

                <div className="form-group">
                  <label className="form-label">Стоимость сырья (₽)</label>
                  <input type="number" value={cost1} onChange={(e) => setCost1(parseFloat(e.target.value) || 0)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Расходы на производство (₽)</label>
                  <input type="number" value={cost2} onChange={(e) => setCost2(parseFloat(e.target.value) || 0)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Транспортная логистика (₽)</label>
                  <input type="number" value={cost3} onChange={(e) => setCost3(parseFloat(e.target.value) || 0)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Упаковка и тара (₽)</label>
                  <input type="number" value={cost4} onChange={(e) => setCost4(parseFloat(e.target.value) || 0)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Налоги и пошлины (₽)</label>
                  <input type="number" value={cost5} onChange={(e) => setCost5(parseFloat(e.target.value) || 0)} />
                </div>

                <div style={{ borderTop: '1px solid var(--border)', paddingTop: '18px', marginTop: '18px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px', fontWeight: 'bold', marginBottom: '12px' }}>
                    <span>Себестоимость партии:</span>
                    <span style={{ color: 'var(--accent)' }}>{totalCost.toLocaleString()} ₽</span>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Планируемая маржа (%): {profitPct}%</label>
                    <input
                      type="range"
                      min="5"
                      max="100"
                      value={profitPct}
                      onChange={(e) => setProfitPct(parseInt(e.target.value))}
                      style={{ padding: 0 }}
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '18px', fontWeight: '800', background: 'rgba(16,185,129,0.06)', padding: '16px', borderRadius: '8px', border: '1px solid rgba(16,185,129,0.2)' }}>
                    <span>Рекомендуемая цена:</span>
                    <span style={{ color: 'var(--green)' }}>{recommendedPrice.toLocaleString()} ₽</span>
                  </div>
                </div>
              </div>

              {/* Market analytics info */}
              <div className="data-card glass" style={{ padding: '24px' }}>
                <h3 className="card-title" style={{ marginBottom: '20px' }}>📈 Динамика цен на металлы</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px' }}>
                  Платформа автоматически аккумулирует цены из открытых сырьевых бирж и маркетплейсов.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                      <span>Арматура стальная (средняя цена)</span>
                      <strong>68 400 ₽/т <span style={{ color: 'var(--green)' }}>↑ 2.4%</span></strong>
                    </div>
                    <div style={{ height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px' }}>
                      <div style={{ height: '100%', width: '85%', background: 'var(--accent)' }}></div>
                    </div>
                  </div>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                      <span>Труба оцинкованная Д50</span>
                      <strong>148 ₽/м <span style={{ color: 'var(--red)' }}>↓ 0.8%</span></strong>
                    </div>
                    <div style={{ height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px' }}>
                      <div style={{ height: '100%', width: '60%', background: 'var(--accent)' }}></div>
                    </div>
                  </div>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                      <span>Болты М8 высокопрочные</span>
                      <strong>3.42 ₽/шт <span style={{ color: 'var(--green)' }}>↑ 1.2%</span></strong>
                    </div>
                    <div style={{ height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px' }}>
                      <div style={{ height: '100%', width: '70%', background: 'var(--accent)' }}></div>
                    </div>
                  </div>
                </div>

                <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: '12px', padding: '18px', marginTop: '28px', fontSize: '13px' }}>
                  <div style={{ fontWeight: 'bold', marginBottom: '6px' }}>💡 Аналитический отчет ИИ</div>
                  <span style={{ color: 'var(--text-muted)' }}>
                    Наблюдается дефицит стального крепежа в Центральном регионе. Рекомендуем законтрактовать объемы до конца месяца во избежание роста цен на 5-8%.
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================
            PAGE: SUPPLIER PUBLIC PROFILE (INTERNET SHOP SIMULATION)
        ================================================================ */}
        {page === 'profile' && (
          <div>
            <div className="page-header">
              <div>
                <h1 className="page-title">Собственная страница на платформе (B2B-Витрина)</h1>
                <p className="page-subtitle">Так выглядит профиль вашей организации для сторонних закупщиков.</p>
              </div>
            </div>

            <div className="glass" style={{ border: '1px solid var(--border)', borderRadius: '16px', padding: '32px', display: 'flex', gap: '32px', marginBottom: '32px' }}>
              <div className="avatar-placeholder" style={{ width: '90px', height: '90px', fontSize: '32px', borderRadius: '16px' }}>
                🏭
              </div>
              <div style={{ flex: 1 }}>
                <h2 style={{ fontSize: '22px', fontWeight: '800' }}>ООО «Метиз-Про»</h2>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  ИНН: 7707083893 · КПП: 770701001 · ОГРН: 1027700229502
                </p>
                <div style={{ marginTop: '12px', display: 'flex', gap: '20px' }}>
                  <div>
                    <strong style={{ fontSize: '16px', color: 'var(--green)' }}>★ 4.9</strong>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>214 отзывов</div>
                  </div>
                  <div>
                    <strong style={{ fontSize: '16px' }}>340</strong>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Завершенных сделок</div>
                  </div>
                  <div>
                    <strong style={{ fontSize: '16px' }}>7 лет</strong>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Срок работы</div>
                  </div>
                </div>
              </div>
              <div>
                <div className="badge badge-green" style={{ marginBottom: '12px' }}>Верифицирован ФНС</div>
                <button className="btn btn-ghost btn-sm" style={{ width: '100%' }} onClick={() => triggerToast('Ссылка скопирована. Вы можете отправить ее партнерам.')}>
                  🔗 Поделиться витриной
                </button>
              </div>
            </div>

            <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '18px' }}>Товарные позиции в наличии</h3>
            <div className="catalog-grid">
              {catalog.slice(0, 3).map((item) => (
                <div key={item.id} className="catalog-item glass border">
                  <div className="catalog-img">{item.icon}</div>
                  <div className="catalog-body">
                    <div className="catalog-title">{item.title}</div>
                    <div className="catalog-sku">SKU: {item.sku}</div>
                    <div className="catalog-price-row">
                      <div className="catalog-price">{item.price} ₽</div>
                      <div className="catalog-unit">/ {item.unit}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ================================================================
            PAGE: ADMIN PANEL
        ================================================================ */}
        {page === 'admin' && (
          <div>
            <div className="page-header">
              <div>
                <h1 className="page-title">Административная панель модератора</h1>
                <p className="page-subtitle">Контроль аккаунтов, проверка по ИНН и модерация предложений на рынке.</p>
              </div>
            </div>

            <div className="grid-4">
              <div className="stat-card glass">
                <div className="stat-label">Компаний на модерации</div>
                <div className="stat-value" style={{ color: 'var(--yellow)' }}>3</div>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Ожидают проверку документов</span>
              </div>
              <div className="stat-card glass">
                <div className="stat-label">Жалоб на отзывы</div>
                <div className="stat-value">2</div>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>За сутки</span>
              </div>
              <div className="stat-card glass">
                <div className="stat-label">Процент верификации</div>
                <div className="stat-value" style={{ color: 'var(--green)' }}>98.2%</div>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Через DaData / API ФНС</span>
              </div>
              <div className="stat-card glass">
                <div className="stat-label">Тарифные подписки</div>
                <div className="stat-value">412 Premium</div>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Поставщиков</span>
              </div>
            </div>

            <div className="data-card glass">
              <div className="card-header">
                <div className="card-title">Верификация юридических лиц</div>
              </div>
              <div className="table-responsive">
                <table>
                  <thead>
                    <tr>
                      <th>Название компании</th>
                      <th>ИНН</th>
                      <th>Роль</th>
                      <th>Сделок</th>
                      <th>Статус</th>
                      <th>Действия</th>
                    </tr>
                  </thead>
                  <tbody>
                    {adminUsers.map((user, idx) => (
                      <tr key={idx}>
                        <td><strong>{user.name}</strong></td>
                        <td>{user.inn}</td>
                        <td>{user.role}</td>
                        <td>{user.deals}</td>
                        <td>
                          <span className={`badge ${user.status === 'Активен' ? 'badge-green' : user.status === 'На проверке' ? 'badge-yellow' : 'badge-red'}`}>
                            {user.status}
                          </span>
                        </td>
                        <td>
                          {user.status === 'На проверке' && (
                            <div style={{ display: 'flex', gap: '6px' }}>
                              <button className="btn btn-green btn-sm" onClick={() => {
                                const copy = [...adminUsers];
                                copy[idx].status = 'Активен';
                                setAdminUsers(copy);
                                triggerToast(`Аккаунт ${user.name} одобрен.`);
                              }}>
                                Одобрить
                              </button>
                              <button className="btn btn-red btn-sm" onClick={() => {
                                const copy = [...adminUsers];
                                copy[idx].status = 'Заблокирован';
                                setAdminUsers(copy);
                              }}>
                                Отклонить
                              </button>
                            </div>
                          )}
                          {user.status === 'Активен' && (
                            <button className="btn btn-red btn-sm" onClick={() => {
                              const copy = [...adminUsers];
                              copy[idx].status = 'Заблокирован';
                              setAdminUsers(copy);
                              triggerToast(`Аккаунт ${user.name} заблокирован.`);
                            }}>
                              Блокировать
                            </button>
                          )}
                          {user.status === 'Заблокирован' && (
                            <button className="btn btn-green btn-sm" onClick={() => {
                              const copy = [...adminUsers];
                              copy[idx].status = 'Активен';
                              setAdminUsers(copy);
                              triggerToast(`Аккаунт ${user.name} разблокирован.`);
                            }}>
                              Разблокировать
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* --- TOAST POPUP --- */}
      {toast && (
        <div className="toast-msg">
          {toast}
        </div>
      )}

      {/* ================================================================
          MODAL: NEW PROCUREMENT REQUEST
      ================================================================ */}
      {modalOpen === 'new-proc' && (
        <div className="modal-overlay" onClick={() => setModalOpen(null)}>
          <div className="modal-content glass border" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">📋 Публикация закупки</h3>
              <button className="modal-close" onClick={() => setModalOpen(null)}>×</button>
            </div>
            <div className="form-group">
              <label className="form-label">Наименование закупки / требуемых товаров</label>
              <input
                type="text"
                placeholder="Напр.: Болты М8×30 DIN 933 в оцинковке"
                value={newProcName}
                onChange={(e) => setNewProcName(e.target.value)}
              />
            </div>
            <div className="grid-2" style={{ gap: '14px', marginBottom: '0' }}>
              <div className="form-group">
                <label className="form-label">Категория</label>
                <select value={newProcCategory} onChange={(e) => setNewProcCategory(e.target.value)}>
                  <option value="Крепёж">Крепёж</option>
                  <option value="Трубы">Трубы</option>
                  <option value="Металлопрокат">Металлопрокат</option>
                  <option value="Электрика">Электрика</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Желаемый SKU (если есть)</label>
                <input
                  type="text"
                  placeholder="Напр.: BLT-M8-30"
                  value={newProcSku}
                  onChange={(e) => setNewProcSku(e.target.value)}
                />
              </div>
            </div>
            <div className="grid-2" style={{ gap: '14px', marginBottom: '0' }}>
              <div className="form-group">
                <label className="form-label">Объём партии</label>
                <input
                  type="number"
                  placeholder="10000"
                  value={newProcQty}
                  onChange={(e) => setNewProcQty(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Единица измерения</label>
                <select value={newProcUnit} onChange={(e) => setNewProcUnit(e.target.value)}>
                  <option value="шт">штук (шт)</option>
                  <option value="кг">килограмм (кг)</option>
                  <option value="м">метров (м)</option>
                  <option value="лист">листов (лист)</option>
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Срок окончания приёма предложений</label>
              <input
                type="date"
                value={newProcDate}
                onChange={(e) => setNewProcDate(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Подробные технические спецификации</label>
              <textarea
                placeholder="Опишите требования ГОСТ, прочность материала, логистические особенности разгрузки..."
                value={newProcDesc}
                onChange={(e) => setNewProcDesc(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Спецификация или ТЗ (Прикрепить PDF / Word)</label>
              <div
                style={{ border: '2px dashed var(--border)', borderRadius: '8px', padding: '16px', textALign: 'center', cursor: 'pointer', fontSize: '13px', color: 'var(--text-muted)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
                onClick={() => triggerToast('Файл спецификации успешно прикреплен к лоту')}
              >
                📎 Перетащите файлы сюда или нажмите для выбора
              </div>
            </div>

            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setModalOpen(null)}>Отмена</button>
              <button className="btn btn-accent" onClick={handleAddProcurement}>Опубликовать</button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================
          MODAL: NEW PRODUCT TO CATALOG
      ================================================================ */}
      {modalOpen === 'new-product' && (
        <div className="modal-overlay" onClick={() => setModalOpen(null)}>
          <div className="modal-content glass border" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">📦 Размещение товара в каталоге</h3>
              <button className="modal-close" onClick={() => setModalOpen(null)}>×</button>
            </div>
            <div className="form-group">
              <label className="form-label">Название товара</label>
              <input
                type="text"
                placeholder="Напр.: Болт М8×30 DIN 933 высокопрочный"
                value={newProdName}
                onChange={(e) => setNewProdName(e.target.value)}
              />
            </div>
            <div className="grid-2" style={{ gap: '14px', marginBottom: '0' }}>
              <div className="form-group">
                <label className="form-label">Категория</label>
                <select value={newProdCategory} onChange={(e) => setNewProdCategory(e.target.value)}>
                  <option value="Крепёж">Крепёж</option>
                  <option value="Трубы">Трубы</option>
                  <option value="Металлопрокат">Металлопрокат</option>
                  <option value="Электрика">Электрика</option>
                  <option value="Химия">Химия</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Артикул / SKU</label>
                <input
                  type="text"
                  placeholder="BLT-M8-30-933"
                  value={newProdSku}
                  onChange={(e) => setNewProdSku(e.target.value)}
                />
              </div>
            </div>
            <div className="grid-2" style={{ gap: '14px', marginBottom: '0' }}>
              <div className="form-group">
                <label className="form-label">Цена продажи (₽)</label>
                <input
                  type="number"
                  placeholder="3.20"
                  value={newProdPrice}
                  onChange={(e) => setNewProdPrice(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Единица измерения</label>
                <select value={newProdUnit} onChange={(e) => setNewProdUnit(e.target.value)}>
                  <option value="шт">штук (шт)</option>
                  <option value="кг">килограмм (кг)</option>
                  <option value="м">метров (м)</option>
                  <option value="лист">листов (лист)</option>
                </select>
              </div>
            </div>
            <div className="grid-2" style={{ gap: '14px', marginBottom: '0' }}>
              <div className="form-group">
                <label className="form-label">Минимальная партия заказа</label>
                <input
                  type="number"
                  placeholder="1000"
                  value={newProdMin}
                  onChange={(e) => setNewProdMin(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Срок производства (дней)</label>
                <input
                  type="number"
                  placeholder="3"
                  value={newProdTerm}
                  onChange={(e) => setNewProdTerm(e.target.value)}
                />
              </div>
            </div>

            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setModalOpen(null)}>Отмена</button>
              <button className="btn btn-accent" onClick={handleAddProduct}>Добавить товар</button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================
          MODAL: EXCEL / CSV DRAG AND DROP SIMULATION
      ================================================================ */}
      {modalOpen === 'excel-upload' && (
        <div className="modal-overlay" onClick={() => setModalOpen(null)}>
          <div className="modal-content glass border" onClick={(e) => e.stopPropagation()} style={{ textAlign: 'center' }}>
            <div className="modal-header">
              <h3 className="modal-title">📥 Массовый импорт товаров (Excel / CSV)</h3>
              <button className="modal-close" onClick={() => setModalOpen(null)}>×</button>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px' }}>
              Перетащите прайс-лист Excel в область ниже. Система распознает столбцы: Название, Цена, SKU, Срок поставки.
            </p>
            <div
              style={{ border: '2px dashed var(--border)', borderRadius: '12px', padding: '48px 24px', cursor: 'pointer', transition: 'var(--transition)', background: 'rgba(255,255,255,0.01)' }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleExcelDrop}
              onClick={() => {
                triggerToast('Файл выбран. Загружаем...');
                setTimeout(() => {
                  setCatalog(prev => [
                    { id: 301, title: 'Провод медный ПВС 2×1.5', sku: 'CBL-PVS-215', category: 'Электрика', price: 42, unit: 'м', minQty: 200, term: 1, icon: '⚡' },
                    ...prev
                  ]);
                  triggerToast('✅ Успешно импортирован 1 новый товар!');
                  setModalOpen(null);
                }, 1000);
              }}
            >
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>📊</div>
              <strong>Перетащите прайс-лист Excel/CSV</strong>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px' }}>Или кликните для выбора на диске</div>
            </div>
            <div className="modal-actions" style={{ justifyContent: 'center', marginTop: '20px' }}>
              <button className="btn btn-ghost" onClick={() => setModalOpen(null)}>Отмена</button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================
          MODAL: PAYMENT BY YUMONEY SIMULATION
      ================================================================ */}
      {modalOpen === 'pay' && (
        <div className="modal-overlay" onClick={() => setModalOpen(null)}>
          <div className="modal-content glass border" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">💳 Интеграция оплаты ЮMoney</h3>
              <button className="modal-close" onClick={() => setModalOpen(null)}>×</button>
            </div>
            <p style={{ fontSize: '13.5px', color: 'var(--text-muted)', marginBottom: '18px' }}>
              Оплата по реквизитам счета сделки <strong>{newProcName}</strong> на сумму <strong>{parseFloat(newProcQty).toLocaleString()} ₽</strong>.
            </p>
            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '13px', marginBottom: '20px' }}>
              <div><strong>Получатель:</strong> ООО «Метиз-Про»</div>
              <div><strong>ИНН получателя:</strong> 7707083893</div>
              <div><strong>Банк:</strong> ПАО СБЕРБАНК</div>
              <div><strong>Расчетный счет:</strong> 40702810938000001234</div>
            </div>
            <div className="form-group">
              <label className="form-label">Выберите способ оплаты</label>
              <select defaultValue="yoomoney">
                <option value="yoomoney">ЮMoney кошелек / Карты</option>
                <option value="bank">Банковский перевод по счету (B2B)</option>
              </select>
            </div>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setModalOpen(null)}>Отмена</button>
              <button
                className="btn btn-accent"
                onClick={() => {
                  // Simulate payment verification
                  triggerToast('⌛ Соединение с сервером ЮMoney...');
                  setTimeout(() => {
                    const id = newProcName;
                    setOrders(prev => prev.map(o => {
                      if (o.id === id) {
                        return { ...o, paid: o.amount, status: 'Оплачен' };
                      }
                      return o;
                    }));
                    triggerToast('✅ Оплата подтверждена через Webhook ЮMoney! Статус изменен на "Оплачен".');
                    setModalOpen(null);
                  }, 1500);
                }}
              >
                Оплатить {parseFloat(newProcQty).toLocaleString()} ₽
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
