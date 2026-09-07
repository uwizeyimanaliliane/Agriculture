import React, { useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Alert, ActivityIndicator, FlatList, TextInput } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { tw } from '../../utils/tw';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { orderAPI } from '../../services/api';
import { formatCurrency } from '../../utils/formatters';
import { alert, confirmAlert } from '../../utils/platform';

const statusColors = {
  pending_deposit: 'text-yellow-500',
  payment_pending_verification: 'text-orange-500',
  locked: 'text-blue-500',
  in_transit: 'text-purple-500',
  delivered: 'text-green-500',
  released: 'text-green-700',
  disputed: 'text-red-500',
  refunded: 'text-red-700',
};

const MyOrdersScreen = ({ navigation, route }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [payingOrderId, setPayingOrderId] = useState(null);
  const [payPhone, setPayPhone] = useState('');
  const [payNetwork, setPayNetwork] = useState('');
  const [paying, setPaying] = useState(false);
  const { user } = useAuth();
  const { isDarkMode } = useTheme();
  const pollingRef = useRef({});

  useFocusEffect(useCallback(() => { loadOrders(); }, []));

  useEffect(() => {
    return () => {
      Object.values(pollingRef.current).forEach(clearInterval);
    };
  }, []);

  useEffect(() => {
    if (route?.params?.orderId) {
      setPayingOrderId(route.params.orderId);
      loadOrders();
    }
  }, [route?.params?.orderId]);

  const startPolling = (orderId) => {
    if (pollingRef.current[orderId]) clearInterval(pollingRef.current[orderId]);
    pollingRef.current[orderId] = setInterval(async () => {
      try {
        const res = await orderAPI.checkPaymentStatus(orderId);
        if (res.data?.status === 'locked') {
          clearInterval(pollingRef.current[orderId]);
          delete pollingRef.current[orderId];
          loadOrders();
        }
      } catch {
        // keep polling
      }
    }, 2000);
  };

  const loadOrders = async () => {
    setLoading(true);
    try {
      const res = await orderAPI.getMine();
      setOrders(res.data.orders || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmReceipt = (order) => {
    confirmAlert('Confirm Receipt', 'Have you received the goods? Confirming will notify the admin to release payment to the farmer.', async () => {
      try {
        await orderAPI.confirmReceipt(order._id);
        alert('Success', 'Receipt confirmed. Admin will review and release payment.');
        loadOrders();
      } catch (err) {
        alert('Error', err.response?.data?.message || 'Failed to confirm');
      }
    }, null, 'Confirm Received', 'Cancel');
  };

  const networks = [
    { value: 'mtn', label: 'MTN', icon: '📱' },
    { value: 'airtel', label: 'Airtel', icon: '📲' },
  ];

  const isBuyer = user?.role === 'buyer';
  const canConfirm = (item) => isBuyer && (item.status === 'locked' || item.status === 'in_transit');
  const needsPayment = (item) => isBuyer && item.status === 'pending_deposit' && item.type === 'direct';

  const handleMobilePay = async (order) => {
    if (!payPhone) {
      Alert.alert('Error', 'Enter your phone number');
      return;
    }
    if (payPhone.length < 10) {
      Alert.alert('Error', 'Phone number must be at least 10 digits (e.g., 07XXXXXXXX)');
      return;
    }
    if (!payNetwork) {
      Alert.alert('Error', 'Please select your mobile network (MTN or Airtel)');
      return;
    }

    setPaying(true);
    try {
      await orderAPI.payWithMobileMoney(order._id, payPhone, payNetwork);
      setPaying(false);
      setPayingOrderId(null);
      setPayPhone('');
      setPayNetwork('');
      startPolling(order._id);
      Alert.alert(
        'Payment Request Sent',
        `A USSD payment request has been sent to ${payPhone} (${payNetwork === 'mtn' ? 'MTN' : 'Airtel'}).\n\nCheck your phone and approve the payment there. PIN entry happens on your phone's mobile money prompt, not in the app.\n\nOrders will update automatically once confirmed.`
      );
      loadOrders();
    } catch (err) {
      setPaying(false);
      const errorMsg = err.response?.data?.message || 'Payment failed. Please try again.';
      Alert.alert('Error', errorMsg);
    }
  };

  const renderItem = ({ item }) => (
    <View style={tw(`p-4 mb-3 rounded-2xl shadow-sm ${isDarkMode ? 'bg-slate-800' : 'bg-white'}`)}>
      <View style={tw('flex-row justify-between items-start')}>
        <View style={tw('flex-1')}>
          <Text style={tw(`font-semibold text-base ${isDarkMode ? 'text-white' : 'text-gray-800'}`)}>
            {item.crop?.name || 'Order'}
          </Text>
          <Text style={tw(`text-xs ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`)}>
            Ref: {item.transactionRef}
          </Text>
        </View>
        <View style={tw(`px-2 py-0.5 rounded-full ${isDarkMode ? 'bg-slate-700' : 'bg-gray-100'}`)}>
          <Text style={tw(`text-xs capitalize ${statusColors[item.status] || 'text-gray-500'}`)}>
            {item.status.replace(/_/g, ' ')}
          </Text>
        </View>
      </View>

      {item.farmer && isBuyer && (
        <Text style={tw(`text-sm mt-2 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`)}>
          Farmer: {item.farmer.name} {item.farmer.phone ? `- ${item.farmer.phone}` : ''}
        </Text>
      )}
      {item.buyer && !isBuyer && (
        <Text style={tw(`text-sm mt-2 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`)}>
          Buyer: {item.buyer.name} {item.buyer.phone ? `- ${item.buyer.phone}` : ''}
        </Text>
      )}

      <View style={tw('flex-row justify-between items-center mt-2')}>
        <Text style={tw('font-bold text-green-600')}>{formatCurrency(item.amount)}</Text>
        {item.delivery?.transporter?.name && (
          <Text style={tw(`text-xs ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`)}>
            Transporter: {item.delivery.transporter.name}
          </Text>
        )}
      </View>

      {needsPayment(item) && (
        payingOrderId === item._id ? (
          <View style={tw(`mt-3 p-4 rounded-xl ${isDarkMode ? 'bg-slate-700' : 'bg-yellow-50 border border-yellow-200'}`)}>
            <Text style={tw(`text-sm font-semibold mb-2 ${isDarkMode ? 'text-slate-200' : 'text-yellow-800'}`)}>
              Complete Your Payment
            </Text>
            <Text style={tw(`text-xs mb-3 ${isDarkMode ? 'text-slate-300' : 'text-yellow-700'}`)}>
              Amount due: {formatCurrency(item.amount)} via Mobile Money
            </Text>
            <View style={tw('flex-row gap-2 mb-3')}>
              {networks.map((n) => (
                <TouchableOpacity key={n.value}
                  style={tw(`flex-1 py-2 rounded-lg items-center ${payNetwork === n.value ? 'bg-green-800' : isDarkMode ? 'bg-slate-600' : 'bg-green-100'}`)}
                  onPress={() => setPayNetwork(n.value)}>
                  <Text style={tw(`text-xs font-medium ${payNetwork === n.value ? 'text-white' : isDarkMode ? 'text-slate-300' : 'text-green-800'}`)}>
                    {n.icon} {n.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              style={tw(`border rounded-xl px-4 py-2 mb-3 text-sm ${isDarkMode ? 'border-slate-500 text-white bg-slate-800' : 'border-gray-300 text-gray-800 bg-white'}`)}
              placeholder="Your phone number (07...)"
              placeholderTextColor={isDarkMode ? '#94a3b8' : '#9ca3af'}
              keyboardType="phone-pad"
              value={payPhone}
              onChangeText={setPayPhone}
            />
            <View style={tw(`p-2 mb-3 rounded-lg ${isDarkMode ? 'bg-slate-600' : 'bg-orange-50 border border-orange-200'}`)}>
              <Text style={tw(`text-xs text-center ${isDarkMode ? 'text-orange-300' : 'text-orange-700'}`)}>
                ℹ️ A payment request will be sent to your phone. Approve it there — PIN entry happens on the phone, not in this app.
              </Text>
            </View>
            <View style={tw('flex-row gap-2')}>
              <TouchableOpacity style={tw(`flex-1 py-2.5 rounded-xl items-center ${paying ? 'bg-green-600' : 'bg-green-800'}`)}
                onPress={() => handleMobilePay(item)} disabled={paying}>
                {paying ? <ActivityIndicator color="white" size="small" /> : <Text style={tw('text-white font-medium text-sm')}>Send Payment Request</Text>}
              </TouchableOpacity>
              <TouchableOpacity style={tw(`px-4 py-2.5 rounded-xl items-center ${isDarkMode ? 'bg-slate-600' : 'bg-gray-200'}`)}
                onPress={() => { setPayingOrderId(null); setPayPhone(''); setPayNetwork(''); }}>
                <Text style={tw(`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-600'}`)}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <TouchableOpacity style={tw('mt-3 bg-yellow-500 py-3 rounded-xl items-center')}
            onPress={() => setPayingOrderId(item._id)}>
            <Text style={tw('text-white font-semibold')}>Pay Now - {formatCurrency(item.amount)}</Text>
          </TouchableOpacity>
        )
      )}

      {canConfirm(item) && (
        <TouchableOpacity style={tw('mt-3 bg-green-800 py-3 rounded-xl items-center')}
          onPress={() => handleConfirmReceipt(item)}>
          <Text style={tw('text-white font-medium')}>Confirm Receipt</Text>
        </TouchableOpacity>
      )}

      {item.status === 'delivered' && (
        <View style={tw('mt-2')}>
          <Text style={tw('text-green-600 text-sm font-medium')}>✓ Receipt confirmed. Awaiting admin release.</Text>
        </View>
      )}

      {item.status === 'released' && (
        <View style={tw('mt-2')}>
          <Text style={tw('text-green-700 text-sm font-medium')}>✓ Payment released. Order complete.</Text>
        </View>
      )}
    </View>
  );

  return (
    <View style={tw(`flex-1 ${isDarkMode ? 'bg-slate-900' : 'bg-white'}`)}>
      <View style={tw(`p-6 pt-12 ${isDarkMode ? 'bg-slate-800' : 'bg-green-800'}`)}>
        <Text style={tw('text-white text-2xl font-bold')}>
          {isBuyer ? 'My Orders' : 'Orders Received'}
        </Text>
        <Text style={tw(`text-sm mt-1 ${isDarkMode ? 'text-slate-400' : 'text-green-100'}`)}>
          {orders.length} {isBuyer ? 'orders' : 'sales'}
        </Text>
      </View>

      <View style={tw('flex-1 px-4 pt-4')}>
        {loading ? (
          <View style={tw('flex-1 justify-center items-center')}>
            <ActivityIndicator size="large" color="#16a34a" />
          </View>
        ) : (
          <FlatList data={orders} renderItem={renderItem} keyExtractor={(item) => item._id}
            contentContainerStyle={{ paddingBottom: 20 }}
            ListEmptyComponent={
              <View style={tw('flex-1 justify-center items-center pt-20')}>
                <Text style={tw(`text-lg ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`)}>
                  No {isBuyer ? 'orders' : 'sales'} yet
                </Text>
              </View>
            } />
        )}
      </View>
    </View>
  );
};

export default MyOrdersScreen;
