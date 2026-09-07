import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { tw } from '../../utils/tw';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useI18n } from '../../i18n';
import { cropAPI, farmerAPI } from '../../services/api';
import { formatDateTime } from '../../utils/formatters';
import { CropsIcon, VerificationIcon, BellIcon, MoonIcon, SunIcon } from '../../components/Icons';
import { useNotifications } from '../../context/NotificationContext';

const FarmerDashboard = ({ navigation }) => {
  const { user } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();
  const { t } = useI18n();
  const { unreadCount } = useNotifications();
  const [stats, setStats] = useState({ crops: 0, productsSold: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [cropsRes, salesRes] = await Promise.allSettled([
        cropAPI.getMine(),
        farmerAPI.getSalesHistory(),
      ]);
      const crops = cropsRes.value?.data?.crops || [];
      const salesData = salesRes.value?.data || {};

      const activeCrops = crops.filter(c => ['approved', 'available'].includes(c.status)).length;
      const productsSold = salesData.soldCount ?? 0;

      setStats({ crops: activeCrops, productsSold });
    } catch (err) {
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const qActions = [
    { key: 'addCrop', screen: 'AddCropGateway', IconComponent: CropsIcon },
    { key: 'myCrops', screen: 'MyCrops', IconComponent: CropsIcon },
    { key: 'verification', screen: 'Verification', IconComponent: VerificationIcon },
    { key: 'ordersReceived', label: 'Confirm Buyer Payments', screen: 'MyOrders', IconComponent: CropsIcon },
  ];

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  return (
    <ScrollView style={tw(`flex-1 ${isDarkMode ? 'bg-slate-900' : 'bg-white'}`)}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#16a34a']} />}>
      <View style={tw(`p-6 pt-12 ${isDarkMode ? 'bg-slate-800' : 'bg-green-800'}`)}>
        <View style={tw('flex-row justify-between items-start')}>
          <View style={tw('flex-1')}>
            <Text style={tw('text-white text-2xl font-bold')}>{t('farmer.welcome')}, {user?.name}</Text>
            <Text style={tw('text-green-100 text-sm mt-1')}>{t('farmer.dashboard')}</Text>
          </View>

          <View style={tw('flex-row items-center')}>
            <TouchableOpacity
              onPress={() => navigation.navigate('Notifications')}
              style={tw('w-12 h-12 rounded-full items-center justify-center bg-white/10 mr-2 relative')}
              activeOpacity={0.9}
            >
              <BellIcon size={28} color="#ffffff" />
              {unreadCount > 0 && (
                <View style={tw('absolute top-0 right-0 min-w-[18px] h-[18px] rounded-full bg-red-500 items-center justify-center px-1 z-10')}>
                  <Text style={tw('text-[9px] text-white font-bold')}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={toggleTheme}
              style={tw('w-10 h-10 rounded-full items-center justify-center bg-white/10')}
            >
              {isDarkMode ? <MoonIcon size={20} color="#ffffff" /> : <SunIcon size={20} color="#ffffff" />}
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <View style={tw(`mx-4 -mt-6 p-5 rounded-2xl shadow-lg ${isDarkMode ? 'bg-slate-800' : 'bg-white'}`)}>
        <View style={tw('flex-row justify-between')}>
          <View style={tw('items-center flex-1')}>
            <Text style={tw(`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`)}>{stats.crops}</Text>
            <Text style={tw(`text-xs mt-1 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`)}>{t('farmer.activeCrops')}</Text>
          </View>
          <View style={tw('items-center flex-1')}>
            <Text style={tw(`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`)}>{stats.productsSold}</Text>
            <Text style={tw(`text-xs mt-1 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`)}>{t('farmer.itemsSold')}</Text>
          </View>
        </View>
      </View>

      <View style={tw('px-4 mt-6')}>
        <Text style={tw(`text-lg font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-800'}`)}>{t('farmer.quickActions')}</Text>
        <View style={tw('flex-row flex-wrap justify-between')}>
          {qActions.map((a, i) => (
            <TouchableOpacity key={i}
              style={tw(`w-[48%] mb-4 p-4 rounded-2xl shadow-sm ${isDarkMode ? 'bg-slate-800' : 'bg-white'}`)}
              onPress={() => navigation.navigate(a.screen, a.params)}>
              <View style={{ marginBottom: 12 }}>
                <a.IconComponent size={32} color="#000000" />
              </View>
              <Text style={tw(`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'}`)}>{a.label || t('farmer.' + a.key)}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

    </ScrollView>
  );
};

export default FarmerDashboard;
