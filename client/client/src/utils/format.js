export const formatINR = (amount) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
};

export const formatDate = (date) => {
  return new Date(date).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

export const formatDateTime = (date) => {
  return new Date(date).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const daysUntilUnlock = (unlockDate) => {
  const now = new Date();
  const unlock = new Date(unlockDate);
  const diff = Math.ceil((unlock - now) / (1000 * 60 * 60 * 24));
  return diff;
};

export const progressPercent = (createdAt, unlockDate) => {
  const now = new Date();
  const start = new Date(createdAt);
  const end = new Date(unlockDate);
  const total = end - start;
  const elapsed = now - start;
  return Math.min(100, Math.max(0, (elapsed / total) * 100));
};
