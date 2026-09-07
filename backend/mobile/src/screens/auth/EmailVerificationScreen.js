import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { tw } from '../../utils/tw';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useI18n } from '../../i18n';
import api from '../../services/api';
import BackButton from '../../components/BackButton';

const EmailVerificationScreen = ({ route, navigation }) => {
  const email = route?.params?.email || '';
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [timer, setTimer] = useState(0);
  const inputRefs = useRef([]);
  const { isDarkMode } = useTheme();
  const { setAuth } = useAuth();
  const { t } = useI18n();

  useEffect(() => {
    let interval;
    if (timer > 0) {
      interval = setInterval(() => setTimer(t => t - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [timer]);

  const handleCodeChange = (text, index) => {
    const digit = text.replace(/[^0-9]/g, '');
    if (digit.length > 1) return;
    const newCode = [...code];
    newCode[index] = digit;
    setCode(newCode);
    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e, index) => {
    if (e.nativeEvent.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const fullCode = code.join('');
    if (fullCode.length !== 6) {
      Alert.alert('Error', 'Please enter the complete 6-digit code');
      return;
    }
    setLoading(true);
    try {
      const response = await api.post('/auth/verify-code', { email, code: fullCode });
      const { token, user } = response.data;
      setAuth(token, user);
    } catch (error) {
      const msg = error.response?.data?.message || 'Verification failed';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    try {
      await api.post('/auth/send-code', { email });
      setTimer(60);
      Alert.alert('Code Sent', 'A new verification code has been sent to your email.');
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to resend code');
    } finally {
      setResending(false);
    }
  };

  return (
    <View style={tw(`flex-1 px-8 ${isDarkMode ? 'bg-slate-900' : 'bg-white'}`)}>
      <BackButton onPress={() => navigation?.goBack()} />
      <View style={tw(`p-8 rounded-3xl shadow-lg ${isDarkMode ? 'bg-slate-800' : 'bg-white'}`)}>
        <Text style={tw(`text-2xl font-bold text-center mb-2 ${isDarkMode ? 'text-white' : 'text-green-800'}`)}>
          Verify Your Email
        </Text>
        <Text style={tw(`text-sm text-center mb-6 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`)}>
          Enter the 6-digit code sent to{'\n'}
          <Text style={tw('font-semibold text-green-600')}>{email}</Text>
        </Text>

        <View style={tw('flex-row justify-between mb-6')}>
          {code.map((digit, index) => (
            <TextInput
              key={index}
              ref={ref => inputRefs.current[index] = ref}
              style={tw(`w-12 h-14 rounded-xl border-2 text-center text-xl font-bold ${
                digit ? 'border-green-500 bg-green-50' : isDarkMode ? 'border-slate-600 bg-slate-700' : 'border-gray-300 bg-gray-50'
              } ${isDarkMode ? 'text-white' : 'text-gray-800'}`)}
              keyboardType="number-pad"
              maxLength={1}
              value={digit}
              onChangeText={text => handleCodeChange(text, index)}
              onKeyPress={e => handleKeyPress(e, index)}
              selectTextOnFocus
            />
          ))}
        </View>

        <TouchableOpacity style={tw(`py-4 rounded-xl items-center mb-4 ${loading ? 'bg-green-700' : 'bg-green-800'}`)}
          onPress={handleVerify} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={tw('text-white font-semibold text-base')}>Verify & Continue</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={tw('items-center py-2')}
          onPress={handleResend} disabled={resending || timer > 0}>
          <Text style={tw(`text-sm ${timer > 0 ? 'text-gray-400' : isDarkMode ? 'text-green-400' : 'text-green-600'}`)}>
            {resending ? 'Sending...' :
             timer > 0 ? `Resend code in ${timer}s` :
             'Didn\'t receive the code? Resend'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default EmailVerificationScreen;
