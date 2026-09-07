import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Alert, ActivityIndicator, ScrollView, TextInput } from 'react-native';
import { tw } from '../../utils/tw';
import { useTheme } from '../../context/ThemeContext';
import { orderAPI } from '../../services/api';
import { formatCurrency } from '../../utils/formatters';
import BackButton from '../../components/BackButton';

const networks = [
  { value: 'mtn', label: 'MTN Mobile Money', icon: '📱' },
  { value: 'airtel', label: 'Airtel Money', icon: '📲' },
];

const PLATFORM_FEE = 2500;

const OrderScreen = ({ route, navigation }) => {
  const { crop } = route.params || {};
  const { isDarkMode } = useTheme();
  const [quantity, setQuantity] = useState(String(crop?.quantity || 1));
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState('initial');
  const [orderResult, setOrderResult] = useState(null);
  const [escrowId, setEscrowId] = useState(null);
  const [payPhone, setPayPhone] = useState('');
  const [payNetwork, setPayNetwork] = useState('');
  const [paying, setPaying] = useState(false);
  const pollingRef = useRef(null);

  const subtotal = (crop?.price || 0) * (parseInt(quantity) || 0);
  const transportFee = parseInt(crop?.transportPrice || 0);
  const totalPayable = subtotal + PLATFORM_FEE + transportFee;
  const orderAmount = orderResult?.escrow?.amount ?? totalPayable;
  const farmerAmount = orderResult?.escrow?.farmerAmount ?? subtotal;

  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  const startPolling = (escrowId) => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    pollingRef.current = setInterval(async () => {
      try {
        const res = await orderAPI.checkPaymentStatus(escrowId);
        if (res.data?.escrow?.status === 'locked') {
          clearInterval(pollingRef.current);
          pollingRef.current = null;
          setStep('paid');
        }
      } catch {
        // keep polling
      }
    }, 2000);
  };

  const handlePlaceOrder = async () => {
    if (!crop) return;
    const qty = parseInt(quantity);
    if (!qty || qty <= 0) { Alert.alert('Error', 'Enter a valid quantity'); return; }
    if (qty > (crop.quantity || 999)) { Alert.alert('Error', `Only ${crop.quantity} ${crop.quantityUnit} available`); return; }

    setLoading(true);
    try {
      const res = await orderAPI.place({
        cropId: crop._id,
        quantity: qty,
        pickupLocation: crop.location || {},
        deliveryLocation: {},
      });
      setOrderResult(res.data);
      setEscrowId(res.data.escrow._id);
      setStep('payment');
    } catch (err) {
      const errData = err.response?.data;
      const message = errData?.errors?.[0] || errData?.message || err.message || 'Failed to place order';
      Alert.alert('Order Error', message);
    } finally {
      setLoading(false);
    }
  };

  const handlePay = async () => {
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
      const id = escrowId || orderResult?.escrow?._id;
      if (!id) { Alert.alert('Error', 'No order to pay for'); setPaying(false); return; }
      const res = await orderAPI.payWithMobileMoney(id, payPhone, payNetwork);
      if (res?.data?.escrow) setOrderResult(prev => ({ ...prev, escrow: res.data.escrow }));
      setPaying(false);
      setStep('waiting_for_ussd');
      startPolling(id);
    } catch (err) {
      setPaying(false);
      const errorMsg = err.response?.data?.message || 'Payment failed. Please try again.';
      Alert.alert('Payment Error', errorMsg);
    }
  };

  if (step === 'paid') {
    return (
      <View style={tw(`flex-1 ${isDarkMode ? 'bg-slate-900' : 'bg-white'}`)}>
        <View style={tw(`p-6 pt-12 ${isDarkMode ? 'bg-slate-800' : 'bg-green-800'}`)}>
          <BackButton onPress={() => navigation.navigate('MyOrders')} />
          <Text style={tw('text-white text-2xl font-bold mt-2')}>Payment Successful!</Text>
        </View>
        <View style={tw('flex-1 p-4 items-center justify-center')}>
          <Text style={tw('text-6xl mb-4')}>✅</Text>
          <Text style={tw(`text-xl font-bold mb-2 text-center ${isDarkMode ? 'text-white' : 'text-gray-800'}`)}>
            Payment Confirmed
          </Text>
          <Text style={tw(`text-sm mb-6 text-center px-4 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`)}>
            Your payment of {formatCurrency(orderAmount)} has been deducted from your mobile money account and locked in escrow.
          </Text>
          <View style={tw(`w-full p-4 rounded-2xl mb-4 ${isDarkMode ? 'bg-blue-900' : 'bg-blue-50 border border-blue-200'}`)}>
            <Text style={tw(`text-xs font-semibold mb-2 ${isDarkMode ? 'text-blue-300' : 'text-blue-800'}`)}>ℹ️ Payment Status</Text>
            <Text style={tw(`text-xs ${isDarkMode ? 'text-blue-200' : 'text-blue-700'}`)}>
              Funds are held securely in escrow until you confirm receipt of goods.
            </Text>
          </View>
          <View style={tw(`w-full p-4 rounded-2xl mb-6 ${isDarkMode ? 'bg-slate-800' : 'bg-white'}`)}>
            <Text style={tw(`text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`)}>Order Ref</Text>
            <Text style={tw(`text-base font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`)}>{orderResult.escrow.transactionRef}</Text>
            <Text style={tw(`text-sm mt-2 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`)}>Amount Paid</Text>
            <Text style={tw(`text-lg font-bold text-green-600`)}>{formatCurrency(orderAmount)}</Text>
            <Text style={tw(`text-sm mt-2 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`)}>Paid From</Text>
            <Text style={tw(`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-800'}`)}>{payPhone} ({payNetwork === 'mtn' ? 'MTN' : 'Airtel'})</Text>
            <Text style={tw(`text-sm mt-2 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`)}>Status</Text>
            <Text style={tw(`text-base font-medium capitalize text-green-600`)}>Payment Locked</Text>
          </View>
          <TouchableOpacity style={tw('bg-green-800 py-4 px-8 rounded-xl w-full mb-3 items-center')}
            onPress={() => navigation.navigate('MyOrders')}>
            <Text style={tw('text-white font-semibold')}>View My Orders</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (step === 'waiting_for_ussd') {
    return (
      <View style={tw(`flex-1 ${isDarkMode ? 'bg-slate-900' : 'bg-white'}`)}>
        <View style={tw(`p-6 pt-12 ${isDarkMode ? 'bg-slate-800' : 'bg-green-800'}`)}>
          <BackButton onPress={() => { if (pollingRef.current) clearInterval(pollingRef.current); setStep('payment'); }} />
          <Text style={tw('text-white text-2xl font-bold mt-2')}>Waiting for Payment</Text>
        </View>
        <View style={tw('flex-1 p-4 items-center justify-center')}>
          <ActivityIndicator size="large" color={isDarkMode ? '#22c55e' : '#166534'} />
          <Text style={tw(`text-xl font-bold mt-6 text-center ${isDarkMode ? 'text-white' : 'text-gray-800'}`)}>
            Check your phone
          </Text>
          <Text style={tw(`text-sm mt-2 text-center px-8 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`)}>
            A payment request of {formatCurrency(orderAmount)} has been sent to {payPhone} via {payNetwork === 'mtn' ? 'MTN' : 'Airtel'}.
          </Text>
          <Text style={tw(`text-sm mt-1 text-center px-8 font-semibold ${isDarkMode ? 'text-yellow-400' : 'text-yellow-700'}`)}>
            Enter your Mobile Money PIN on your phone to authorize the payment.
          </Text>
          <View style={tw(`mt-6 w-full p-4 rounded-2xl ${isDarkMode ? 'bg-blue-900' : 'bg-blue-50 border border-blue-200'}`)}>
            <Text style={tw(`text-xs text-center ${isDarkMode ? 'text-blue-200' : 'text-blue-700'}`)}>
              ⏳ Waiting for confirmation... This usually takes about 5 seconds.
            </Text>
          </View>
        </View>
      </View>
    );
  }

  if (step === 'payment') {
    return (
      <View style={tw(`flex-1 ${isDarkMode ? 'bg-slate-900' : 'bg-white'}`)}>
        <View style={tw(`p-6 pt-12 ${isDarkMode ? 'bg-slate-800' : 'bg-green-800'}`)}>
          <BackButton onPress={() => setStep('initial')} />
          <Text style={tw('text-white text-2xl font-bold mt-2')}>Complete Payment</Text>
        </View>
        <ScrollView style={tw('flex-1 p-4')}>
          <View style={tw(`p-4 mb-4 rounded-2xl ${isDarkMode ? 'bg-slate-800' : 'bg-white'}`)}>
            <Text style={tw(`text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`)}>Order Reference</Text>
            <Text style={tw(`text-base font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`)}>{orderResult.escrow.transactionRef}</Text>
          </View>

          <View style={tw(`p-4 mb-4 rounded-2xl ${isDarkMode ? 'bg-slate-800' : 'bg-green-50 border border-green-200'}`)}>
            <Text style={tw(`text-center text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`)}>
              {formatCurrency(orderAmount)}
            </Text>
            <Text style={tw(`text-center text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`)}>Total Amount to Pay</Text>
          </View>

          <View style={tw(`p-4 mb-4 rounded-2xl ${isDarkMode ? 'bg-slate-800' : 'bg-green-50 border border-green-200'}`)}>
            <Text style={tw(`text-center text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`)}>
              {formatCurrency(orderAmount)}
            </Text>
            <Text style={tw(`text-center text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`)}>Total Amount</Text>
          </View>

          <Text style={tw(`text-sm font-semibold mb-2 ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`)}>
            Select Your Network
          </Text>
          <View style={tw('flex-row gap-2 mb-4')}>
            {networks.map((n) => (
              <TouchableOpacity key={n.value}
                style={tw(`flex-1 py-4 rounded-xl items-center ${payNetwork === n.value ? 'bg-green-800' : isDarkMode ? 'bg-slate-700' : 'bg-green-100'}`)}
                onPress={() => setPayNetwork(n.value)}>
                <Text style={tw('text-2xl mb-1')}>{n.icon}</Text>
                <Text style={tw(`text-sm font-medium ${payNetwork === n.value ? 'text-white' : isDarkMode ? 'text-slate-300' : 'text-green-800'}`)}>
                  {n.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={tw(`text-sm font-semibold mb-2 ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`)}>
            Your Phone Number
          </Text>
          <TextInput
            style={tw(`border rounded-xl px-4 py-3 mb-4 ${isDarkMode ? 'border-slate-600 text-white bg-slate-800' : 'border-gray-300 text-gray-800 bg-white'}`)}
            placeholder="e.g. 07XXXXXXXX"
            placeholderTextColor={isDarkMode ? '#94a3b8' : '#9ca3af'}
            keyboardType="phone-pad"
            value={payPhone}
            onChangeText={setPayPhone}
          />

          <View style={tw(`p-3 mb-4 rounded-xl ${isDarkMode ? 'bg-slate-800' : 'bg-orange-50 border border-orange-200'}`)}>
            <Text style={tw(`text-xs text-center ${isDarkMode ? 'text-orange-300' : 'text-orange-700'}`)}>
              ℹ️ After tapping "Pay", a payment request will be sent to your phone via USSD. Approve the charge on your phone; the PIN entry happens there.
            </Text>
          </View>

          <TouchableOpacity style={tw(`py-4 rounded-xl items-center mb-3 ${paying ? 'bg-green-700' : 'bg-green-800'}`)}
            onPress={handlePay} disabled={paying}>
            {paying ? (
              <>
                <ActivityIndicator color="white" />
                <Text style={tw('text-white font-semibold text-sm mt-2')}>Sending Payment Request...</Text>
              </>
            ) : (
              <Text style={tw('text-white font-semibold text-base')}>
                Pay {formatCurrency(orderAmount)}
              </Text>
            )}
          </TouchableOpacity>

          <Text style={tw(`text-center text-xs mb-6 ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`)}>
            Your payment goes securely to Agri-Link escrow. Funds are held until you confirm receipt of goods.
          </Text>
        </ScrollView>
      </View>
    );
  }

  return (
    <ScrollView style={tw(`flex-1 ${isDarkMode ? 'bg-slate-900' : 'bg-white'}`)}>
      <View style={tw(`p-6 pt-12 ${isDarkMode ? 'bg-slate-800' : 'bg-green-800'}`)}>
        <BackButton onPress={() => navigation.goBack()} />
        <Text style={tw('text-white text-2xl font-bold mt-4')}>Place Order</Text>
      </View>

      <View style={tw('p-4')}>
        <View style={tw(`p-4 mb-4 rounded-2xl ${isDarkMode ? 'bg-slate-800' : 'bg-white'}`)}>
          <Text style={tw(`text-lg font-bold mb-1 ${isDarkMode ? 'text-white' : 'text-gray-800'}`)}>{crop?.name}</Text>
          <Text style={tw(`text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`)}>
            {crop?.quantity} {crop?.quantityUnit} available - {formatCurrency(crop?.price)}/{crop?.quantityUnit}
          </Text>
          <Text style={tw(`text-xs mt-1 ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`)}>
            Location: {crop?.location?.district || 'Unknown'}
          </Text>
        </View>

        <Text style={tw(`text-sm font-medium mb-2 ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`)}>
          Quantity ({crop?.quantityUnit})
        </Text>
        <TextInput
          style={tw(`border rounded-xl px-4 py-3 mb-4 ${isDarkMode ? 'border-slate-600 text-white bg-slate-800' : 'border-gray-300 text-gray-800 bg-white'}`)}
          keyboardType="numeric"
          value={quantity}
          onChangeText={setQuantity}
        />

        <View style={tw(`p-4 mb-6 rounded-2xl ${isDarkMode ? 'bg-slate-800' : 'bg-green-50 border border-green-200'}`)}>
          <View style={tw('flex-row justify-between mb-2')}>
            <Text style={tw(`text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`)}>Price per {crop?.quantityUnit}</Text>
            <Text style={tw(`text-sm ${isDarkMode ? 'text-white' : 'text-gray-800'}`)}>{formatCurrency(crop?.price || 0)}</Text>
          </View>
          <View style={tw('flex-row justify-between mb-2')}>
            <Text style={tw(`text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`)}>Quantity</Text>
            <Text style={tw(`text-sm ${isDarkMode ? 'text-white' : 'text-gray-800'}`)}>{parseInt(quantity) || 0} {crop?.quantityUnit}</Text>
          </View>
          <View style={tw('border-t border-gray-200 my-2')} />
          <View style={tw('flex-row justify-between')}>
            <Text style={tw(`text-base font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`)}>Total</Text>
            <Text style={tw('text-lg font-bold text-green-600')}>{formatCurrency(totalPayable)}</Text>
          </View>
        </View>

        <TouchableOpacity style={tw(`py-4 rounded-xl items-center ${loading ? 'bg-green-700' : 'bg-green-800'}`)}
          onPress={handlePlaceOrder} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={tw('text-white font-semibold text-base')}>
              Place Order
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

export default OrderScreen;
