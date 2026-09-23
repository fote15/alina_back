import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Sidebar, { Topbar } from './components/Sidebar';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import RFQList from './pages/RFQList';
import RFQCreate from './pages/RFQCreate';
import RFQDetail from './pages/RFQDetail';
import Proposals from './pages/Proposals';
import Orders from './pages/Orders';
import OrderDetail from './pages/OrderDetail';
import Products from './pages/Products';
import Suppliers from './pages/Suppliers';
import SupplierDetail from './pages/SupplierDetail';
import Calculator from './pages/Calculator';
import Analytics from './pages/Analytics';
import Admin from './pages/Admin';

function AppLayout({ title }) {
  const { user, loading } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (mobileOpen) {
      document.body.classList.add('menu-open');
    } else {
      document.body.classList.remove('menu-open');
    }
    return () => document.body.classList.remove('menu-open');
  }, [mobileOpen]);

  if (loading) {
    return (
      <div className="loading-spinner" style={{ minHeight: '100vh' }}>
        <div className="spinner" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="app-layout">
      {mobileOpen && (
        <div
          className="sidebar-backdrop"
          onClick={() => setMobileOpen(false)}
          role="presentation"
        />
      )}
      <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      <div className="main-content">
        <Topbar title={title} onMenuClick={() => setMobileOpen(prev => !prev)} />
        <main className="main-body">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function PublicOnly({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/dashboard" replace />;
  return children;
}

function AdminOnly() {
  const { user } = useAuth();
  if (user?.role !== 'admin') return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<PublicOnly><Login /></PublicOnly>} />
          <Route path="/register" element={<PublicOnly><Register /></PublicOnly>} />

          <Route element={<AppLayout title="Главная" />}>
            <Route path="/dashboard" element={<Dashboard />} />
          </Route>
          <Route element={<AppLayout title="Профиль компании" />}>
            <Route path="/profile" element={<Profile />} />
          </Route>
          <Route element={<AppLayout title="Закупки" />}>
            <Route path="/rfqs" element={<RFQList />} />
            <Route path="/rfqs/create" element={<RFQCreate />} />
            <Route path="/rfqs/:id" element={<RFQDetail />} />
          </Route>
          <Route element={<AppLayout title="Предложения" />}>
            <Route path="/proposals" element={<Proposals />} />
          </Route>
          <Route element={<AppLayout title="Заказы" />}>
            <Route path="/orders" element={<Orders />} />
            <Route path="/orders/:id" element={<OrderDetail />} />
          </Route>
          <Route element={<AppLayout title="Каталог товаров" />}>
            <Route path="/products" element={<Products />} />
          </Route>
          <Route element={<AppLayout title="Поставщики" />}>
            <Route path="/suppliers" element={<Suppliers />} />
            <Route path="/suppliers/:id" element={<SupplierDetail />} />
          </Route>
          <Route element={<AppLayout title="Калькулятор себестоимости" />}>
            <Route path="/calculator" element={<Calculator />} />
          </Route>
          <Route element={<AppLayout title="Аналитика рынка" />}>
            <Route path="/analytics" element={<Analytics />} />
          </Route>
          <Route element={<AppLayout title="Администрирование" />}>
            <Route element={<AdminOnly />}>
              <Route path="/admin" element={<Admin />} />
            </Route>
          </Route>

          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
