import { Platform } from 'react-native';

export const getImageUrl = (path) => {
  if (!path) return null;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  if (path.startsWith('file://') || path.startsWith('data:')) return path;

  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  if (Platform.OS === 'web') {
    const protocol = window.location.protocol || 'http:';
    const hostname = window.location.hostname || 'localhost';
    const port = 5000;
    return `${protocol}//${hostname}:${port}${normalizedPath}`;
  }

  if (Platform.OS === 'ios') {
    return `http://127.0.0.1:5000${normalizedPath}`;
  }

  return `http://10.0.2.2:5000${normalizedPath}`;
};

export const formatCurrency = (amount) => {
  if (!amount && amount !== 0) return '';
  return `${Number(amount).toLocaleString('en-RW')} RWF`;
};

export const formatDate = (date) => {
  if (!date) return '';
  return new Date(date).toLocaleDateString('en-RW', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export const formatDateTime = (date) => {
  if (!date) return '';
  return new Date(date).toLocaleDateString('en-RW', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const getRoleColor = (role) => {
  const colors = {
    farmer: '#22c55e',
    buyer: '#3b82f6',
    transporter: '#f97316',
    agent: '#8b5cf6',
    cooperative: '#06b6d4',
    admin: '#ef4444',
  };
  return colors[role] || '#64748b';
};

export const getStatusColor = (status) => {
  const colors = {
    active: '#22c55e',
    pending: '#f59e0b',
    closed: '#64748b',
    cancelled: '#ef4444',
    completed: '#22c55e',
    verified: '#22c55e',
    rejected: '#ef4444',
    in_review: '#f59e0b',
    delivered: '#22c55e',
    in_transit: '#3b82f6',
    confirmed: '#22c55e',
    released: '#22c55e',
    locked: '#3b82f6',
    disputed: '#ef4444',
  };
  return colors[status] || '#64748b';
};

export const cropCategories = [
  { value: 'vegetables', label: 'Vegetables' },
  { value: 'fruits', label: 'Fruits' },
  { value: 'grains', label: 'Grains' },
  { value: 'tubers', label: 'Tubers' },
  { value: 'legumes', label: 'Legumes' },
  { value: 'other', label: 'Other' },
];

export const quantityUnits = [
  { value: 'kg', label: 'Kilogram (kg)' },
  { value: 'ton', label: 'Ton' },
  { value: 'sack', label: 'Sack' },
  { value: 'crate', label: 'Crate' },
  { value: 'bunch', label: 'Bunch' },
  { value: 'piece', label: 'Piece' },
];

export const districts = [
  'Gasabo', 'Kicukiro', 'Nyarugenge', 'Bugesera', 'Gatsibo',
  'Kayonza', 'Kirehe', 'Ngoma', 'Nyagatare', 'Rwamagana',
  'Burera', 'Gakenke', 'Gicumbi', 'Musanze', 'Rulindo',
  'Karongi', 'Ngororero', 'Nyabihu', 'Nyamasheke', 'Rubavu',
  'Rusizi', 'Rutsiro', 'Gasaka', 'Huye', 'Kamonyi',
  'Muhanga', 'Nyamagabe', 'Nyanza', 'Ruhango',
];
