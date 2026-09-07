import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, ScrollView, TextInput, Image, Platform } from 'react-native';
import { VideoView, useVideoPlayer } from 'expo-video';
import * as ImagePicker from 'expo-image-picker';
import { File as ExpoFile } from 'expo-file-system';
import { useFocusEffect } from '@react-navigation/native';
import { tw } from '../../utils/tw';
import { useTheme } from '../../context/ThemeContext';
import { useI18n } from '../../i18n';
import { farmerAPI, uploadMultipart } from '../../services/api';
import { getStatusColor, districts } from '../../utils/formatters';
import { useAuth } from '../../context/AuthContext';
import BackButton from '../../components/BackButton';
import { alert } from '../../utils/platform';

const POST_FEE = 2000;
const DEFAULT_PAYEE = { phone: '0781793232', name: 'Agri-Link Admin' };

const provinces = ['Kigali City', 'Northern', 'Southern', 'Eastern', 'Western'];

const fieldStyles = (isDarkMode) => tw(`border rounded-xl px-4 py-3 mb-3 ${isDarkMode ? 'border-slate-600 text-white bg-slate-800' : 'border-gray-300 text-gray-800 bg-white'}`);

const VerificationScreen = ({ navigation, route }) => {
  const { isDarkMode } = useTheme();
  const { t } = useI18n();
  const { user } = useAuth();
  const openedForNewCrop = route?.params?.fromAddCrop === true;
  const [verification, setVerification] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [paying, setPaying] = useState(false);
  const [verificationSubmitted, setVerificationSubmitted] = useState(false);

  const [form, setForm] = useState({
    firstName: user?.name?.split(' ')[0] || '',
    lastName: user?.name?.split(' ').slice(1).join(' ') || '',
    email: user?.email || '',
    contactNumber: user?.phone || '',
    province: '',
    district: '',
    sector: '',
    cell: '',
  });
  const [productImage, setProductImage] = useState(null);
  const [farmVideo, setFarmVideo] = useState(null);
  const [payPhone, setPayPhone] = useState('');
  const [payNetwork, setPayNetwork] = useState('');
  const [payCode, setPayCode] = useState('');
  const [payMethod, setPayMethod] = useState('mobile');
  const [payee, setPayee] = useState(DEFAULT_PAYEE);
  const player = useVideoPlayer(farmVideo ? { uri: farmVideo.uri } : null, (player) => {
    player.pause();
  });

  const networks = [
    { value: 'mtn', label: 'MTN Mobile Money', icon: '📱' },
    { value: 'airtel', label: 'Airtel Money', icon: '📲' },
  ];

  const set = (key) => (value) => setForm(prev => ({ ...prev, [key]: value }));

  const fetchStatus = useCallback(async () => {
    try {
      const response = await farmerAPI.getVerificationStatus();
      setVerification(response.data.farmer);
      if (response.data.payee) {
        setPayee(response.data.payee);
      }
      if (response.data.farmer?.address?.province) {
        setForm(prev => ({ ...prev, ...response.data.farmer.address }));
      }
    } catch (error) {
      console.error('Failed to load verification status');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    // Poll while this screen is open so that once the admin approves, the
    // farmer automatically sees the "Add New Crop" / payment section without
    // navigating away and back.
    fetchStatus();
    const interval = setInterval(fetchStatus, 10000);
    return () => clearInterval(interval);
  }, [fetchStatus]));

  const pickImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      alert('Permission Needed', 'Allow access to your photos to upload a product image.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 0.8 });
    if (!result.canceled && result.assets?.[0]) {
      setProductImage(result.assets[0]);
    }
  };

  const pickVideo = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      alert('Permission Needed', 'Allow access to your videos to upload your farm video.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['videos'], allowsEditing: true, quality: 0.7 });
    if (!result.canceled && result.assets?.[0]) {
      setFarmVideo(result.assets[0]);
    }
  };

  const appendMediaFile = async (fd, field, asset) => {
    if (!asset?.uri) return;

    const resolvedName = asset.fileName || asset.name || asset.uri.split('/').pop() || `${field}.bin`;
    let resolvedType = asset.mimeType || asset.type || (field === 'farmVideo' ? 'video/mp4' : 'image/jpeg');
    if (resolvedType === 'video' || resolvedType === 'image') {
      resolvedType = field === 'farmVideo' ? 'video/mp4' : 'image/jpeg';
    }

    if (Platform.OS === 'web') {
      try {
        const response = await fetch(asset.uri);
        const blob = await response.blob();
        const file = new File([blob], resolvedName, { type: resolvedType });
        fd.append(field, file);
        return;
      } catch (err) {
        // fallback: if fetching fails, attempt to append a plain object (some servers accept this)
        fd.append(field, { uri: asset.uri, name: resolvedName, type: resolvedType });
        return;
      }
    }

    // Native: build a real Blob from the file so React Native's FormData
    // recognizes it as a valid file part (avoiding "unsupported FormDataPart").
    const source = new ExpoFile(asset.uri);
    const fileBlob = source.slice(0, undefined, resolvedType);
    fd.append(field, fileBlob, resolvedName);
  };

  const handleSubmit = async () => {
    if (!form.firstName || !form.lastName || !form.contactNumber || !form.province || !form.district) {
      alert(t('auth.error'), 'Please fill in your first name, last name, contact number, province and district.');
      return;
    }
    if (!productImage || !farmVideo) {
      alert(t('auth.error'), 'Please upload a photo of your crops/products and a video of you in your farm.');
      return;
    }

    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('firstName', form.firstName);
      fd.append('lastName', form.lastName);
      fd.append('email', form.email);
      fd.append('contactNumber', form.contactNumber);
      fd.append('province', form.province);
      fd.append('district', form.district);
      fd.append('sector', form.sector);
      fd.append('cell', form.cell);

      await appendMediaFile(fd, 'productImage', productImage);
      await appendMediaFile(fd, 'farmVideo', farmVideo);

      const res = await uploadMultipart('/farmers/verification-request', fd);
      setVerification(prev => ({
        ...(prev || {}),
        verificationStatus: 'in_review',
        postFeePaid: false,
        postFeeStatus: 'none',
      }));
      setVerificationSubmitted(true);
      alert(t('common.success'), res.data?.message || 'Verification request submitted for review.');
      fetchStatus();
    } catch (err) {
      const serverMsg = err.response?.data?.message
        || err.response?.data?.error
        || err.response?.data
        || err.message
        || 'Failed to submit verification request';
      const msg = typeof serverMsg === 'string' ? serverMsg : JSON.stringify(serverMsg);
      alert(t('auth.error'), msg);
    } finally {
      setSubmitting(false);
    }
  };

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
      alert(t('common.success'), res.data?.message || 'Post fee payment submitted. Awaiting admin confirmation.');
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

  const status = verification?.verificationStatus || 'pending';
  const statusColor = getStatusColor(status);
  const isVerified = status === 'verified';

  // Step-based flow:
  // 1) Not verified => show the verification form (pending/rejected)
  // 2) in_review    => waiting for admin to approve verification
  // 3) verified     => farmer can add a product; then pays the post fee using a
  //                    payment code OR their mobile money number. The admin sees
  //                    the product + payment, confirms the payment, then approves
  //                    the product which posts it automatically to buyers.
  const feeStatus = verification?.postFeeStatus || 'none';
  const showVerificationForm = openedForNewCrop
    ? (!verificationSubmitted || status === 'rejected') && ['pending', 'rejected', 'verified'].includes(status)
    : status === 'pending' || status === 'rejected';
  const awaitingVerification = status === 'in_review';
  // Payment belongs to the crop-specific screen opened after a new crop is submitted.
  const showPaymentForm = false;
  const awaitingPayment = isVerified && feeStatus === 'pending';
  const feeConfirmed = isVerified && feeStatus === 'confirmed' && verification?.postFeePaid === true;

  const paidFromLabel = verification?.postFeeCode
    ? `Code: ${verification.postFeeCode}`
    : `${verification?.postFeePhone || '—'} (${verification?.postFeeNetwork ? (verification.postFeeNetwork === 'mtn' ? 'MTN' : 'Airtel') : '—'})`;

  return (
    <ScrollView style={tw(`flex-1 p-6 ${isDarkMode ? 'bg-slate-900' : 'bg-white'}`)}>
      <BackButton onPress={() => navigation.goBack()} />
      {!isVerified && (
        <>
          <Text style={tw(`text-2xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-green-800'}`)}>{t('farmer.verification')}</Text>
          <Text style={tw(`mb-6 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`)}>{t('verif.applySubtitle')}</Text>

          <View style={tw(`p-5 rounded-2xl mb-6 shadow-sm ${isDarkMode ? 'bg-slate-800' : 'bg-white'}`)}>
            <View style={tw('flex-row justify-between items-center mb-2')}>
              <Text style={tw(`font-semibold text-lg ${isDarkMode ? 'text-white' : 'text-gray-800'}`)}>{t('verif.status')}</Text>
              <View style={{ backgroundColor: statusColor + '20', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 999 }}>
                <Text style={{ color: statusColor, fontSize: 13, fontWeight: '600' }}>{status.replace('_', ' ')}</Text>
              </View>
            </View>

            {status === 'rejected' && (
              <View style={tw('bg-red-100 p-4 rounded-xl mb-3')}>
                <Text style={tw('text-red-800 font-bold text-base')}>{t('verif.sorry')}</Text>
                <Text style={tw('text-red-700 text-sm mt-1')}>{verification?.verificationReason || t('verif.rejectedMsg')}</Text>
                <Text style={tw('text-red-700 text-sm mt-1')}>{t('verif.resubmitHint')}</Text>
              </View>
            )}
          </View>
        </>
      )}

      {/* Step 2: waiting for admin to approve verification */}
      {awaitingVerification && (
        <View style={tw(`p-5 rounded-2xl mb-6 items-center shadow-sm ${isDarkMode ? 'bg-slate-800' : 'bg-amber-50 border border-amber-200'}`)}>
          <Text style={{ fontSize: 40, marginBottom: 12 }}>⏳</Text>
          <Text style={tw(`text-lg font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-800'}`)}>
            Verification Under Review
          </Text>
          <Text style={tw(`text-sm text-center mb-4 ${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`)}>
            Your verification form has been submitted. Please wait for the admin to review and approve it.
          </Text>
          <Text style={tw(`text-xs text-center mb-4 ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`)}>
            Once approved, you can add a new crop and pay the post fee right away.
          </Text>
          <TouchableOpacity style={tw(`px-5 py-3 rounded-xl ${isDarkMode ? 'bg-slate-700' : 'bg-white border border-green-300'}`)}
            onPress={fetchStatus}>
            <Text style={tw(`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-green-800'}`)}>Refresh Status</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Step 1: verification form */}
      {showVerificationForm && (
        <View style={tw(`p-5 rounded-2xl mb-6 shadow-sm ${isDarkMode ? 'bg-slate-800' : 'bg-white'}`)}>
          <Text style={tw(`font-semibold text-lg mb-1 ${isDarkMode ? 'text-white' : 'text-gray-800'}`)}>{t('verif.personalInfo')}</Text>
          <Text style={tw(`text-sm mb-4 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`)}>{t('verif.fillForm')}</Text>

          <TextInput style={fieldStyles(isDarkMode)} placeholder={t('verif.firstName')} placeholderTextColor={isDarkMode ? '#94a3b8' : '#9ca3af'} value={form.firstName} onChangeText={set('firstName')} />
          <TextInput style={fieldStyles(isDarkMode)} placeholder={t('verif.lastName')} placeholderTextColor={isDarkMode ? '#94a3b8' : '#9ca3af'} value={form.lastName} onChangeText={set('lastName')} />
          <TextInput style={fieldStyles(isDarkMode)} placeholder={t('auth.email')} placeholderTextColor={isDarkMode ? '#94a3b8' : '#9ca3af'} value={form.email} onChangeText={set('email')} keyboardType="email-address" />
          <TextInput style={fieldStyles(isDarkMode)} placeholder={t('auth.phone')} placeholderTextColor={isDarkMode ? '#94a3b8' : '#9ca3af'} value={form.contactNumber} onChangeText={set('contactNumber')} keyboardType="phone-pad" />

          <Text style={tw(`text-sm font-semibold mb-2 mt-2 ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`)}>{t('verif.address')}</Text>
          <TextInput style={fieldStyles(isDarkMode)} placeholder={t('verif.province')}
            placeholderTextColor={isDarkMode ? '#94a3b8' : '#9ca3af'} value={form.province} onChangeText={set('province')} />
          <TextInput style={fieldStyles(isDarkMode)} placeholder={t('verif.district')}
            placeholderTextColor={isDarkMode ? '#94a3b8' : '#9ca3af'} value={form.district} onChangeText={set('district')} />
          <TextInput style={fieldStyles(isDarkMode)} placeholder={t('verif.sector')} placeholderTextColor={isDarkMode ? '#94a3b8' : '#9ca3af'} value={form.sector} onChangeText={set('sector')} />
          <TextInput style={fieldStyles(isDarkMode)} placeholder={t('verif.cell')} placeholderTextColor={isDarkMode ? '#94a3b8' : '#9ca3af'} value={form.cell} onChangeText={set('cell')} />

          <Text style={tw(`text-sm font-semibold mb-2 mt-2 ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`)}>{t('verif.uploadSection')}</Text>

          <TouchableOpacity style={tw(`mb-3 p-4 rounded-xl items-center border-2 border-dashed ${isDarkMode ? 'border-slate-600' : 'border-gray-300'}`)}
            onPress={pickImage}>
            {productImage ? (
              <Image source={{ uri: productImage.uri }} style={tw('w-24 h-24 rounded-xl mb-2')} />
            ) : (
              <Text style={{ fontSize: 32, color: '#000000' }}>📷</Text>
            )}
            <Text style={tw(`text-sm font-medium ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`)}>
              {productImage ? t('verif.imageSelected') : t('verif.uploadCropImage')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={tw(`mb-4 p-4 rounded-xl items-center border-2 border-dashed ${isDarkMode ? 'border-slate-600' : 'border-gray-300'}`)}
            onPress={pickVideo}>
            {farmVideo ? (
              <View style={tw('mb-2 w-full items-center')}>
                <VideoView
                  player={player}
                  style={tw('w-full h-48 rounded-xl')}
                  nativeControls
                  contentFit="cover"
                />
              </View>
            ) : (
              <Text style={{ fontSize: 32, color: '#000000' }}>🎬</Text>
            )}
            <Text style={tw(`text-sm font-medium ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`)}>
              {farmVideo ? `✓ ${t('verif.videoSelected')}` : t('verif.uploadFarmVideo')}
            </Text>
            <Text style={tw(`text-xs mt-1 ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`)}>{t('verif.videoHint')}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={tw(`py-4 rounded-xl items-center ${submitting ? 'bg-green-700' : 'bg-green-800'}`)}
            onPress={handleSubmit} disabled={submitting}>
            {submitting ? <ActivityIndicator color="white" /> : <Text style={tw('text-white font-semibold text-base')}>{t('verif.submitRequest')}</Text>}
          </TouchableOpacity>
        </View>
      )}

      {/* Step 3a: farmer verification approved => farmer can add a product */}
      {isVerified && !showVerificationForm && !awaitingVerification && (
        <View style={tw(`p-5 rounded-2xl mb-6 shadow-sm ${isDarkMode ? 'bg-slate-800' : 'bg-green-50 border border-green-200'}`)}>
          <Text style={tw('text-green-700 font-semibold text-base')}>✓ Farmer Verification Approved</Text>
          <Text style={tw(`text-sm mt-1 mb-4 ${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`)}>
            You can now add a product. After adding it, pay the post fee so the admin can approve it — approved products are posted automatically to buyers.
          </Text>
          <TouchableOpacity style={tw('py-4 rounded-xl items-center bg-green-800')}
            onPress={() => navigation.navigate(openedForNewCrop ? 'AddCrop' : 'AddCropGateway')}>
            <Text style={tw('text-white font-semibold text-base')}>🌱 {t('farmer.addNewCrop')}</Text>
          </TouchableOpacity>
          <Text style={tw(`text-center text-xs mt-3 ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`)}>
            Your product is submitted for admin review (not shown to buyers yet).
          </Text>
        </View>
      )}

      {/* Step 4: product is with admin, waiting for approval — then it posts automatically */}
      {awaitingPayment && (
        <View style={tw(`p-5 rounded-2xl mb-6 items-center shadow-sm ${isDarkMode ? 'bg-slate-800' : 'bg-amber-50 border border-amber-200'}`)}>
          <Text style={{ fontSize: 40, marginBottom: 12 }}>⏳</Text>
          <Text style={tw(`text-lg font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-800'}`)}>
            Payment Received — Product Under Review
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
            The admin will approve your product and it will be posted to buyers automatically — no further action needed.
          </Text>
        </View>
      )}

      {/* Step 3b: verified => post fee payment form (code OR mobile number) */}
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
            Sent to {payee.phone} ({payee.name}) · the admin approves your product and it posts automatically
          </Text>
        </View>
      )}

      {/* Step 5: payment confirmed => product is with admin, posted on approval */}
      {feeConfirmed && (
        <View style={tw(`p-5 rounded-2xl mb-6 shadow-sm ${isDarkMode ? 'bg-slate-800' : 'bg-green-50 border border-green-200'}`)}>
          <Text style={tw('text-green-700 font-semibold text-base')}>✓ {t('verif.feePaid')}</Text>
          <Text style={tw(`text-sm mt-1 mb-4 ${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`)}>
            Payment confirmed. Your product is being reviewed by the admin — once approved, it will be posted to buyers automatically.
          </Text>
          <TouchableOpacity style={tw('py-4 rounded-xl items-center bg-green-800')}
            onPress={() => navigation.navigate('AddCropGateway')}>
            <Text style={tw('text-white font-semibold text-base')}>🌱 {t('farmer.addNewCrop')}</Text>
          </TouchableOpacity>
          <Text style={tw(`text-center text-xs mt-3 ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`)}>
            One product at a time: finish the current product (approved or rejected) before adding another.
          </Text>
        </View>
      )}

    </ScrollView>
  );
};

export default VerificationScreen;
