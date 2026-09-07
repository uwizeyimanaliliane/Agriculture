import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { tw } from '../../utils/tw';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useI18n } from '../../i18n';
import { cropAPI, auctionAPI, farmerAPI } from '../../services/api';
import { formatCurrency, formatDateTime } from '../../utils/formatters';

const qActions = [
  { key: 'addCrop', screen: 'AddCrop', icon: '🌱' },
  { key: 'createAuction', screen: 'CreateAuction', icon: '🔨' },
  { key: 'myCrops', screen: 'MyCrops', icon: '🌾' },
  { key: 'verification', screen: 'Verification', icon: '✅' },
];

const FarmerDashboard = ({ navigation }) => {
  const { user } = useAuth();
  const { isDarkMode } = useTheme();
  const { t } = useI18n();
  const [stats, setStats] = useState({ crops: 0, auctions: 0, sales: 0 });
  const [trustScore, setTrustScore] = useState(null);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [cropsRes, auctionsRes, farmerRes, activityRes] = await Promise.allSettled([
        cropAPI.getMine(),
        auctionAPI.getMine(),
        farmerAPI.getVerificationStatus(),
        farmerAPI.getRecentActivity(),
      ]);
      const crops = cropsRes.value?.data?.crops || [];
      const auctions = auctionsRes.value?.data?.auctions || [];
      const farmer = farmerRes.value?.data?.farmer || {};
      const activeAuctions = auctions.filter(a => a.status === 'active').length;
      const totalSales = auctions
        .filter(a => a.status === 'closed' && a.winningBid)
        .reduce((sum, a) => sum + (a.winningBid?.amount || 0), 0);
      setStats({ crops: crops.length, auctions: activeAuctions, sales: totalSales });
      setTrustScore(farmer.trustScore ?? null);
      setActivity(activityRes.value?.data?.activities || []);
    } catch (err) {
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    fetchData();
  }, [fetchData]));

  const onRefresh = () => { setRefreshing(true); fetchData(); };

  if (loading) {
    return (
      <View style={tw(`flex-1 justify-center items-center ${isDarkMode ? 'bg-slate-900' : 'bg-white'}`)}>
        <ActivityIndicator size="large" color="#16a34a" />
      </View>
    );
  }

  return (
    <ScrollView style={tw(`flex-1 ${isDarkMode ? 'bg-slate-900' : 'bg-white'}`)}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#16a34a']} />}>
      <View style={tw(`p-6 pt-12 ${isDarkMode ? 'bg-slate-800' : 'bg-green-800'}`)}>
        <Text style={tw('text-white text-2xl font-bold')}>{t('farmer.welcome')}, {user?.name}</Text>
        <Text style={tw('text-green-100 text-sm mt-1')}>{t('farmer.dashboard')}</Text>
      </View>

      <View style={tw(`mx-4 -mt-6 p-5 rounded-2xl shadow-lg ${isDarkMode ? 'bg-slate-800' : 'bg-white'}`)}>
        <View style={tw('flex-row justify-between')}>
          <View style={tw('items-center flex-1')}>
            <Text style={tw(`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`)}>{stats.crops}</Text>
            <Text style={tw(`text-xs mt-1 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`)}>{t('farmer.activeCrops')}</Text>
          </View>
          <View style={tw('items-center flex-1')}>
            <Text style={tw(`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`)}>{stats.auctions}</Text>
            <Text style={tw(`text-xs mt-1 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`)}>{t('farmer.activeAuctions')}</Text>
          </View>
          <View style={tw('items-center flex-1')}>
            <Text style={tw(`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`)}>{formatCurrency(stats.sales)}</Text>
            <Text style={tw(`text-xs mt-1 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`)}>{t('farmer.totalSales')}</Text>
          </View>
        </View>
        <View style={tw(`flex-row items-center mt-4 pt-4 border-t ${isDarkMode ? 'border-slate-700' : 'border-gray-200'}`)}>
          <Text style={tw(`text-sm ${isDarkMode ? 'text-slate-300' : 'text-gray-600'}`)}>{t('farmer.trustScore')}</Text>
          {trustScore !== null ? (
            <View style={tw(`ml-2 px-2 py-0.5 rounded-full ${trustScore >= 70 ? 'bg-green-100' : trustScore >= 40 ? 'bg-yellow-100' : 'bg-red-100'}`)}>
              <Text style={tw(`text-xs font-semibold ${trustScore >= 70 ? 'text-green-700' : trustScore >= 40 ? 'text-yellow-700' : 'text-red-700'}`)}>
                {trustScore}/100
              </Text>
            </View>
          ) : (
            <View style={tw('ml-2 bg-amber-500 px-2 py-0.5 rounded-full')}>
              <Text style={tw('text-white text-xs font-semibold')}>{t('farmer.notScored')}</Text>
            </View>
          )}
        </View>
      </View>

      <View style={tw('px-4 mt-6')}>
        <Text style={tw(`text-lg font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-800'}`)}>{t('farmer.quickActions')}</Text>
        <View style={tw('flex-row flex-wrap justify-between')}>
          {qActions.map((a, i) => (
            <TouchableOpacity key={i}
              style={tw(`w-[48%] mb-4 p-4 rounded-2xl shadow-sm ${isDarkMode ? 'bg-slate-800' : 'bg-white'}`)}
              onPress={() => navigation.navigate(a.screen)}>
              <Text style={tw('text-3xl mb-2')}>{a.icon}</Text>
              <Text style={tw(`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'}`)}>{t('farmer.' + a.key)}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={tw('px-4 mb-8')}>
        <Text style={tw(`text-lg font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-800'}`)}>{t('farmer.recentActivity')}</Text>
        {activity.length === 0 ? (
          <View style={tw(`p-8 rounded-2xl items-center shadow-sm ${isDarkMode ? 'bg-slate-800' : 'bg-white'}`)}>
            <Text style={tw(`text-3xl mb-3`)}>📋</Text>
            <Text style={tw(`${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`)}>{t('farmer.noActivity')}</Text>
            <Text style={tw(`text-xs mt-1 ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`)}>
              {t('farmer.startByAdding')}
            </Text>
          </View>
        ) : (
          activity.map((item, i) => (
            <View key={i}
              style={tw(`flex-row items-center mb-3 p-4 rounded-2xl shadow-sm ${isDarkMode ? 'bg-slate-800' : 'bg-white'}`)}>
              <View style={tw('w-10 h-10 rounded-full bg-green-100 items-center justify-center mr-3')}>
                <Text style={tw('text-xl')}>{item.icon}</Text>
              </View>
              <View style={tw('flex-1')}>
                <Text style={tw(`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-800'}`)}>{item.description}</Text>
                <Text style={tw(`text-xs mt-1 ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`)}>{formatDateTime(item.date)}</Text>
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
};

export default FarmerDashboard;
