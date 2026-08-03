import React, { useState, useEffect, useRef } from 'react';
import { Platform, View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator, Image } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import { tw } from '../../utils/tw';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useI18n } from '../../i18n';

WebBrowser.maybeCompleteAuthSession();

const DEFAULT_CLIENT_ID = '827251390032-lf1eq7qbb8jhio2s00b6nif03rkgu8qh.apps.googleusercontent.com';
const WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || DEFAULT_CLIENT_ID;
const ANDROID_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || WEB_CLIENT_ID;
const IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || WEB_CLIENT_ID;

const hasGoogleConfig = !!WEB_CLIENT_ID;

const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const { login, googleLogin } = useAuth();
  const { isDarkMode } = useTheme();
  const { t, locale, changeLanguage } = useI18n();
  const mountedRef = useRef(true);

  const languages = [
    { code: 'en', label: 'English' },
    { code: 'fr', label: 'Français' },
    { code: 'rw', label: 'Kinyarwanda' },
  ];

  useEffect(() => {
    return () => { mountedRef.current = false; };
  }, []);

  // Web: no proxy — uses the page URL as redirect (e.g. http://localhost:8081/)
  // Native: uses Expo proxy (https://auth.expo.io/@YOUR_USERNAME/agrilink-rwanda)
  const isWeb = Platform.OS === 'web';
  const useProxy = !isWeb;

  const redirectUri = makeRedirectUri({ useProxy, preferLocalhost: true });
  // helpful log when debugging redirect issues — register this exact URI in Google Cloud Console
  if (typeof console !== 'undefined') console.log('Google redirectUri:', redirectUri);

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId: WEB_CLIENT_ID,
    androidClientId: ANDROID_CLIENT_ID,
    iosClientId: IOS_CLIENT_ID,
    webClientId: WEB_CLIENT_ID,
    selectAccount: true,
    redirectUri,
  }, { useProxy });

  useEffect(() => {
    if (response?.type === 'success') {
      const { id_token } = response.params || {};
      if (!id_token) {
        if (mountedRef.current) setGoogleLoading(false);
        return;
      }
      setGoogleLoading(true);
      googleLogin(id_token)
        .catch((error) => {
          const msg = error.response?.data?.message || error.message || 'Please try again.';
          if (mountedRef.current) Alert.alert('Google Sign-In Failed', msg);
        })
        .finally(() => {
          if (mountedRef.current) setGoogleLoading(false);
        });
    } else if (response?.type === 'error') {
      if (mountedRef.current) {
        setGoogleLoading(false);
        const err = response.error || {};
        const errMsg = err.message || err.description || err.code || '';
        const isSetupIssue = /redirect_uri_mismatch|origin_mismatch|access_denied/i.test(JSON.stringify(err));
        if (isSetupIssue) {
          const redirectUri = request?.redirectUri ||
            (isWeb ? window.location.origin + '/' : 'https://auth.expo.io/@YOUR_EXPO_USERNAME/agrilink-rwanda');
          const steps = isWeb
            ? '1. Open https://console.cloud.google.com/apis/credentials\n' +
              '2. Edit your Web OAuth client ID\n' +
              '3. Add this to Authorized JavaScript origins:\n   ' + window.location.origin + '\n' +
              '4. Add this to Authorized redirect URIs:\n   ' + redirectUri + '\n' +
              '5. Click Save, then try again.'
            : '1. Run: npx expo login (logged in as the same account)\n' +
              '2. Open https://console.cloud.google.com/apis/credentials\n' +
              '3. Edit your Web OAuth client ID\n' +
              '4. Add this to Authorized redirect URIs:\n   ' + redirectUri + '\n' +
              '5. Click Save, then try again.';
          Alert.alert('Google Setup Required', steps);
        } else {
          Alert.alert('Google Sign-In Failed', errMsg || 'Unable to complete authentication.');
        }
      }
    }
  }, [response]);

  const handleGooglePress = async () => {
    if (!hasGoogleConfig) return;
    if (!request) {
      Alert.alert('Not Ready', 'Google Sign-In is initializing. Please try again.');
      return;
    }
    setGoogleLoading(true);
    try {
      await promptAsync({ useProxy });
    } catch (error) {
      if (mountedRef.current) {
        setGoogleLoading(false);
        Alert.alert('Google Sign-In Failed', error.message || 'Please try again.');
      }
    }
  };

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert(t('auth.error'), t('auth.fillAll'));
      return;
    }
    setLoading(true);
    try {
      await login(email, password);
    } catch (error) {
      const data = error.response?.data;
      if (data?.needsVerification) {
        navigation.replace('EmailVerification', { email: data.email });
      } else {
        Alert.alert(t('auth.loginFailed'), data?.message || 'An error occurred');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={tw(`flex-1 justify-center px-6 ${isDarkMode ? 'bg-slate-900' : 'bg-white'}`)}>
      <Text style={tw(`text-3xl font-bold text-center mb-2 ${isDarkMode ? 'text-white' : 'text-green-800'}`)}>
        {t('app.name')}
      </Text>
      <Text style={tw(`text-center mb-4 ${isDarkMode ? 'text-slate-400' : 'text-green-600'}`)}>
        {t('app.tagline')}
      </Text>

      <View style={tw(`flex-row justify-center gap-2 mb-6`)}>
        {languages.map((lang) => {
          const active = locale === lang.code;
          return (
            <TouchableOpacity
              key={lang.code}
              style={tw(`px-4 py-2 rounded-full border ${
                active
                  ? 'bg-green-800 border-green-800'
                  : isDarkMode
                    ? 'bg-slate-800 border-slate-600'
                    : 'bg-white border-green-200'
              }`)}
              onPress={() => changeLanguage(lang.code)}
            >
              <Text style={tw(`text-sm font-medium ${
                active ? 'text-white' : isDarkMode ? 'text-slate-300' : 'text-green-700'
              }`)}>
                {lang.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={tw(`p-6 rounded-2xl shadow-lg ${isDarkMode ? 'bg-slate-800' : 'bg-white'}`)}>
        <TextInput
          style={tw(`border rounded-xl px-4 py-3 mb-4 ${isDarkMode ? 'border-slate-600 bg-slate-700 text-white' : 'border-green-200 bg-green-50 text-gray-800'}`)}
          placeholder={t('auth.email')}
          placeholderTextColor={isDarkMode ? '#94a3b8' : '#9ca3af'}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <View style={tw('relative mb-4')}>
          <TextInput
            style={tw(`border rounded-xl px-4 py-3 pr-12 ${isDarkMode ? 'border-slate-600 bg-slate-700 text-white' : 'border-green-200 bg-green-50 text-gray-800'}`)}
            placeholder={t('auth.password')}
            placeholderTextColor={isDarkMode ? '#94a3b8' : '#9ca3af'}
            value={password}
            onChangeText={setPassword}
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

        <TouchableOpacity style={tw('items-end mb-4')} onPress={() => navigation.navigate('ForgotPassword')}>
          <Text style={tw(`text-sm ${isDarkMode ? 'text-green-400' : 'text-green-600'}`)}>
            {t('auth.forgotPassword')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={tw(`py-3 rounded-xl items-center mb-3 ${loading ? 'bg-green-700' : 'bg-green-800'}`)}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={tw('text-white text-center font-semibold text-base')}>{t('auth.login')}</Text>
          )}
        </TouchableOpacity>

        <View style={tw('flex-row items-center my-4')}>
          <View style={tw(`flex-1 h-px ${isDarkMode ? 'bg-slate-600' : 'bg-gray-300'}`)} />
          <Text style={tw(`mx-3 text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`)}>{t('auth.or')}</Text>
          <View style={tw(`flex-1 h-px ${isDarkMode ? 'bg-slate-600' : 'bg-gray-300'}`)} />
        </View>

        <TouchableOpacity
          style={tw(`py-3 rounded-xl items-center flex-row justify-center mb-3 border ${
            isDarkMode ? 'border-slate-600 bg-slate-700' : 'border-gray-300 bg-white'
          } ${!hasGoogleConfig ? 'opacity-40' : ''}`)}
          onPress={handleGooglePress}
          disabled={!hasGoogleConfig || googleLoading}
        >
          {googleLoading ? (
            <ActivityIndicator color={isDarkMode ? 'white' : '#333'} />
          ) : (
            <>
              <Text style={tw('text-lg mr-2 font-bold')}>G</Text>
              <Text style={tw(`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'}`)}>
                {t('auth.signInWithGoogle')}
              </Text>
            </>
          )}
        </TouchableOpacity>

        {!hasGoogleConfig && (
          <Text style={tw(`text-[10px] text-center mb-3 ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`)}>
            Set EXPO_PUBLIC_GOOGLE_CLIENT_ID in mobile/.env
          </Text>
        )}

        <TouchableOpacity style={tw('py-3 mt-2 items-center')} onPress={() => navigation.navigate('Register')}>
          <Text style={tw(`text-center font-medium ${isDarkMode ? 'text-green-400' : 'text-green-600'}`)}>
            {t('auth.noAccount')}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default LoginScreen;
