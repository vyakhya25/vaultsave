import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useState } from 'react';

const NavItem = ({ to, icon, label }) => (
  <NavLink
    to={to}
    className={({ isActive }) =>
      `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
        isActive
          ? 'bg-vault-500/10 text-vault-400 border border-vault-500/20'
          : 'text-dark-400 hover:text-dark-200 hover:bg-dark-800/60'
      }`
    }
  >
    <span className="text-lg">{icon}</span>
    <span className="text-sm font-medium">{label}</span>
  </NavLink>
);

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-mesh flex">
      {/* Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 min-h-screen glass-card m-3 rounded-2xl p-4 sticky top-3 h-[calc(100vh-24px)]">
        {/* Logo */}
        <div className="flex items-center gap-3 px-2 py-4 mb-6">
          <div className="w-9 h-9 rounded-xl bg-vault-500/10 border border-vault-500/20 flex items-center justify-center text-xl">
            🔐
          </div>
          <div>
            <h1 className="font-display text-lg font-bold text-white tracking-tight">VaultSave</h1>
            <p className="text-xs text-dark-500">Lock. Save. Grow.</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex flex-col gap-1 flex-1">
          <NavItem to="/dashboard" icon="⚡" label="Dashboard" />
          <NavItem to="/add-money" icon="💸" label="Add Money (GPay)" />
          <NavItem to="/vault/create" icon="🔒" label="Create Vault" />
          <NavItem to="/vaults" icon="🏦" label="My Vaults" />
          <NavItem to="/withdraw" icon="🏧" label="Withdraw to Bank" />
          <NavItem to="/transactions" icon="📋" label="Transactions" />
        </nav>

        {/* User */}
        <div className="border-t border-dark-700 pt-4 mt-4">
          <div className="px-2 mb-3">
            <p className="text-sm font-medium text-dark-200 truncate">{user?.name}</p>
            <p className="text-xs text-dark-500 truncate">{user?.email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl text-dark-400 hover:text-red-400 hover:bg-red-500/10 transition-all text-sm"
          >
            <span>🚪</span> Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 glass-card m-2 rounded-xl px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">🔐</span>
          <span className="font-display font-bold text-white">VaultSave</span>
        </div>
        <button onClick={() => setMenuOpen(!menuOpen)} className="text-dark-300 text-xl">
          {menuOpen ? '✕' : '☰'}
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-dark-950/95 backdrop-blur-lg pt-16 px-4 flex flex-col gap-2">
          {[
            { to: '/dashboard', icon: '⚡', label: 'Dashboard' },
            { to: '/add-money', icon: '💸', label: 'Add Money (GPay)' },
            { to: '/vault/create', icon: '🔒', label: 'Create Vault' },
            { to: '/vaults', icon: '🏦', label: 'My Vaults' },
            { to: '/withdraw', icon: '🏧', label: 'Withdraw to Bank' },
            { to: '/transactions', icon: '📋', label: 'Transactions' },
          ].map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setMenuOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-4 rounded-xl text-lg ${
                  isActive ? 'bg-vault-500/10 text-vault-400' : 'text-dark-300'
                }`
              }
            >
              <span>{item.icon}</span>
              <span className="font-medium">{item.label}</span>
            </NavLink>
          ))}
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-4 rounded-xl text-red-400 text-lg mt-4"
          >
            <span>🚪</span><span>Sign Out</span>
          </button>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 lg:ml-0 pt-16 lg:pt-0 min-h-screen">
        <div className="max-w-5xl mx-auto px-4 py-6 lg:py-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
