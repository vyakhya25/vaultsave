import axios from 'axios';

const api = axios.create({
  baseURL:import.meta.env.VITE_API_URL|| '/api',
  headers: { 'Content-Type': 'application/json' },
});

// Attach token from localStorage on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('vaultsave_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth
export const registerUser = (data) => api.post('/auth/register', data);
export const loginUser = (data) => api.post('/auth/login', data);
export const getMe = () => api.get('/auth/me');

// Wallet
export const getBalance = () => api.get('/wallet/balance');
export const depositMoney = (data) => api.post('/wallet/deposit', data);

// Vault
export const createVault = (data) => api.post('/vault/create', data);
export const getAllVaults = () => api.get('/vault/all');
export const withdrawVault = (id) => api.post(`/vault/withdraw/${id}`);

// Transactions
export const getTransactions = () => api.get('/transactions');

// Payments (Razorpay)
export const getRazorpayKey = () => api.get('/payment/key');
export const createRazorpayOrder = (data) => api.post('/payment/create-order', data);
export const verifyRazorpayPayment = (data) => api.post('/payment/verify', data);
export const createPayout = (data) => api.post('/payment/payout', data);

export default api;
