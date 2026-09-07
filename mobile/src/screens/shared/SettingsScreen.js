import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert, Switch, ScrollView, Image } from 'react-native';
import { tw } from '../../utils/tw';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useI18n } from '../../i18n';
import { getImageUrl } from '../../utils/formatters';
import {
  ProfileIcon,
  EmailIcon,
  PhoneIcon,
  LocationIcon,
  MoonIcon,
  SunIcon,
} from '../../components/Icons';
import BackButton from '../../components/BackButton';

const SettingsScreen = ({ navigation }) => {
  const { user, logout, updateUser } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();
  const { t, locale, changeLanguage } = useI18n();

  const langs = [
    { value: 'en', label: 'English' },
    { value: 'rw', label: 'Ikinyarwanda' },
    { value: 'fr', label: 'Français' },
  ];

  const [language, setLanguage] = useState(
    langs.find(l => l.value === (user?.preferredLanguage || locale))?.value || 'en'
  );

  useEffect(() => {
    const match = langs.find(l => l.value === (user?.preferredLanguage || locale));
    if (match) setLanguage(match.value);
  }, [user?.preferredLanguage, locale]);

  const handleLanguageChange = async (lang) => {
    setLanguage(lang);
    changeLanguage(lang);
    await updateUser({ preferredLanguage: lang });
  };

  const handleLogout = () => {
    Alert.alert(t('auth.logout'), t('common.logoutConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('auth.logout'), style: 'destructive', onPress: logout },
    ]);
  };

  const loc = user?.location;
  const addressParts = [loc?.province, loc?.district, loc?.sector, loc?.village].filter(Boolean);
  const addressDisplay = addressParts.length > 0 ? addressParts.join(', ') : t('common.notSet');

  const roleLabel = user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : t('common.notSet');

  const menuItems = [
    { title: t('common.profile'), subtitle: user?.name || t('common.notSet'), IconComponent: ProfileIcon },
    { title: 'Email', subtitle: user?.email || t('common.notSet'), IconComponent: EmailIcon },
    { title: t('auth.phone'), subtitle: user?.phone || t('common.phoneNotSet'), IconComponent: PhoneIcon },
    { title: t('common.address'), subtitle: addressDisplay, IconComponent: LocationIcon },
  ];

  const borderStyle = isDarkMode ? 'border-slate-700' : 'border-gray-100';

  return (
    <ScrollView style={tw(`flex-1 ${isDarkMode ? 'bg-slate-900' : 'bg-white'}`)}>
      <View style={tw(`p-6 pt-12 ${isDarkMode ? 'bg-slate-800' : 'bg-green-800'}`)}>
        <BackButton onPress={() => navigation.goBack()} label="hidden" style="mb-3" />
        <Text style={tw('text-white text-2xl font-bold')}>{t('common.settings')}</Text>
      </View>

      <TouchableOpacity style={tw(`mx-4 -mt-6 p-4 rounded-2xl shadow-lg ${isDarkMode ? 'bg-slate-800' : 'bg-white'}`)}
        onPress={() => navigation.navigate('EditProfile')}>
        <View style={tw('items-center mb-3')}>
          {user?.avatar ? (
            <Image source={{ uri: getImageUrl(user.avatar) }}
              style={tw('w-20 h-20 rounded-full mb-2')} />
          ) : (
            <View style={tw('w-20 h-20 rounded-full items-center justify-center mb-2')}>
              <ProfileIcon size={48} color="#000000" />
            </View>
          )}
        </View>
        {menuItems.map((item, index) => (
          <View key={index}
            style={tw(`flex-row items-center py-3 ${index < menuItems.length - 1 ? `border-b ${borderStyle}` : ''}`)}>
            <View style={{ marginRight: 12 }}>
              <item.IconComponent size={20} color="#000000" />
            </View>
            <View style={tw('flex-1')}>
              <Text style={tw(`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-800'}`)}>{item.title}</Text>
              <Text style={tw(`text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`)}>{item.subtitle}</Text>
            </View>
          </View>
        ))}
        <View style={tw('flex-row justify-center mt-2 pt-2 border-t border-green-200')}>
          <Text style={tw('text-green-600 font-medium text-sm')}>Tap to edit profile →</Text>
        </View>
      </TouchableOpacity>

      <View style={tw(`mx-4 mt-4 p-4 rounded-2xl shadow-sm ${isDarkMode ? 'bg-slate-800' : 'bg-white'}`)}>
        <Text style={tw(`font-semibold mb-4 text-lg ${isDarkMode ? 'text-white' : 'text-gray-800'}`)}>{t('common.settings')}</Text>

        <View style={tw('flex-row items-center justify-between mb-4')}>
          <View style={tw('flex-row items-center flex-1')}>
            {isDarkMode ? (
              <MoonIcon size={20} color="#000000" />
            ) : (
              <SunIcon size={20} color="#000000" />
            )}
            <Text style={tw(`text-base ml-3 ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`)}>{t('common.darkMode')}</Text>
          </View>
          <Switch value={isDarkMode} onValueChange={toggleTheme} trackColor={{ false: '#d1d5db', true: '#374151' }}
            thumbColor={isDarkMode ? '#22c55e' : '#f59e0b'} />
        </View>

        <Text style={tw(`mb-3 font-medium ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`)}>{t('common.language')}</Text>
        <View style={tw('flex-row gap-2 mb-2')}>
          {langs.map((lang) => (
            <TouchableOpacity key={lang.value}
              style={tw(`flex-1 py-3 rounded-lg items-center ${language === lang.value ? 'bg-green-800' : isDarkMode ? 'bg-slate-700' : 'bg-green-100'}`)}
              onPress={() => handleLanguageChange(lang.value)}>
              <Text style={tw(`text-center font-medium ${language === lang.value ? 'text-white' : isDarkMode ? 'text-slate-300' : 'text-green-800'}`)}>
                {lang.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <TouchableOpacity style={tw('mx-4 mt-6 mb-8 py-4 rounded-xl items-center bg-red-500')} onPress={handleLogout}>
        <Text style={tw('text-white text-base font-semibold')}>{t('auth.logout')}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

export default SettingsScreen;
