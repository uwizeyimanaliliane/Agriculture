import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, ScrollView, TextInput } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { tw } from '../../utils/tw';
import { useTheme } from '../../context/ThemeContext';
import { useI18n } from '../../i18n';
import { farmerAPI } from '../../services/api';
import { alert } from '../../utils/platform';

const POST_FEE = 2000;
const DEFAULT_PAYEE = { phone: '0781793232', name: 'Agri-Link Admin' };

const networks = [
  { value: 'mtn', label: 'MTN Mobile Money', icon: '📱' },
  { value: 'airtel', label: 'Airtel Money', icon: '📲' },
];

const fieldStyles = (isDarkMode) => tw(`border rounded-xl px-4 py-3 mb-3 ${isDarkMode ? 'border-slate-600 text-white bg-slate-800' : 'border-gray-300 text-gray-800 bg-white'}`);

const CropPaymentScreen = ({ navigation, route }) => {
  const { isDarkMode } = useTheme();
  const { t } = useI18n();
  const cropId = route.params?.cropId;
  const cropName = route.params?.cropName;

  const [verification, setVerification] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [payMethod, setPayMethod] = useState('mobile');
  const [payPhone, setPayPhone] = useState('');
  const [payNetwork, setPayNetwork] = useState('');
  const [payCode, setPayCode] = useState('');
  const [payee, setPayee] = useState(DEFAULT_PAYEE);

  const fetchStatus = useCallback(async () => {
    try {
      const response = await farmerAPI.getVerificationStatus();
      setVerification(response.data.farmer);
      if (response.data.payee) {
        setPayee(response.data.payee);
      }
    } catch (error) {
      console.error('Failed to load verification status');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    fetchStatus();
  }, [fetchStatus]));

  const feeStatus = verification?.postFeeStatus || 'none';
  const isVerified = verification?.verificationStatus === 'verified';
  const showPaymentForm = isVerified && (feeStatus === 'none' || feeStatus === 'rejected');
  const awaitingPayment = isVerified && feeStatus === 'pending';

  const paidFromLabel = verification?.postFeeCode
    ? `Code: ${verification.postFeeCode}`
    : `${verification?.postFeePhone || '—'} (${verification?.postFeeNetwork ? (verification.postFeeNetwork === 'mtn' ? 'MTN' : 'Airtel') : '—'})`;

  const handlePayPostFee = async () => {
    if (payMethod === 'mobile') {
      if (!payPhone || payPhone.length < 10) {
        alert(t('auth.error'), 'Enter a valid phone number (e.g., 07XXXXXXXX).');
        return;
      }
      if (!payNetwork) {
        alert(t('auth.error'), 'Select your mobile network (MTN or Airtel).');
        return;
      }
    } else {
      if (!payCode || payCode.trim().length < 4) {
        alert(t('auth.error'), 'Enter the payment code you received after sending the money.');
        return;
      }
    }
    setPaying(true);
    try {
      const payload = payMethod === 'mobile'
        ? { phone: payPhone, network: payNetwork }
        : { paymentCode: payCode.trim() };
      const res = await farmerAPI.payPostFee(payload);
      alert(t('common.success'), res.data?.message || 'Post fee payment submitted. The admin will review your product.');
      await fetchStatus();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to submit post fee payment';
      alert(t('auth.error'), msg);
    } finally {
      setPaying(false);
    }
  };

  if (loading) {
    return (
      <View style={tw(`flex-1 justify-center items-center ${isDarkMode ? 'bg-slate-900' : 'bg-white'}`)}>
        <ActivityIndicator size="large" color="#16a34a" />
      </View>
    );
  }

  return (
    <ScrollView style={tw(`flex-1 p-6 ${isDarkMode ? 'bg-slate-900' : 'bg-white'}`)}>
      <TouchableOpacity style={tw(`flex-row items-center self-start px-4 py-2.5 rounded-full ${isDarkMode ? 'bg-slate-700' : 'bg-green-600'}`)}
        onPress={() => navigation.navigate('MyCrops')} activeOpacity={0.7}>
        <Text style={tw('text-white text-lg mr-2')}>←</Text>
        <Text style={tw('text-white text-base font-medium')}>Back</Text>
      </TouchableOpacity>

      <Text style={tw(`text-2xl font-bold mb-2 mt-4 ${isDarkMode ? 'text-white' : 'text-green-800'}`)}>Pay Post Fee</Text>
      <Text style={tw(`mb-6 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`)}>
        Product added{cropName ? `: ${cropName}` : ''}. Pay the {POST_FEE.toLocaleString()} RWF post fee so the admin can review it.
      </Text>

      {awaitingPayment && (
        <View style={tw(`p-5 rounded-2xl mb-6 items-center shadow-sm ${isDarkMode ? 'bg-slate-800' : 'bg-amber-50 border border-amber-200'}`)}>
          <Text style={{ fontSize: 40, marginBottom: 12 }}>⏳</Text>
          <Text style={tw(`text-lg font-bold mb-2 text-center ${isDarkMode ? 'text-white' : 'text-gray-800'}`)}>
            Payment Received — Awaiting Admin Decision
          </Text>
          <Text style={tw(`text-sm text-center ${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`)}>
            Money sent to {payee.name} ({payee.phone}).
          </Text>
          <View style={tw(`p-3 rounded-xl mt-4 w-full ${isDarkMode ? 'bg-slate-700' : 'bg-white'}`)}>
            <Text style={tw(`text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`)}>
              {t('verif.paidFrom')}: {paidFromLabel}
            </Text>
          </View>
          <Text style={tw(`text-xs text-center mt-4 ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`)}>
            The admin will either approve — which posts your product directly to buyers — or reject it.
          </Text>
        </View>
      )}

      {showPaymentForm && (
        <View style={tw(`p-5 rounded-2xl mb-6 shadow-sm ${isDarkMode ? 'bg-slate-800' : 'bg-white'}`)}>
          <Text style={tw(`font-semibold text-lg mb-1 ${isDarkMode ? 'text-white' : 'text-gray-800'}`)}>💳 {t('verif.postFee')}</Text>
          <Text style={tw(`text-sm mb-4 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`)}>
            {t('verif.postFeeDesc')} {POST_FEE.toLocaleString()} RWF.
          </Text>

          <View style={tw(`p-3 rounded-xl mb-4 ${isDarkMode ? 'bg-green-900/30 border border-green-700' : 'bg-green-50 border border-green-200'}`)}>
            <Text style={tw(`text-xs ${isDarkMode ? 'text-green-300' : 'text-green-700'}`)}>Money goes to (send to this number)</Text>
            <Text style={tw(`text-base font-bold ${isDarkMode ? 'text-white' : 'text-green-900'}`)}>📱 {payee.phone}</Text>
            <Text style={tw(`text-xs ${isDarkMode ? 'text-green-300' : 'text-green-700'}`)}>{payee.name}</Text>
          </View>

          {feeStatus === 'rejected' && (
            <View style={tw(`p-3 rounded-xl mb-4 ${isDarkMode ? 'bg-red-900/40' : 'bg-red-100'}`)}>
              <Text style={tw(`text-sm ${isDarkMode ? 'text-red-300' : 'text-red-700'}`)}>
                {verification?.postFeeReason || t('verif.feeRejectedDesc')}
              </Text>
            </View>
          )}

          <View style={tw('flex-row gap-2 mb-4')}>
            <TouchableOpacity style={tw(`flex-1 py-3 rounded-xl items-center ${payMethod === 'mobile' ? 'bg-green-800' : isDarkMode ? 'bg-slate-700' : 'bg-gray-100'}`)}
              onPress={() => setPayMethod('mobile')}>
              <Text style={tw(`text-sm font-medium ${payMethod === 'mobile' ? 'text-white' : isDarkMode ? 'text-slate-300' : 'text-gray-700'}`)}>📱 Mobile Number</Text>
            </TouchableOpacity>
            <TouchableOpacity style={tw(`flex-1 py-3 rounded-xl items-center ${payMethod === 'code' ? 'bg-green-800' : isDarkMode ? 'bg-slate-700' : 'bg-gray-100'}`)}
              onPress={() => setPayMethod('code')}>
              <Text style={tw(`text-sm font-medium ${payMethod === 'code' ? 'text-white' : isDarkMode ? 'text-slate-300' : 'text-gray-700'}`)}>🔑 Payment Code</Text>
            </TouchableOpacity>
          </View>

          {payMethod === 'mobile' ? (
            <>
              <Text style={tw(`text-sm font-semibold mb-2 ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`)}>{t('verif.selectNetwork')}</Text>
              <View style={tw('flex-row gap-2 mb-4')}>
                {networks.map((n) => (
                  <TouchableOpacity key={n.value}
                    style={tw(`flex-1 py-3 rounded-xl items-center ${payNetwork === n.value ? 'bg-green-800' : isDarkMode ? 'bg-slate-700' : 'bg-green-100'}`)}
                    onPress={() => setPayNetwork(n.value)}>
                    <Text style={{ fontSize: 20, color: '#000000', marginBottom: 4 }}>{n.icon}</Text>
                    <Text style={tw(`text-xs font-medium ${payNetwork === n.value ? 'text-white' : isDarkMode ? 'text-slate-300' : 'text-green-800'}`)}>{n.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TextInput style={fieldStyles(isDarkMode)} placeholder="Your mobile money number (e.g. 07XXXXXXXX)"
                placeholderTextColor={isDarkMode ? '#94a3b8' : '#9ca3af'}
                keyboardType="phone-pad" value={payPhone} onChangeText={setPayPhone} />
              <Text style={tw(`text-xs mb-3 ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`)}>
                A USSD payment request will be sent to this number. Approve it there to pay {payee.phone}.
              </Text>
            </>
          ) : (
            <>
              <TextInput style={fieldStyles(isDarkMode)} placeholder="Payment code (e.g. transfer/MoMo code)"
                placeholderTextColor={isDarkMode ? '#94a3b8' : '#9ca3af'}
                value={payCode} onChangeText={setPayCode} autoCapitalize="characters" />
              <Text style={tw(`text-xs mb-3 ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`)}>
                Send {POST_FEE.toLocaleString()} RWF to {payee.phone} ({payee.name}) from your mobile money, then enter the code/reference from your transaction receipt.
              </Text>
            </>
          )}

          <TouchableOpacity style={tw(`py-4 rounded-xl items-center mb-2 ${paying ? 'bg-green-700' : 'bg-green-800'}`)}
            onPress={handlePayPostFee} disabled={paying}>
            {paying ? <ActivityIndicator color="white" /> : (
              <Text style={tw('text-white font-semibold text-base')}>
                {t('verif.payPostFee')} · {POST_FEE.toLocaleString()} RWF
              </Text>
            )}
          </TouchableOpacity>
          <Text style={tw(`text-center text-xs ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`)}>
            Sent to {payee.phone} ({payee.name}) · the admin approves or rejects your product
          </Text>
        </View>
      )}

      {(awaitingPayment || (isVerified && feeStatus === 'confirmed')) && (
        <TouchableOpacity style={tw('py-4 rounded-xl items-center mb-10 bg-green-800')}
          onPress={() => navigation.navigate('MyCrops')}>
          <Text style={tw('text-white font-semibold text-base')}>🌱 View My Products</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
};

export default CropPaymentScreen;