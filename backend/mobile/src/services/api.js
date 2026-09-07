import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const API_BASE_URL = Platform.OS === 'web' ? 'http://localhost:5000/api' : 'http://10.0.2.2:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user');
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  googleAuth: (data) => api.post('/auth/google', data),
  getProfile: () => api.get('/auth/profile'),
  updateProfile: (data) => api.put('/auth/profile', data),
  changePassword: (currentPassword, newPassword) => api.put('/auth/change-password', { currentPassword, newPassword }),
  updateFcmToken: (fcmToken) => api.put('/auth/fcm-token', { fcmToken }),
  updateLocation: (data) => api.put('/auth/location', data),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (data) => api.post('/auth/reset-password', data),
  sendVerificationCode: (email) => api.post('/auth/send-code', { email }),
  verifyCode: (email, code) => api.post('/auth/verify-code', { email, code }),
  checkVerificationStatus: (email) => api.get('/auth/verification-status', { params: { email } }),
};

export const farmerAPI = {
  getProfile: (id) => api.get(`/farmers/profile/${id || ''}`),
  updateFarmDetails: (data) => api.put('/farmers/farm-details', data),
  submitVerification: () => api.post('/farmers/verification-request'),
  getVerificationStatus: () => api.get('/farmers/verification-status'),
  getRecentActivity: () => api.get('/farmers/recent-activity'),
  getFarmers: (params) => api.get('/farmers', { params }),
};

export const cropAPI = {
  getAvailable: (params) => api.get('/crops/available', { params }),
  getMine: () => api.get('/crops/mine'),
  getPending: () => api.get('/crops/pending'),
  getNeedingTransport: () => api.get('/crops/needing-transport'),
  getById: (id) => api.get(`/crops/${id}`),
  create: (data) => api.post('/crops', data),
  update: (id, data) => api.put(`/crops/${id}`, data),
  approve: (id) => api.put(`/crops/${id}/approve`),
  reject: (id, reason) => api.put(`/crops/${id}/reject`, { reason }),
  submitTransportBid: (id, price) => api.post(`/crops/${id}/transport-bid`, { price }),
  getTransportBids: (id) => api.get(`/crops/${id}/transport-bids`),
  acceptTransportBid: (id, bidId) => api.put(`/crops/${id}/accept-bid/${bidId}`),
  delete: (id) => api.delete(`/crops/${id}`),
};

export const auctionAPI = {
  getActive: (params) => api.get('/auctions/active', { params }),
  getMine: () => api.get('/auctions/mine'),
  getMyBids: () => api.get('/auctions/my-bids'),
  getById: (id) => api.get(`/auctions/${id}`),
  create: (data) => api.post('/auctions', data),
  placeBid: (id, amount) => api.post(`/auctions/${id}/bid`, { amount }),
  close: (id) => api.put(`/auctions/${id}/close`),
};

export const deliveryAPI = {
  getAvailable: () => api.get('/deliveries/available'),
  getMine: () => api.get('/deliveries/mine'),
  getById: (id) => api.get(`/deliveries/${id}`),
  getRoute: (id, origin) => api.get(`/deliveries/${id}/route`, { params: { origin } }),
  create: (data) => api.post('/deliveries', data),
  assign: (id) => api.put(`/deliveries/${id}/assign`),
  updateStatus: (id, data) => api.put(`/deliveries/${id}/status`, data),
  confirmQR: (id) => api.put(`/deliveries/${id}/confirm-qr`),
  setPrice: (id, price) => api.put(`/deliveries/${id}/set-price`, { price }),
  acceptPrice: (id) => api.put(`/deliveries/${id}/accept-price`),
};

export const escrowAPI = {
  getMine: () => api.get('/escrow/mine'),
  getById: (id) => api.get(`/escrow/${id}`),
  deposit: (id) => api.put(`/escrow/${id}/deposit`),
  dispute: (id) => api.put(`/escrow/${id}/dispute`),
};

export const notificationAPI = {
  getAll: (params) => api.get('/notifications', { params }),
  markRead: (id) => api.put(`/notifications/${id}/read`),
  markAllRead: () => api.put('/notifications/read-all'),
  delete: (id) => api.delete(`/notifications/${id}`),
};

export const adminAPI = {
  getDashboard: () => api.get('/admin/dashboard'),
  getCrops: (params) => api.get('/admin/crops', { params }),
  getUsers: (params) => api.get('/admin/users', { params }),
  getUserById: (id) => api.get(`/admin/users/${id}`),
  updateUserRole: (id, role) => api.put(`/admin/users/${id}/role`, { role }),
  toggleUserStatus: (id) => api.put(`/admin/users/${id}/toggle-status`),
  deleteUser: (id) => api.delete(`/admin/users/${id}`),
  getEscrows: (params) => api.get('/admin/escrows', { params }),
  releaseEscrow: (id) => api.put(`/admin/escrows/${id}/release`),
  refundEscrow: (id, reason) => api.put(`/admin/escrows/${id}/refund`, { reason }),
  resolveDispute: (id, decision, reason) => api.put(`/admin/escrows/${id}/resolve-dispute`, { decision, reason }),
  getDeliveries: (params) => api.get('/admin/deliveries', { params }),
  getTransporters: (params) => api.get('/admin/transporters', { params }),
  assignTransporter: (deliveryId, transporterId) => api.post('/admin/assign-transporter', { deliveryId, transporterId }),
  updateUserProfile: (id, data) => api.put(`/admin/users/${id}/profile`, data),
  changeUserPassword: (id, newPassword) => api.put(`/admin/users/${id}/password`, { newPassword }),
};

export const orderAPI = {
  place: (data) => api.post('/orders', data),
  getMine: () => api.get('/orders/mine'),
  confirmReceipt: (id) => api.put(`/orders/${id}/confirm`),
  payWithMobileMoney: (id, phone, network) => api.put(`/orders/${id}/mobile-pay`, { phone, network }),
  checkPaymentStatus: (id) => api.get(`/orders/${id}/payment-status`),
  getTransporters: (params) => api.get('/orders/transporters', { params }),
  orderTransporter: (deliveryId, transporterId) => api.post('/orders/order-transporter', { deliveryId, transporterId }),
};

export default api;
