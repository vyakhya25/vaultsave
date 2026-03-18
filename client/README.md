# 🔐 VaultSave — Time-Locked Savings App

A full-stack MERN application that lets users lock money into time-locked vaults and prevents withdrawal until a user-defined unlock date.

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- MongoDB (local or MongoDB Atlas)
- npm or yarn

---

## 🗂️ Project Structure

```
vaultsave/
├── server/          # Express + MongoDB API
│   ├── models/      # Mongoose models (User, Vault, Transaction)
│   ├── routes/      # API routes
│   ├── controllers/ # Business logic
│   ├── middleware/  # JWT auth middleware
│   ├── index.js     # Server entry point
│   └── .env.example
│
└── client/          # React + Vite frontend
    └── src/
        ├── pages/       # Login, Register, Dashboard, etc.
        ├── components/  # Layout, shared UI
        ├── context/     # Auth context
        └── utils/       # API client, formatters
```

---

## ⚙️ Backend Setup

```bash
cd server
npm install

# Create .env from example
cp .env.example .env
# Edit .env and set your MONGO_URI and JWT_SECRET

npm run dev   # Starts on http://localhost:5000
```

### Environment Variables (`server/.env`)
```
MONGO_URI=mongodb://localhost:27017/vaultsave
JWT_SECRET=your_super_secret_jwt_key_here
PORT=5000
```

---

## 🖥️ Frontend Setup

```bash
cd client
npm install
npm run dev   # Starts on http://localhost:5173
```

The Vite dev server proxies `/api` requests to `localhost:5000`.

---

## 📡 API Reference

### Auth
| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login user |
| GET | `/api/auth/me` | Get current user |

### Wallet
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/wallet/balance` | Get wallet balance |
| POST | `/api/wallet/deposit` | Add money to wallet |

### Vault
| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/vault/create` | Create a locked vault |
| GET | `/api/vault/all` | Get all user vaults |
| POST | `/api/vault/withdraw/:id` | Withdraw from vault (if unlocked) |

### Transactions
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/transactions` | Get transaction history |

---

## 💡 Sample Flow

1. Register a new account
2. Add ₹5000 to wallet (simulates GPay transfer)
3. Create vault: lock ₹2000 until any future date
4. Dashboard shows: Wallet = ₹3000, Vault = ₹2000 (locked)
5. Try to withdraw early → blocked with error message
6. After unlock date → withdraw returns ₹2000 to wallet

---

## 🔒 Business Logic

- **Atomic transactions**: MongoDB sessions ensure vault creation and balance deduction happen atomically
- **Backend enforcement**: Withdrawal before `unlockDate` is blocked server-side (not just frontend)
- **Balance validation**: Cannot create vault if `amount > walletBalance`
- **Auto-unlock**: Vault status updates to UNLOCKED when `now >= unlockDate`

---

## 🛠️ Tech Stack

- **Backend**: Node.js, Express, MongoDB, Mongoose, JWT, bcryptjs
- **Frontend**: React 18, Vite, Tailwind CSS, React Router, Axios
- **Auth**: JWT tokens stored in localStorage

---

## 🚢 Production Deployment

### Backend (e.g., Railway, Render)
```bash
cd server
npm start
```
Set env vars: `MONGO_URI`, `JWT_SECRET`, `PORT`

### Frontend (e.g., Vercel, Netlify)
```bash
cd client
npm run build
```
Set `VITE_API_URL` if backend is on a different domain, and update `vite.config.js` proxy accordingly.
