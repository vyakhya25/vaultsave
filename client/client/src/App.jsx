import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import CreateVault from './pages/CreateVault';
import VaultList from './pages/VaultList';
import Transactions from './pages/Transactions';
import AddMoney from './pages/AddMoney';
import WithdrawToBank from './pages/WithdrawToBank';
import Layout from './components/Layout';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-dark-950">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-full border-2 border-vault-500 border-t-transparent animate-spin" />
        <p className="text-dark-400 text-sm">Loading VaultSave...</p>
      </div>
    </div>
  );
  return user ? children : <Navigate to="/login" replace />;
};

const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  return !user ? children : <Navigate to="/dashboard" replace />;
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
          <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="vault/create" element={<CreateVault />} />
            <Route path="vaults" element={<VaultList />} />
            <Route path="transactions" element={<Transactions />} />
            <Route path="add-money" element={<AddMoney />} />
            <Route path="withdraw" element={<WithdrawToBank />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
