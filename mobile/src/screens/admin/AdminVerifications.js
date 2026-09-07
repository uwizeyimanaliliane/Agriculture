import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, FlatList, Image, Modal, TextInput, Alert, RefreshControl, Linking } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { tw } from '../../utils/tw';
import { useTheme } from '../../context/ThemeContext';
import { useI18n } from '../../i18n';
import { adminAPI } from '../../services/api';
import { getImageUrl } from '../../utils/formatters';
import { confirmAlert, alert as platformAlert } from '../../utils/platform';

const AdminVerifications = () => {
  const { isDarkMode } = useTheme();
  const { t } = useI18n();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('in_review');
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [busyId, setBusyId] = useState(null);

  const filters = [
    { value: 'in_review', label: 'Pending' },
    { value: 'verified', label: 'Approved' },
    { value: 'rejected', label: 'Rejected' },
  ];

  const fetchRequests = useCallback(async () => {
    try {
      const res = await adminAPI.getVerifications({ status: filter });
      setRequests(res.data.requests || []);
    } catch (err) {
      setRequests([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filter]);

  useFocusEffect(useCallback(() => {
    fetchRequests();
  }, [fetchRequests]));

  const onRefresh = () => { setRefreshing(true); fetchRequests(); };

  const handleApprove = (item) => {
    confirmAlert(
      t('admin.verifications'),
      `Approve verification for ${item.firstName || item.user?.name} ${item.lastName || ''}? The farmer will receive a congratulations notification.`,
      async () => {
        setBusyId(item._id);
        try {
          await adminAPI.approveVerification(item._id);
          platformAlert(t('common.success'), 'Verification approved. Farmer notified.');
          fetchRequests();
        } catch (err) {
          platformAlert(t('auth.error'), err.response?.data?.message || 'Failed to approve');
        } finally {
          setBusyId(null);
        }
      },
      null,
      'Approve',
      t('common.cancel')
    );
  };

  const handleReject = () => {
    if (!rejectReason.trim()) {
      Alert.alert(t('auth.error'), 'A rejection reason is required');
      return;
    }
    const item = rejectModal;
    setBusyId(item._id);
    try {
      adminAPI.rejectVerification(item._id, rejectReason.trim()).then(() => {
        platformAlert(t('common.success'), 'Verification rejected. Farmer notified with the reason.');
        setRejectModal(null);
        setRejectReason('');
        fetchRequests();
      }).catch((err) => {
        platformAlert(t('auth.error'), err.response?.data?.message || 'Failed to reject');
      }).finally(() => setBusyId(null));
    } catch (err) {
      setBusyId(null);
    }
  };

  const statusColor = (status) => {
    const map = {
      in_review: '#f59e0b',
      verified: '#22c55e',
      rejected: '#ef4444',
      pending: '#f59e0b',
    };
    return map[status] || '#64748b';
  };

  const renderItem = ({ item }) => (
    <View style={tw(`p-4 mb-3 rounded-2xl shadow-sm ${isDarkMode ? 'bg-slate-800' : 'bg-white'}`)}>
      <View style={tw('flex-row justify-between items-start')}>
        <View style={tw('flex-1')}>
          <Text style={tw(`font-semibold text-base ${isDarkMode ? 'text-white' : 'text-gray-800'}`)}>
            {item.firstName || item.user?.name} {item.lastName || ''}
          </Text>
          <Text style={tw(`text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`)}>
            {item.contactEmail || item.user?.email} · {item.contactNumber || item.user?.phone || ''}
          </Text>
        </View>
        <View style={{ backgroundColor: statusColor(item.verificationStatus) + '20', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 }}>
          <Text style={{ color: statusColor(item.verificationStatus), fontSize: 11, fontWeight: '600' }}>
            {item.verificationStatus?.replace('_', ' ') || 'pending'}
          </Text>
        </View>
      </View>

      <View style={tw('flex-row mt-3 gap-2')}>
        {item.productImage ? (
          <TouchableOpacity onPress={() => Linking.openURL(getImageUrl(item.productImage))}>
            <Image source={{ uri: getImageUrl(item.productImage) }} style={tw('w-20 h-20 rounded-xl')} />
          </TouchableOpacity>
        ) : (
          <View style={tw(`w-20 h-20 rounded-xl items-center justify-center ${isDarkMode ? 'bg-slate-700' : 'bg-gray-100'}`)}>
            <Text style={tw('text-3xl')}>🌾</Text>
          </View>
        )}
        <TouchableOpacity style={tw(`flex-1 rounded-xl items-center justify-center border ${isDarkMode ? 'border-slate-600' : 'border-gray-200'}`)}
          onPress={() => item.farmVideo && Linking.openURL(getImageUrl(item.farmVideo))}>
          <Text style={tw('text-2xl mb-1')}>🎬</Text>
          <Text style={tw(`text-xs font-medium ${isDarkMode ? 'text-slate-300' : 'text-gray-600'}`)}>Farm Video</Text>
        </TouchableOpacity>
      </View>

      <View style={tw('mt-3')}>
        <Text style={tw(`text-xs ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`)}>
          {[item.address?.province, item.address?.district, item.address?.sector, item.address?.cell].filter(Boolean).join(' · ') || '—'}
        </Text>
      </View>

      {item.verificationStatus === 'rejected' && item.verificationReason && (
        <View style={tw(`mt-3 p-3 rounded-xl ${isDarkMode ? 'bg-red-100' : 'bg-red-50'}`)}>
          <Text style={tw(`text-xs ${isDarkMode ? 'text-red-700' : 'text-red-700'}`)}>Reason: {item.verificationReason}</Text>
        </View>
      )}

      {item.verificationStatus === 'in_review' && (
        <View style={tw('flex-row gap-3 mt-4')}>
          <TouchableOpacity style={tw('flex-1 bg-green-700 py-3 rounded-xl items-center')}
            onPress={() => handleApprove(item)} disabled={busyId === item._id}>
            {busyId === item._id ? <ActivityIndicator color="white" /> : <Text style={tw('text-white font-semibold')}>✓ {t('admin.approve')}</Text>}
          </TouchableOpacity>
          <TouchableOpacity style={tw(`flex-1 py-3 rounded-xl items-center border ${isDarkMode ? 'border-red-500' : 'border-red-400'}`)}
            onPress={() => { setRejectModal(item); setRejectReason(''); }} disabled={busyId === item._id}>
            <Text style={tw('text-red-500 font-semibold')}>✕ {t('admin.reject')}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  return (
    <View style={tw(`flex-1 ${isDarkMode ? 'bg-slate-900' : 'bg-white'}`)}>
      <View style={tw(`p-6 pt-12 ${isDarkMode ? 'bg-slate-800' : 'bg-green-800'}`)}>
        <Text style={tw('text-white text-2xl font-bold')}>{t('admin.verifications')}</Text>
        <Text style={tw('text-green-100 text-sm mt-1')}>{t('admin.verificationsSubtitle')}</Text>
      </View>

      <View style={tw('flex-row px-4 py-3')}>
        {filters.map((item) => (
          <TouchableOpacity key={item.value}
            style={tw(`mr-2 px-4 py-2 rounded-full ${filter === item.value ? 'bg-green-600' : isDarkMode ? 'bg-slate-700' : 'bg-white shadow-sm'}`)}
            onPress={() => setFilter(item.value)}>
            <Text style={tw(`text-sm ${filter === item.value ? 'text-white' : isDarkMode ? 'text-slate-300' : 'text-gray-700'}`)}>
              {item.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={tw('flex-1 justify-center items-center')}>
          <ActivityIndicator size="large" color="#16a34a" />
        </View>
      ) : (
        <FlatList data={requests} renderItem={renderItem} keyExtractor={(item) => item._id}
          contentContainerStyle={{ padding: 16, paddingBottom: 30 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#16a34a']} />}
          ListEmptyComponent={
            <View style={tw('flex-1 justify-center items-center pt-20')}>
              <Text style={tw('text-3xl mb-3')}>📋</Text>
              <Text style={tw(`text-lg ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`)}>No verification requests</Text>
            </View>
          } />
      )}

      <Modal visible={!!rejectModal} transparent animationType="slide"
        onRequestClose={() => setRejectModal(null)}>
        <View style={tw('flex-1 bg-black/50 justify-end')}>
          <View style={tw(`rounded-t-3xl p-6 ${isDarkMode ? 'bg-slate-800' : 'bg-white'}`)}>
            <Text style={tw(`text-lg font-bold mb-1 ${isDarkMode ? 'text-white' : 'text-gray-800'}`)}>Reject Verification</Text>
            <Text style={tw(`text-sm mb-4 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`)}>
              {t('admin.rejectReasonRequired')}
            </Text>
            <TextInput
              style={tw(`border rounded-xl px-4 py-3 mb-4 ${isDarkMode ? 'border-slate-600 text-white bg-slate-700' : 'border-gray-300 text-gray-800 bg-white'}`)}
              placeholder="Enter reason for rejection"
              placeholderTextColor={isDarkMode ? '#94a3b8' : '#9ca3af'}
              value={rejectReason}
              onChangeText={setRejectReason}
              multiline
            />
            <View style={tw('flex-row gap-3')}>
              <TouchableOpacity style={tw(`flex-1 py-3 rounded-xl items-center border ${isDarkMode ? 'border-slate-600' : 'border-gray-300'}`)}
                onPress={() => setRejectModal(null)}>
                <Text style={tw(`${isDarkMode ? 'text-slate-300' : 'text-gray-600'} font-medium`)}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={tw('flex-1 bg-red-600 py-3 rounded-xl items-center')}
                onPress={handleReject}>
                {busyId === rejectModal?._id ? <ActivityIndicator color="white" /> : <Text style={tw('text-white font-semibold')}>Reject</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default AdminVerifications;
