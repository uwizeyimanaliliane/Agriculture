import React, { useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { tw } from '../../utils/tw';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { authAPI } from '../../services/api';
import BackButton from '../../components/BackButton';

const ResetPasswordScreen = ({ route, navigation }) => {
  const { email } = route.params || {};
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState('code');
  const inputRefs = useRef([]);
  const { isDarkMode } = useTheme();
  const { setAuth } = useAuth();

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

  const handleVerifyCode = () => {
    const fullCode = code.join('');
    if (fullCode.length !== 6) {
      Alert.alert('Error', 'Please enter the complete 6-digit code');
      return;
    }
    setStep('password');
  };

  const handleReset = async () => {
    if (!newPassword || !confirmPassword) {
      Alert.alert('Error', 'Please fill in both password fields');
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }
    if (!email) {
      Alert.alert('Error', 'Email not found. Please request a new reset code.');
      navigation.goBack();
      return;
    }
    setLoading(true);
    try {
      const fullCode = code.join('');
      const res = await authAPI.resetPassword({
        email: email.trim().toLowerCase(),
        code: fullCode,
        password: newPassword,
      });
      setAuth(res.data.token, res.data.user);
      Alert.alert('Success', 'Password has been reset successfully');
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to reset password');
      setStep('code');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email) {
      Alert.alert('Error', 'Email not found. Please request a new reset code.');
      navigation.goBack();
      return;
    }
    try {
      await authAPI.forgotPassword(email.trim().toLowerCase());
      setCode(['', '', '', '', '', '']);
      setStep('code');
      Alert.alert('Code Sent', 'A new reset code has been sent to your email.');
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to resend code');
    }
  };

  return (
    <View style={tw(`flex-1 px-6 ${isDarkMode ? 'bg-slate-900' : 'bg-white'}`)}>
      <BackButton onPress={() => navigation.goBack()} />

      <View style={tw(`p-6 rounded-2xl shadow-lg ${isDarkMode ? 'bg-slate-800' : 'bg-white'}`)}>
        {step === 'code' ? (
          <>
            <Text style={tw(`text-2xl font-bold text-center mb-2 ${isDarkMode ? 'text-white' : 'text-green-800'}`)}>
              Enter Reset Code
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

            <TouchableOpacity
              style={tw(`py-3 rounded-xl items-center mb-3 ${loading ? 'bg-green-700' : 'bg-green-800'}`)}
              onPress={handleVerifyCode}
            >
              <Text style={tw('text-white font-semibold text-base')}>Verify Code</Text>
            </TouchableOpacity>

            <TouchableOpacity style={tw('items-center py-2')} onPress={handleResend}>
              <Text style={tw(`text-sm ${isDarkMode ? 'text-green-400' : 'text-green-600'}`)}>
                Didn't receive the code? Resend
              </Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={tw(`text-2xl font-bold text-center mb-2 ${isDarkMode ? 'text-white' : 'text-green-800'}`)}>
              Set New Password
            </Text>
            <Text style={tw(`text-sm text-center mb-6 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`)}>
              Enter your new password
            </Text>

            <TextInput
              style={tw(`border rounded-xl px-4 py-3 mb-4 ${isDarkMode ? 'border-slate-600 bg-slate-700 text-white' : 'border-green-200 bg-green-50 text-gray-800'}`)}
              placeholder="New password"
              placeholderTextColor={isDarkMode ? '#94a3b8' : '#9ca3af'}
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
            />
            <TextInput
              style={tw(`border rounded-xl px-4 py-3 mb-6 ${isDarkMode ? 'border-slate-600 bg-slate-700 text-white' : 'border-green-200 bg-green-50 text-gray-800'}`)}
              placeholder="Confirm new password"
              placeholderTextColor={isDarkMode ? '#94a3b8' : '#9ca3af'}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
            />

            <TouchableOpacity
              style={tw(`py-3 rounded-xl items-center ${loading ? 'bg-green-700' : 'bg-green-800'}`)}
              onPress={handleReset}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={tw('text-white font-semibold text-base text-center')}>
                  Reset Password
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={tw('items-center py-3 mt-2')} onPress={() => setStep('code')}>
              <Text style={tw(`text-sm ${isDarkMode ? 'text-green-400' : 'text-green-600'}`)}>
                Back to code entry
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
};

export default ResetPasswordScreen;
