import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, FlatList, Modal, TextInput, Image, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { tw } from '../../utils/tw';
import { useTheme } from '../../context/ThemeContext';
import { adminAPI } from '../../services/api';
import { getImageUrl } from '../../utils/formatters';
import { confirmAlert, alert as platformAlert } from '../../utils/platform';

const AdminPostFees = ({ navigation }) => {
  const { isDarkMode } = useTheme();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('pending');
  const [busyId, setBusyId] = useState(null);
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  const filters = ['pending', 'confirmed', 'rejected'];

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminAPI.getPostFeePayments({ status: filter });
      setPayments(res.data.payments || []);
    } catch (err) {
      setPayments([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filter]);

  useFocusEffect(useCallback(() => { fetchPayments(); }, [fetchPayments]));

  const onRefresh = () => { setRefreshing(true); fetchPayments(); };

  const handleConfirm = (item) => {
    confirmAlert(
      'Confirm Post Fee Payment',
      `Confirm that the post fee payment of 2,000 RWF from ${item.firstName || item.user?.name} ${item.lastName || ''} (${item.postFeePhone || item.user?.phone || ''}${item.postFeeCode ? `, code ${item.postFeeCode}` : ''}) was received? After confirming, approve their product in Crop Management to post it for buyers.`,
      async () => {
        setBusyId(item._id);
        try {
          await adminAPI.confirmPostFee(item._id);
          platformAlert('Confirmed', 'Payment confirmed. Farmer can now post products.');
          fetchPayments();
        } catch (err) {
          platformAlert('Error', err.response?.data?.message || 'Failed to confirm');
        } finally {
          setBusyId(null);
        }
      },
      null,
      'Confirm',
      'Cancel'
    );
  };

  const handleReject = () => {
    if (!rejectReason.trim()) {
      platformAlert('Missing reason', 'Please enter a reason for rejecting the payment.');
      return;
    }
    const item = rejectModal;
    setBusyId(item._id);
    adminAPI.rejectPostFee(item._id, rejectReason.trim())
      .then(() => {
        platformAlert('Rejected', 'Payment rejected. Farmer notified with the reason.');
        setRejectModal(null);
        setRejectReason('');
        fetchPayments();
      })
      .catch((err) => platformAlert('Error', err.response?.data?.message || 'Failed to reject'))
      .finally(() => setBusyId(null));
  };

  const statusColor = {
    pending: '#f59e0b',
    confirmed: '#22c55e',
    rejected: '#ef4444',
    none: '#64748b',
  };

  const renderItem = ({ item }) => (
    <View style={tw(`p-4 mb-3 rounded-2xl shadow-sm ${isDarkMode ? 'bg-slate-800' : 'bg-white'}`)}>
      <View style={tw('flex-row justify-between items-start')}>
        <View style={tw('flex-1 pr-2')}>
          <Text style={tw(`font-semibold text-base ${isDarkMode ? 'text-white' : 'text-gray-800'}`)}>
            {item.firstName || item.user?.name} {item.lastName || ''}
          </Text>
          <Text style={tw(`text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`)}>
            {item.contactEmail || item.user?.email || ''}
          </Text>
          <Text style={tw(`text-xs mt-1 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`)}>
            {item.contactNumber || item.user?.phone || ''} · {[item.address?.province, item.address?.district].filter(Boolean).join(', ') || '—'}
          </Text>
        </View>
        <View style={{ backgroundColor: (statusColor[item.postFeeStatus] || '#64748b') + '20', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 }}>
          <Text style={{ color: statusColor[item.postFeeStatus] || '#64748b', fontSize: 11, fontWeight: '600' }}>
            {item.postFeeStatus?.replace('_', ' ') || 'none'}
          </Text>
        </View>
      </View>

      <View style={tw(`mt-3 p-3 rounded-xl ${isDarkMode ? 'bg-slate-700' : 'bg-gray-50'}`)}>
        <Text style={tw(`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'}`)}>Post Fee: 2,000 RWF</Text>
        <Text style={tw(`text-xs mt-1 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`)}>
          {item.postFeeCode ? (
            <>Sent with code: {item.postFeeCode}</>
          ) : (
            <>Paid from: {item.postFeePhone || '—'} ({item.postFeeNetwork ? (item.postFeeNetwork === 'mtn' ? 'MTN' : 'Airtel') : '—'})</>
          )}
        </Text>
        {item.postFeeStatus === 'rejected' && item.postFeeReason && (
          <Text style={tw(`text-xs mt-1 text-red-500`)}>Reason: {item.postFeeReason}</Text>
        )}
      </View>

      {(item.pendingCrops || []).length > 0 && (
        <View style={tw(`mt-3 p-3 rounded-xl ${isDarkMode ? 'bg-slate-700' : 'bg-amber-50 border border-amber-200'}`)}>
          <Text style={tw(`text-xs font-semibold mb-1 ${isDarkMode ? 'text-amber-300' : 'text-amber-800'}`)}>
            Product(s) added by this farmer (awaiting your approval)
          </Text>
          {(item.pendingCrops || []).map(c => (
            <View key={c._id} style={tw('flex-row items-center mt-2')}>
              {c.photos?.[0] ? (
                <Image source={{ uri: getImageUrl(c.photos[0]) }} style={tw('w-10 h-10 rounded-lg mr-2')} />
              ) : (
                <View style={tw('w-10 h-10 rounded-lg mr-2 bg-green-100 items-center justify-center')}>
                  <Text style={tw('text-lg')}>🌾</Text>
                </View>
              )}
              <View style={tw('flex-1')}>
                <Text style={tw(`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-800'}`)}>{c.name}</Text>
                <Text style={tw(`text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`)}>
                  {c.quantity} {c.quantityUnit} · {c.status?.replace('_', ' ')}
                </Text>
              </View>
            </View>
          ))}
          {item.postFeeStatus !== 'confirmed' && (
            <Text style={tw(`text-xs mt-2 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`)}>
              Approve the product in <Text style={tw('font-semibold')}>Crop Management</Text> — it will be posted automatically to buyers.
            </Text>
          )}
        </View>
      )}

      {item.postFeeStatus === 'rejected' && item.postFeeReason && (
        <View style={tw(`mt-3 p-3 rounded-xl ${isDarkMode ? 'bg-red-100' : 'bg-red-50'}`)}>
          <Text style={tw(`text-xs text-red-700`)}>Reason: {item.postFeeReason}</Text>
        </View>
      )}

      {item.postFeeStatus === 'pending' && (
        <View style={tw('flex-row gap-3 mt-4')}>
          <TouchableOpacity style={tw('flex-1 bg-green-700 py-3 rounded-xl items-center')}
            onPress={() => handleConfirm(item)} disabled={busyId === item._id}>
            {busyId === item._id ? <ActivityIndicator color="white" /> : <Text style={tw('text-white font-semibold')}>✓ Confirm Payment</Text>}
          </TouchableOpacity>
          <TouchableOpacity style={tw(`flex-1 py-3 rounded-xl items-center border ${isDarkMode ? 'border-red-500' : 'border-red-400'}`)}
            onPress={() => { setRejectModal(item); setRejectReason(''); }} disabled={busyId === item._id}>
            <Text style={tw('text-red-500 font-semibold')}>✕ Reject</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  return (
    <View style={tw(`flex-1 ${isDarkMode ? 'bg-slate-900' : 'bg-white'}`)}>
      <View style={tw(`p-6 pt-12 ${isDarkMode ? 'bg-slate-800' : 'bg-green-800'}`)}>
        <TouchableOpacity style={tw('self-start px-4 py-2 rounded-full bg-green-600')}
          onPress={() => navigation.goBack()}>
          <Text style={tw('text-white font-medium')}>← Back</Text>
        </TouchableOpacity>
        <Text style={tw('text-white text-2xl font-bold mt-4')}>Post Fee Payments</Text>
        <Text style={tw('text-green-100 text-sm mt-1')}>Confirm farmer post fee payments so they can post products</Text>
      </View>

      <View style={tw('flex-row px-4 py-3')}>
        {filters.map((f) => (
          <TouchableOpacity key={f}
            style={tw(`mr-2 px-4 py-2 rounded-full ${filter === f ? 'bg-green-600' : isDarkMode ? 'bg-slate-700' : 'bg-white shadow-sm'}`)}
            onPress={() => setFilter(f)}>
            <Text style={tw(`text-sm capitalize ${filter === f ? 'text-white' : isDarkMode ? 'text-slate-300' : 'text-gray-700'}`)}>
              {f.replace('_', ' ')}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={tw('flex-1 justify-center items-center')}>
          <ActivityIndicator size="large" color="#16a34a" />
        </View>
      ) : (
        <FlatList data={payments} renderItem={renderItem} keyExtractor={(item) => item._id}
          contentContainerStyle={{ padding: 16, paddingBottom: 30 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#16a34a']} />}
          ListEmptyComponent={
            <View style={tw('flex-1 justify-center items-center pt-20')}>
              <Text style={tw('text-3xl mb-3')}>💳</Text>
              <Text style={tw(`text-lg ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`)}>No post fee {filter} payments</Text>
            </View>
          } />
      )}

      <Modal visible={!!rejectModal} transparent animationType="slide"
        onRequestClose={() => setRejectModal(null)}>
        <View style={tw('flex-1 bg-black/50 justify-end')}>
          <View style={tw(`rounded-t-3xl p-6 ${isDarkMode ? 'bg-slate-800' : 'bg-white'}`)}>
            <Text style={tw(`text-lg font-bold mb-1 ${isDarkMode ? 'text-white' : 'text-gray-800'}`)}>Reject Post Fee Payment</Text>
            <Text style={tw(`text-sm mb-4 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`)}>
              Provide a reason so the farmer understands why the payment was not confirmed.
            </Text>
            <TextInput
              style={tw(`border rounded-xl px-4 py-3 mb-4 ${isDarkMode ? 'border-slate-600 text-white bg-slate-700' : 'border-gray-300 text-gray-800 bg-white'}`)}
              placeholder="Enter reason"
              placeholderTextColor={isDarkMode ? '#94a3b8' : '#9ca3af'}
              value={rejectReason}
              onChangeText={setRejectReason}
              multiline
            />
            <View style={tw('flex-row gap-3')}>
              <TouchableOpacity style={tw(`flex-1 py-3 rounded-xl items-center border ${isDarkMode ? 'border-slate-600' : 'border-gray-300'}`)}
                onPress={() => setRejectModal(null)}>
                <Text style={tw(`${isDarkMode ? 'text-slate-300' : 'text-gray-600'} font-medium`)}>Cancel</Text>
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

export default AdminPostFees;
