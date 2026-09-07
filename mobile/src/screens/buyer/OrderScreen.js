import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Alert, ActivityIndicator, ScrollView, TextInput } from 'react-native';
import { tw } from '../../utils/tw';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { orderAPI } from '../../services/api';
import { formatCurrency } from '../../utils/formatters';
import BackButton from '../../components/BackButton';
const OrderScreen = ({ route, navigation }) => {
  const { crop } = route.params || {};
  const { isDarkMode } = useTheme();
  const { isAuthenticated, user, setAuth } = useAuth();
  const [quantity, setQuantity] = useState(String(crop?.quantity || 1));
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState('initial');
  const [orderResult, setOrderResult] = useState(null);
  const [escrowId, setEscrowId] = useState(null);
  const [payPhone, setPayPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('mtn');
  const [paying, setPaying] = useState(false);
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [buyerContact, setBuyerContact] = useState(user?.phone || '');
  const [farmerContact, setFarmerContact] = useState(crop?.user?.phone || crop?.farmer?.contactNumber || '');
  const pollingRef = useRef(null);

  const subtotal = (crop?.price || 0) * (parseInt(quantity) || 0);
  const transportFee = parseInt(crop?.transportPrice || 0);
  const totalPayable = subtotal + transportFee;
  const orderAmount = orderResult?.escrow?.amount ?? totalPayable;
  const farmerAmount = orderResult?.escrow?.farmerAmount ?? subtotal;
  const mobileMoneyNumber = payPhone || (isAuthenticated ? buyerContact : guestPhone);
  const isMobileMoney = paymentMethod !== 'payment_code';
  const paymentNetwork = isMobileMoney ? paymentMethod : null;

  const paymentFields = (
    <>
      <Text style={tw(`text-sm font-medium mb-2 ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`)}>Payment method</Text>
      <View style={tw('flex-row mb-3')}>
        {[
          ['mtn', 'MTN Mobile Money'],
          ['payment_code', 'Payment Code'],
          ['airtel', 'Airtel Money'],
        ].map(([value, label]) => (
          <TouchableOpacity key={value} onPress={() => setPaymentMethod(value)}
            style={tw(`flex-1 py-3 mr-2 rounded-xl border items-center ${paymentMethod === value ? 'bg-green-800 border-green-800' : isDarkMode ? 'border-slate-600' : 'border-gray-300'}`)}>
            <Text style={tw(`text-xs font-semibold text-center ${paymentMethod === value ? 'text-white' : isDarkMode ? 'text-slate-300' : 'text-gray-700'}`)}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <TextInput
        style={tw(`border rounded-xl px-4 py-3 mb-3 ${isDarkMode ? 'border-slate-600 text-white bg-slate-800' : 'border-gray-300 text-gray-800 bg-white'}`)}
        placeholder={isMobileMoney ? 'Mobile money number used to pay' : 'Payment code'}
        placeholderTextColor={isDarkMode ? '#94a3b8' : '#9ca3af'}
        keyboardType={isMobileMoney ? 'phone-pad' : 'default'}
        value={isMobileMoney ? mobileMoneyNumber : payPhone}
        onChangeText={setPayPhone}
      />
    </>
  );

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

    if (!isAuthenticated) {
      if (!guestName.trim() || guestName.trim().length < 2) {
        Alert.alert('Error', 'Please enter your full name');
        return;
      }
      if (!guestPhone.trim() || guestPhone.trim().length < 10) {
        Alert.alert('Error', 'Please enter a valid phone number (e.g., 07XXXXXXXX)');
        return;
      }
      setBuyerContact(guestPhone.trim());
    } else if (!buyerContact.trim() || buyerContact.trim().length < 10) {
      Alert.alert('Error', 'Please enter a valid buyer contact number (e.g., 07XXXXXXXX)');
      return;
    }
    const paymentValue = isMobileMoney ? mobileMoneyNumber : payPhone;
    if (!paymentValue.trim() || paymentValue.trim().length < 4) {
      Alert.alert('Error', 'Please enter the mobile money number or payment code used to pay');
      return;
    }
    setLoading(true);
    try {
      let res;
      if (isAuthenticated) {
        res = await orderAPI.place({
          cropId: crop._id,
          quantity: qty,
          paymentMethod: isMobileMoney ? 'mobile_money' : 'payment_code',
          payerPhone: paymentValue.trim(),
          network: paymentNetwork,
          pickupLocation: crop.location || {},
          deliveryLocation: { contactFrom: buyerContact.trim(), contactTo: farmerContact.trim() },
        });
      } else {
        res = await orderAPI.placeGuest({
          cropId: crop._id,
          quantity: qty,
          paymentMethod: isMobileMoney ? 'mobile_money' : 'payment_code',
          payerPhone: paymentValue.trim(),
          network: paymentNetwork,
          name: guestName.trim(),
          phone: guestPhone.trim(),
          pickupLocation: crop.location || {},
          deliveryLocation: { contactFrom: guestPhone.trim(), contactTo: farmerContact.trim() },
        });
        if (res.data?.token) {
          await setAuth(res.data.token, res.data.user);
        }
      }
      setOrderResult(res.data);
      setEscrowId(res.data.escrow._id);
      setStep('paid');
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
    setPaying(true);
    try {
      const id = escrowId || orderResult?.escrow?._id;
      if (!id) { Alert.alert('Error', 'No order to pay for'); setPaying(false); return; }
      const res = await orderAPI.payWithMobileMoney(id, payPhone, paymentNetwork);
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
    const paidEscrow = orderResult?.escrow || {};
    const paidBuyer = paidEscrow.buyer || user || {};
    const paidFarmer = paidEscrow.farmer || {};
    const paidFarmerAddress = [
      paidFarmer.location?.province,
      paidFarmer.location?.district,
      paidFarmer.location?.sector,
      paidFarmer.location?.village,
    ].filter(Boolean).join(', ') || crop?.location?.district || 'Not provided';

    if (!paidEscrow.receiptConfirmedAt) {
      return (
        <View style={tw(`flex-1 ${isDarkMode ? 'bg-slate-900' : 'bg-white'}`)}>
          <View style={tw(`p-6 pt-12 ${isDarkMode ? 'bg-slate-800' : 'bg-green-800'}`)}>
            <BackButton onPress={() => navigation.navigate('MyOrders')} />
            <Text style={tw('text-white text-2xl font-bold mt-2')}>Payment Recorded</Text>
          </View>
          <View style={tw('flex-1 p-6 justify-center items-center')}>
            <Text style={tw(`text-xl font-bold text-center ${isDarkMode ? 'text-white' : 'text-gray-800'}`)}>Receipt awaiting farmer confirmation</Text>
            <Text style={tw(`text-center mt-3 ${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`)}>
              The farmer has been notified. You will be able to view and download the receipt after the farmer confirms it.
            </Text>
            <TouchableOpacity style={tw('bg-green-800 py-4 px-8 rounded-xl mt-6')} onPress={() => navigation.navigate('MyOrders')}>
              <Text style={tw('text-white font-semibold')}>View My Orders</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return (
      <View style={tw(`flex-1 ${isDarkMode ? 'bg-slate-900' : 'bg-white'}`)}>
        <View style={tw(`p-6 pt-12 ${isDarkMode ? 'bg-slate-800' : 'bg-green-800'}`)}>
          <BackButton onPress={() => navigation.navigate('MyOrders')} />
          <Text style={tw('text-white text-2xl font-bold mt-2')}>AgriLink Rwanda</Text>
        </View>
        <ScrollView style={tw('flex-1 p-4')} contentContainerStyle={{ paddingBottom: 30 }}>
          <View style={tw(`p-5 rounded-2xl ${isDarkMode ? 'bg-slate-800' : 'bg-white shadow-sm'}`)}>
            <Text style={tw(`text-xl font-bold mb-5 ${isDarkMode ? 'text-white' : 'text-gray-800'}`)}>Payment Receipt</Text>
            <View style={tw(`p-4 rounded-xl mb-4 ${isDarkMode ? 'bg-slate-700' : 'bg-green-50'}`)}>
              <Text style={tw(`text-xs uppercase ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`)}>Amount paid</Text>
              <Text style={tw('text-3xl font-bold text-green-600 mt-1')}>{formatCurrency(orderAmount)}</Text>
            </View>
            <Text style={tw(`font-semibold mb-2 ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`)}>Payment details</Text>
            {[
              ['Name of person who paid', paidBuyer.name || 'Not provided'],
              ['Payer phone', paidEscrow.payerPhone || payPhone || paidBuyer.phone || 'Not provided'],
              ['Payer email', paidBuyer.email || 'Not provided'],
              ['Payment method', paidEscrow.paymentMethod || 'Not provided'],
              ['Network', paidEscrow.network || 'Not provided'],
              ['Payment date', paidEscrow.paidAt ? new Date(paidEscrow.paidAt).toLocaleString() : new Date().toLocaleString()],
              ['Order reference', paidEscrow.transactionRef || 'Not provided'],
              ['Status', 'Payment recorded'],
            ].map(([label, value]) => (
              <View key={label} style={tw('flex-row justify-between py-2 border-b border-gray-200')}>
                <Text style={tw(`text-sm flex-1 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`)}>{label}</Text>
                <Text style={tw(`text-sm font-semibold flex-1 text-right ${isDarkMode ? 'text-white' : 'text-gray-800'}`)}>{value}</Text>
              </View>
            ))}
            <Text style={tw(`font-semibold mt-5 mb-2 ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`)}>Person paid</Text>
            <View style={tw(`p-4 rounded-xl ${isDarkMode ? 'bg-slate-700' : 'bg-gray-50'}`)}>
              <Text style={tw(`font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`)}>{paidFarmer.name || 'Farmer'}</Text>
              <Text style={tw(`text-sm mt-1 ${isDarkMode ? 'text-slate-300' : 'text-gray-600'}`)}>Phone: {paidFarmer.phone || 'Not provided'}</Text>
              <Text style={tw(`text-sm mt-1 ${isDarkMode ? 'text-slate-300' : 'text-gray-600'}`)}>Email: {paidFarmer.email || 'Not provided'}</Text>
              <Text style={tw(`text-sm mt-1 ${isDarkMode ? 'text-slate-300' : 'text-gray-600'}`)}>Address: {paidFarmerAddress}</Text>
            </View>
          </View>
          <TouchableOpacity style={tw('bg-green-800 py-4 px-8 rounded-xl w-full mb-3 items-center')}
            onPress={() => navigation.navigate('MyOrders')}>
            <Text style={tw('text-white font-semibold')}>View My Orders</Text>
          </TouchableOpacity>
        </ScrollView>
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
            A payment request of {formatCurrency(orderAmount)} has been sent to {payPhone} via {paymentNetwork === 'mtn' ? 'MTN' : 'Airtel'}.
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

          <View style={tw(`p-4 mb-4 rounded-2xl ${isDarkMode ? 'bg-slate-800' : 'bg-white'}`)}>
            <Text style={tw(`font-semibold text-base mb-3 ${isDarkMode ? 'text-white' : 'text-gray-800'}`)}>Order Summary</Text>
            <View style={tw('flex-row justify-between mb-2')}>
              <Text style={tw(`text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`)}>Price per {orderResult?.escrow?.crop?.quantityUnit || 'unit'}</Text>
              <Text style={tw(`text-sm ${isDarkMode ? 'text-white' : 'text-gray-800'}`)}>{formatCurrency(orderResult?.escrow?.crop?.price || crop?.price || 0)}</Text>
            </View>
            <View style={tw('flex-row justify-between mb-2')}>
              <Text style={tw(`text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`)}>Quantity ordered</Text>
              <Text style={tw(`text-sm ${isDarkMode ? 'text-white' : 'text-gray-800'}`)}>
                {(orderResult?.escrow?.quantity ?? (parseInt(quantity) || 0))} {orderResult?.escrow?.quantityUnit || crop?.quantityUnit || ''}
              </Text>
            </View>
            <View style={tw('border-t border-gray-200 my-2')} />
            <View style={tw('flex-row justify-between')}>
              <Text style={tw(`text-base font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`)}>Total</Text>
              <Text style={tw('text-lg font-bold text-green-600')}>{formatCurrency(orderAmount)}</Text>
            </View>
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

          <View style={tw(`p-4 mb-4 rounded-2xl ${isDarkMode ? 'bg-slate-800' : 'bg-white'}`)}>
            <Text style={tw(`text-sm font-semibold mb-2 ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`)}>Pay the Farmer</Text>
            <Text style={tw(`text-xs mb-2 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`)}>
              Payment details were submitted with the order and will be reviewed by admin.
            </Text>
            <View style={tw(`p-4 rounded-xl ${isDarkMode ? 'bg-slate-700' : 'bg-gray-50'}`)}>
              <Text style={tw(`text-sm ${isDarkMode ? 'text-slate-300' : 'text-gray-600'}`)}>Farmer Full Name</Text>
              <Text style={tw('text-base font-bold mb-2')}>{orderResult?.escrow?.farmer?.name || 'Farmer'}</Text>
              <Text style={tw(`text-sm ${isDarkMode ? 'text-slate-300' : 'text-gray-600'}`)}>Phone Number</Text>
              <Text style={tw('text-lg font-semibold mb-2')}>{orderResult?.escrow?.farmer?.phone || 'No number available'}</Text>
              <Text style={tw(`text-sm ${isDarkMode ? 'text-slate-300' : 'text-gray-600'}`)}>Email</Text>
              <Text style={tw('text-base font-medium')}>{orderResult?.escrow?.farmer?.email || 'No email available'}</Text>
            </View>
          </View>

          <Text style={tw(`text-center text-xs mb-6 ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`)}>
            Payment information was submitted with this order. Admins will review it before release to the farmer.
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
            {formatCurrency(crop?.price)} per {crop?.quantityUnit}
          </Text>
          <Text style={tw(`text-xs mt-1 ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`)}>
            Available: {crop?.quantity} {crop?.quantityUnit}
          </Text>
          {(() => {
            const qty = parseInt(quantity) || 0;
            const remaining = (crop?.quantity || 0) - qty;
            return (
              <Text style={tw(`text-xs mt-1 ${remaining >= 0 ? 'text-green-600' : 'text-red-500'}`)}>
                {qty > 0 && remaining >= 0 ? `Remaining after this order: ${remaining} ${crop?.quantityUnit}` : ''}
              </Text>
            );
          })()}
          <Text style={tw(`text-xs mt-1 ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`)}>
            Farmer: {crop?.user?.name || '—'}
          </Text>
          <Text style={tw(`text-xs mt-1 ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`)}>
            Farmer phone: {farmerContact || '—'}
          </Text>
          <Text style={tw(`text-xs mt-1 ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`)}>
            {crop?.user?.email ? `Email: ${crop.user.email}` : ''}
          </Text>
          <Text style={tw(`text-xs mt-1 ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`)}>
            Farmer address: {[crop?.farmer?.address?.province || crop?.location?.province, crop?.farmer?.address?.district || crop?.location?.district, crop?.farmer?.address?.sector || crop?.location?.sector, crop?.farmer?.address?.cell || crop?.location?.cell].filter(Boolean).join(', ') || 'Unknown'}
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

        {isAuthenticated && (
          <>
            <Text style={tw(`text-sm font-medium mb-2 ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`)}>
              Buyer contact (From)
            </Text>
            <TextInput
              style={tw(`border rounded-xl px-4 py-3 mb-4 ${isDarkMode ? 'border-slate-600 text-white bg-slate-800' : 'border-gray-300 text-gray-800 bg-white'}`)}
              placeholder="Buyer phone number"
              placeholderTextColor={isDarkMode ? '#94a3b8' : '#9ca3af'}
              keyboardType="phone-pad"
              value={buyerContact}
              onChangeText={(value) => {
                setBuyerContact(value);
                setPayPhone(value);
              }}
            />
          </>
        )}

        {isAuthenticated && (
          <>
            <Text style={tw(`text-sm font-medium mb-2 ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`)}>
              Farmer contact (To)
            </Text>
            <TextInput
              style={tw(`border rounded-xl px-4 py-3 mb-4 ${isDarkMode ? 'border-slate-600 text-slate-400 bg-slate-800' : 'border-gray-300 text-gray-500 bg-gray-100'}`)}
              value={farmerContact}
              editable={false}
            />
          </>
        )}

        {isAuthenticated && paymentFields}

        {!isAuthenticated && (
          <View style={tw(`p-4 mb-4 rounded-2xl ${isDarkMode ? 'bg-slate-800' : 'bg-blue-50 border border-blue-200'}`)}>
            <Text style={tw(`text-sm font-semibold mb-1 ${isDarkMode ? 'text-blue-300' : 'text-blue-800'}`)}>
              ℹ️ Ordering as Guest
            </Text>
            <Text style={tw(`text-xs mb-3 ${isDarkMode ? 'text-blue-200' : 'text-blue-700'}`)}>
              You are ordering without an account. Enter your details below to continue.
            </Text>
            <TextInput
              style={tw(`border rounded-xl px-4 py-3 mb-3 ${isDarkMode ? 'border-slate-600 text-white bg-slate-800' : 'border-gray-300 text-gray-800 bg-white'}`)}
              placeholder="Full Name"
              placeholderTextColor={isDarkMode ? '#94a3b8' : '#9ca3af'}
              value={guestName}
              onChangeText={setGuestName}
            />
            <Text style={tw(`text-sm font-medium mb-2 ${isDarkMode ? 'text-blue-200' : 'text-gray-700'}`)}>
              Buyer contact (From)
            </Text>
            <TextInput
              style={tw(`border rounded-xl px-4 py-3 ${isDarkMode ? 'border-slate-600 text-white bg-slate-800' : 'border-gray-300 text-gray-800 bg-white'}`)}
              placeholder="Buyer phone number"
              placeholderTextColor={isDarkMode ? '#94a3b8' : '#9ca3af'}
              keyboardType="phone-pad"
              value={guestPhone}
              onChangeText={(value) => {
                setGuestPhone(value);
                setPayPhone(value);
              }}
            />
            <Text style={tw(`text-sm font-medium mt-3 mb-2 ${isDarkMode ? 'text-blue-200' : 'text-gray-700'}`)}>
              Farmer contact (To)
            </Text>
            <TextInput
              style={tw(`border rounded-xl px-4 py-3 mb-3 ${isDarkMode ? 'border-slate-600 text-slate-400 bg-slate-800' : 'border-gray-300 text-gray-500 bg-gray-100'}`)}
              value={farmerContact}
              editable={false}
            />
            {paymentFields}
          </View>
        )}

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
