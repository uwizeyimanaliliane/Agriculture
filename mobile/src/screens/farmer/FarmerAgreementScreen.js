import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { tw } from '../../utils/tw';
import { useTheme } from '../../context/ThemeContext';
import { useI18n } from '../../i18n';
import { useAuth } from '../../context/AuthContext';
import BackButton from '../../components/BackButton';

const FarmerAgreementScreen = ({ navigation }) => {
  const { isDarkMode } = useTheme();
  const { t } = useI18n();
  const { acceptFarmerAgreement, logout } = useAuth();
  const [agreed, setAgreed] = useState(false);

  const handleContinue = async () => {
    if (!agreed) return;
    await acceptFarmerAgreement();
    navigation.replace('FarmerHome');
  };

  return (
    <ScrollView style={tw(`flex-1 p-6 ${isDarkMode ? 'bg-slate-900' : 'bg-white'}`)}>
      <BackButton onPress={logout} />
      <Text style={tw(`text-3xl font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-green-800'}`)}>{t('farmer.agreementTitle')}</Text>
      <View style={tw(`rounded-3xl p-5 mb-6 shadow-lg ${isDarkMode ? 'bg-slate-800' : 'bg-green-50'}`)}>
        <Text style={tw(`text-base leading-7 ${isDarkMode ? 'text-slate-200' : 'text-gray-900'}`)}>
          {t('farmer.agreementIntro')}
        </Text>
        <Text style={tw(`text-base leading-7 mt-4 ${isDarkMode ? 'text-slate-200' : 'text-gray-900'}`)}>
          {t('farmer.agreementLine1')}
        </Text>
        <Text style={tw(`text-base leading-7 mt-3 ${isDarkMode ? 'text-slate-200' : 'text-gray-900'}`)}>
          {t('farmer.agreementLine2')}
        </Text>
        <Text style={tw(`text-base leading-7 mt-3 ${isDarkMode ? 'text-slate-200' : 'text-gray-900'}`)}>
          {t('farmer.agreementLine3')}
        </Text>
      </View>

      <TouchableOpacity onPress={() => setAgreed(!agreed)} style={tw(`flex-row items-center mb-6`)}>
        <View style={tw(`w-5 h-5 mr-3 rounded-sm border ${agreed ? 'bg-green-800 border-green-800' : isDarkMode ? 'border-slate-500' : 'border-gray-300'}`)}>
          {agreed && <Text style={tw('text-white text-xs text-center')}>✓</Text>}
        </View>
        <Text style={tw(`text-sm ${isDarkMode ? 'text-slate-200' : 'text-gray-800'}`)}>{t('farmer.agreementCheckbox')}</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={tw(`py-4 rounded-2xl items-center ${agreed ? 'bg-green-800' : 'bg-slate-500'}`)}
        onPress={handleContinue}
        disabled={!agreed}
      >
        <Text style={tw('text-white font-semibold text-base')}>{t('farmer.continue')}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

export default FarmerAgreementScreen;
