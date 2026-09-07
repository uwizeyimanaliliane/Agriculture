import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { tw } from '../../utils/tw';
import { useTheme } from '../../context/ThemeContext';
import { useI18n } from '../../i18n';
import { adminAPI } from '../../services/api';
import { formatCurrency } from '../../utils/formatters';

const StatCard = ({ label, value, color, isDarkMode }) => (
  <View style={tw(`flex-1 p-4 rounded-2xl shadow-sm mr-2 ${isDarkMode ? 'bg-slate-800' : 'bg-white'}`)}>
    <Text style={tw(`text-2xl font-bold ${color}`)}>{value}</Text>
    <Text style={tw(`text-xs mt-1 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`)}>{label}</Text>
  </View>
);

const AdminDashboard = ({ navigation }) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const { isDarkMode } = useTheme();
  const { t } = useI18n();

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await adminAPI.getDashboard();
      setStats(response.data);
    } catch (error) {
      console.error('Failed to load stats');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={tw(`flex-1 justify-center items-center ${isDarkMode ? 'bg-slate-900' : 'bg-white'}`)}>
        <ActivityIndicator size="large" color="#16a34a" />
      </View>
    );
  }

  return (
    <ScrollView style={tw(`flex-1 ${isDarkMode ? 'bg-slate-900' : 'bg-white'}`)}>
      <View style={tw(`p-6 pt-12 ${isDarkMode ? 'bg-slate-800' : 'bg-green-800'}`)}>
        <Text style={tw('text-white text-2xl font-bold')}>{t('admin.dashboard')}</Text>
        <Text style={tw('text-green-200 text-sm mt-1')}>{t('admin.overview')}</Text>
      </View>

      <View style={tw('p-4')}>
        <Text style={tw(`text-lg font-semibold mb-3 ${isDarkMode ? 'text-white' : 'text-gray-800'}`)}>{t('admin.users')}</Text>
        <View style={tw('flex-row mb-4')}>
          <StatCard label={t('admin.totalUsers')} value={stats?.totalUsers || 0} color="text-blue-600" isDarkMode={isDarkMode} />
          <StatCard label={t('admin.farmers')} value={stats?.farmers || 0} color="text-green-600" isDarkMode={isDarkMode} />
        </View>
        <View style={tw('flex-row mb-4')}>
          <StatCard label={t('admin.buyers')} value={stats?.buyers || 0} color="text-blue-500" isDarkMode={isDarkMode} />
          <StatCard label={t('admin.transporters')} value={stats?.transporters || 0} color="text-orange-500" isDarkMode={isDarkMode} />
        </View>

        <Text style={tw(`text-lg font-semibold mb-3 mt-4 ${isDarkMode ? 'text-white' : 'text-gray-800'}`)}>{t('admin.marketplace')}</Text>
        <View style={tw('flex-row mb-4')}>
          <StatCard label={t('admin.totalCrops')} value={stats?.totalCrops || 0} color="text-green-600" isDarkMode={isDarkMode} />
          <StatCard label={t('admin.activeAuctions')} value={stats?.activeAuctions || 0} color="text-purple-600" isDarkMode={isDarkMode} />
        </View>
        {stats?.pendingCrops > 0 && (
          <TouchableOpacity style={tw('bg-amber-500 p-3 rounded-xl mb-3 flex-row items-center justify-between')}
            onPress={() => navigation.navigate('AdminPendingCrops')}>
            <Text style={tw('text-white font-semibold')}>
              {stats.pendingCrops} {t(stats.pendingCrops > 1 ? 'admin.cropsPendingApproval' : 'admin.cropPendingApproval')}
            </Text>
            <Text style={tw('text-white font-bold text-lg')}>→</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={tw(`p-4 rounded-xl mb-3 flex-row items-center justify-between ${stats?.transportPending > 0 ? 'bg-blue-600' : isDarkMode ? 'bg-slate-800' : 'bg-blue-50 border border-blue-200'}`)}
          onPress={() => navigation.navigate('AdminPostProduct')}>
          <View>
            <Text style={tw(`font-semibold ${stats?.transportPending > 0 ? 'text-white' : isDarkMode ? 'text-white' : 'text-blue-800'}`)}>
              {t('admin.postProduct')}
            </Text>
            {stats?.transportPending > 0 ? (
              <Text style={tw('text-blue-100 text-sm mt-1')}>
                {stats.transportPending} {t(stats.transportPending > 1 ? 'admin.productsNeedBid' : 'admin.productNeedsBid')}
              </Text>
            ) : (
              <Text style={tw(`text-xs mt-1 ${isDarkMode ? 'text-slate-400' : 'text-blue-500'}`)}>
                {t('admin.allProductsPosted')}
              </Text>
            )}
          </View>
          <Text style={tw(`font-bold text-lg ${stats?.transportPending > 0 ? 'text-white' : isDarkMode ? 'text-blue-400' : 'text-blue-600'}`)}>→</Text>
        </TouchableOpacity>

        <Text style={tw(`text-lg font-semibold mb-3 mt-4 ${isDarkMode ? 'text-white' : 'text-gray-800'}`)}>{t('admin.transactions')}</Text>
        <View style={tw('flex-row mb-4')}>
          <StatCard label={t('admin.pendingEscrows')} value={stats?.pendingEscrows || 0} color="text-amber-600" isDarkMode={isDarkMode} />
          <StatCard label={t('admin.activeDeliveries')} value={stats?.activeDeliveries || 0} color="text-teal-600" isDarkMode={isDarkMode} />
        </View>

        <Text style={tw(`text-lg font-semibold mb-3 mt-4 ${isDarkMode ? 'text-white' : 'text-gray-800'}`)}>{t('admin.revenue')}</Text>
        <View style={tw('flex-row mb-4')}>
          <StatCard label={t('admin.platformFees')} value={formatCurrency(stats?.totalPlatformFees || 0)} color="text-green-600" isDarkMode={isDarkMode} />
          <StatCard label={t('admin.logisticsFees')} value={formatCurrency(stats?.totalLogisticsFees || 0)} color="text-blue-600" isDarkMode={isDarkMode} />
        </View>
        <View style={tw('flex-row mb-4')}>
          <StatCard label={t('admin.totalRevenue')} value={formatCurrency(stats?.totalRevenue || 0)} color="text-purple-600" isDarkMode={isDarkMode} />
          <View style={tw('flex-1')} />
        </View>

        {stats?.awaitingRelease > 0 && (
          <View style={tw('bg-red-100 dark:bg-red-900/30 p-3 rounded-xl mb-3 flex-row items-center justify-between')}>
            <Text style={tw('text-red-800 dark:text-red-200 font-semibold')}>
              {stats.awaitingRelease} {t(stats.awaitingRelease > 1 ? 'admin.escrowsAwaitingRelease' : 'admin.escrowAwaitingRelease')}
            </Text>
            <TouchableOpacity style={tw('bg-red-600 px-4 py-2 rounded-lg')}
              onPress={() => navigation.navigate('AdminEscrows')}>
              <Text style={tw('text-white font-medium text-sm')}>{t('admin.review')}</Text>
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity style={tw('bg-green-800 py-4 rounded-xl items-center mt-4')}
          onPress={() => navigation.navigate('AdminUsers')}>
          <Text style={tw('text-white font-semibold')}>{t('admin.manageUsers')}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

export default AdminDashboard;
