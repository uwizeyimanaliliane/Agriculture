import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator, ScrollView, Image } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { tw } from '../../utils/tw';
import { useTheme } from '../../context/ThemeContext';
import { useI18n } from '../../i18n';
import api from '../../services/api';
import BackButton from '../../components/BackButton';

const RegisterScreen = ({ navigation }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [province, setProvince] = useState('');
  const [district, setDistrict] = useState('');
  const [sector, setSector] = useState('');
  const [village, setVillage] = useState('');
  const [role, setRole] = useState('farmer');
  const [loading, setLoading] = useState(false);
  const { isDarkMode } = useTheme();
  const { t } = useI18n();

  const roles = [
    { value: 'farmer', labelKey: 'auth.farmer' },
    { value: 'buyer', labelKey: 'auth.buyer' },
    { value: 'transporter', labelKey: 'auth.transporter' },
  ];

  const handleRegister = async () => {
    if (!name || !email || !password) {
      Alert.alert(t('auth.error'), t('auth.fillRequired'));
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert(t('auth.error'), t('auth.passwordMismatch'));
      return;
    }
    setLoading(true);
    try {
      const res = await api.post('/auth/register', {
        name, email, phone, password, role,
        province, district, sector, village,
      });
      navigation.replace('EmailVerification', { email });
    } catch (error) {
      Alert.alert(t('auth.registrationFailed'), error.response?.data?.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={tw(`flex-1 px-6 pt-12 ${isDarkMode ? 'bg-slate-900' : 'bg-white'}`)}>
      <BackButton onPress={() => navigation.goBack()} />
      <Text style={tw(`text-3xl font-bold text-center mb-8 ${isDarkMode ? 'text-white' : 'text-green-800'}`)}>
        {t('auth.register')}
      </Text>

      <View style={tw(`p-6 rounded-2xl shadow-lg mb-8 ${isDarkMode ? 'bg-slate-800' : 'bg-white'}`)}>
        <TextInput
          style={tw(`border rounded-xl px-4 py-3 mb-3 ${isDarkMode ? 'border-slate-600 bg-slate-700 text-white' : 'border-green-200 bg-green-50 text-gray-800'}`)}
          placeholder={t('auth.fullName')}
          placeholderTextColor={isDarkMode ? '#94a3b8' : '#9ca3af'}
          value={name} onChangeText={setName}
        />
        <TextInput
          style={tw(`border rounded-xl px-4 py-3 mb-3 ${isDarkMode ? 'border-slate-600 bg-slate-700 text-white' : 'border-green-200 bg-green-50 text-gray-800'}`)}
          placeholder={t('auth.email')}
          placeholderTextColor={isDarkMode ? '#94a3b8' : '#9ca3af'}
          value={email} onChangeText={setEmail}
          keyboardType="email-address" autoCapitalize="none"
        />
        <TextInput
          style={tw(`border rounded-xl px-4 py-3 mb-3 ${isDarkMode ? 'border-slate-600 bg-slate-700 text-white' : 'border-green-200 bg-green-50 text-gray-800'}`)}
          placeholder={t('auth.phone')}
          placeholderTextColor={isDarkMode ? '#94a3b8' : '#9ca3af'}
          value={phone} onChangeText={setPhone}
          keyboardType="phone-pad"
        />
        <View style={tw('relative mb-3')}>
          <TextInput
            style={tw(`border rounded-xl px-4 py-3 pr-12 ${isDarkMode ? 'border-slate-600 bg-slate-700 text-white' : 'border-green-200 bg-green-50 text-gray-800'}`)}
            placeholder={t('auth.password')}
            placeholderTextColor={isDarkMode ? '#94a3b8' : '#9ca3af'}
            value={password} onChangeText={setPassword}
            secureTextEntry={!showPassword}
          />
          <TouchableOpacity style={tw('absolute right-3 top-0 bottom-0 justify-center')}
            onPress={() => setShowPassword(!showPassword)}>
            <Image
              source={showPassword ? require('../../assets/eye-off.png') : require('../../assets/eye.png')}
              style={{ width: 22, height: 22 }}
              resizeMode="contain"
            />
          </TouchableOpacity>
        </View>
        <View style={tw('relative mb-4')}>
          <TextInput
            style={tw(`border rounded-xl px-4 py-3 pr-12 ${isDarkMode ? 'border-slate-600 bg-slate-700 text-white' : 'border-green-200 bg-green-50 text-gray-800'}`)}
            placeholder={t('auth.confirmPassword')}
            placeholderTextColor={isDarkMode ? '#94a3b8' : '#9ca3af'}
            value={confirmPassword} onChangeText={setConfirmPassword}
            secureTextEntry={!showConfirmPassword}
          />
          <TouchableOpacity style={tw('absolute right-3 top-0 bottom-0 justify-center')}
            onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
            <Image
              source={showConfirmPassword ? require('../../assets/eye-off.png') : require('../../assets/eye.png')}
              style={{ width: 22, height: 22 }}
              resizeMode="contain"
            />
          </TouchableOpacity>
        </View>

        <Text style={tw(`text-sm font-semibold mt-2 mb-1 ${isDarkMode ? 'text-white' : 'text-gray-700'}`)}>{t('auth.address')}</Text>
        <TextInput
          style={tw(`border rounded-xl px-4 py-3 mb-2 ${isDarkMode ? 'border-slate-600 bg-slate-700 text-white' : 'border-green-200 bg-green-50 text-gray-800'}`)}
          placeholder={t('auth.province')}
          placeholderTextColor={isDarkMode ? '#94a3b8' : '#9ca3af'}
          value={province} onChangeText={setProvince}
        />
        <TextInput
          style={tw(`border rounded-xl px-4 py-3 mb-2 ${isDarkMode ? 'border-slate-600 bg-slate-700 text-white' : 'border-green-200 bg-green-50 text-gray-800'}`)}
          placeholder={t('auth.district')}
          placeholderTextColor={isDarkMode ? '#94a3b8' : '#9ca3af'}
          value={district} onChangeText={setDistrict}
        />
        <TextInput
          style={tw(`border rounded-xl px-4 py-3 mb-2 ${isDarkMode ? 'border-slate-600 bg-slate-700 text-white' : 'border-green-200 bg-green-50 text-gray-800'}`)}
          placeholder={t('auth.sector')}
          placeholderTextColor={isDarkMode ? '#94a3b8' : '#9ca3af'}
          value={sector} onChangeText={setSector}
        />
        <TextInput
          style={tw(`border rounded-xl px-4 py-3 mb-3 ${isDarkMode ? 'border-slate-600 bg-slate-700 text-white' : 'border-green-200 bg-green-50 text-gray-800'}`)}
          placeholder={t('auth.village')}
          placeholderTextColor={isDarkMode ? '#94a3b8' : '#9ca3af'}
          value={village} onChangeText={setVillage}
        />

        <Text style={tw(`mb-2 font-semibold ${isDarkMode ? 'text-white' : 'text-gray-700'}`)}>{t('auth.iAmA')}</Text>
        <View style={tw('flex-row gap-2 mb-4')}>
          {roles.map((r) => (
            <TouchableOpacity
              key={r.value}
              style={tw(`flex-1 py-3 rounded-lg ${role === r.value ? 'bg-green-800' : isDarkMode ? 'bg-slate-700' : 'bg-green-100'}`)}
              onPress={() => setRole(r.value)}
            >
              <Text style={tw(`text-center font-medium ${role === r.value ? 'text-white' : isDarkMode ? 'text-slate-300' : 'text-green-800'}`)}>
                {t(r.labelKey)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={tw(`py-3 rounded-xl ${loading ? 'bg-green-700' : 'bg-green-800'}`)}
          onPress={handleRegister}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={tw('text-white text-center font-semibold text-base')}>{t('auth.register')}</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={tw('py-3 mt-2 items-center')} onPress={() => navigation.goBack()}>
          <Text style={tw(`text-center font-medium ${isDarkMode ? 'text-green-400' : 'text-green-600'}`)}>
            {t('auth.hasAccount')}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

export default RegisterScreen;
