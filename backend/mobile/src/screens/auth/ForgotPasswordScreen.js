import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { tw } from '../../utils/tw';
import { useTheme } from '../../context/ThemeContext';
import { useI18n } from '../../i18n';
import { authAPI } from '../../services/api';
import BackButton from '../../components/BackButton';

const ForgotPasswordScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(0);
  const { isDarkMode } = useTheme();
  const { t } = useI18n();

  useEffect(() => {
    let interval;
    if (timer > 0) interval = setInterval(() => setTimer(t => t - 1), 1000);
    return () => clearInterval(interval);
  }, [timer]);

  const handleSendCode = async () => {
    const cleanedEmail = email.trim().toLowerCase();
    if (!cleanedEmail) {
      Alert.alert('Error', 'Please enter your email');
      return;
    }
    setLoading(true);
    try {
      await authAPI.forgotPassword(cleanedEmail);
      setTimer(60);
      Alert.alert('Code Sent', 'A password reset code has been sent to your email.');
      navigation.navigate('ResetPassword', { email: cleanedEmail });
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to send reset code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={tw(`flex-1 px-6 ${isDarkMode ? 'bg-slate-900' : 'bg-white'}`)}>
      <BackButton onPress={() => navigation.goBack()} />

      <View style={tw(`p-6 rounded-2xl shadow-lg ${isDarkMode ? 'bg-slate-800' : 'bg-white'}`)}>
        <Text style={tw(`text-2xl font-bold text-center mb-2 ${isDarkMode ? 'text-white' : 'text-green-800'}`)}>
          Forgot Password
        </Text>
        <Text style={tw(`text-sm text-center mb-6 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`)}>
          Enter your email and we'll send you a reset code
        </Text>

        <TextInput
          style={tw(`border rounded-xl px-4 py-3 mb-6 ${isDarkMode ? 'border-slate-600 bg-slate-700 text-white' : 'border-green-200 bg-green-50 text-gray-800'}`)}
          placeholder="Enter your email"
          placeholderTextColor={isDarkMode ? '#94a3b8' : '#9ca3af'}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <TouchableOpacity
          style={tw(`py-3 rounded-xl items-center ${loading || timer > 0 ? 'bg-green-700' : 'bg-green-800'}`)}
          onPress={handleSendCode}
          disabled={loading || timer > 0}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={tw('text-white font-semibold text-base text-center')}>
              {timer > 0 ? `Resend in ${timer}s` : 'Send Reset Code'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default ForgotPasswordScreen;
