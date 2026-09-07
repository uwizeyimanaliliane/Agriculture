import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, FlatList, Image, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { tw } from '../../utils/tw';
import { useTheme } from '../../context/ThemeContext';
import { useI18n } from '../../i18n';
import { farmerAPI } from '../../services/api';
import { formatCurrency, formatDateTime, getImageUrl } from '../../utils/formatters';
import BackButton from '../../components/BackButton';

const SalesHistory = ({ navigation }) => {
  const { isDarkMode } = useTheme();
  const { t } = useI18n();
  const [sales, setSales] = useState([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [soldCount, setSoldCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchHistory = useCallback(async () => {
    try {
      const res = await farmerAPI.getSalesHistory();
      setSales(res.data.sales || []);
      setTotalRevenue(res.data.totalRevenue || 0);
      setSoldCount(res.data.soldCount || 0);
    } catch (err) {
      setSales([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    fetchHistory();
  }, [fetchHistory]));

  const onRefresh = () => { setRefreshing(true); fetchHistory(); };

  const statusColor = (status) => {
    const map = {
      sold: '#22c55e',
      delivered: '#22c55e',
      released: '#22c55e',
      in_transit: '#3b82f6',
      locked: '#3b82f6',
      cancelled: '#ef4444',
      refunded: '#ef4444',
    };
    return map[status] || '#64748b';
  };

  return (
    <View style={tw(`flex-1 ${isDarkMode ? 'bg-slate-900' : 'bg-white'}`)}>
      <View style={tw(`p-6 pt-12 ${isDarkMode ? 'bg-slate-800' : 'bg-green-800'}`)}>
        <BackButton onPress={() => navigation.goBack()} label="hidden" style="mb-3" />
        <Text style={tw('text-white text-2xl font-bold')}>{t('farmer.salesHistory')}</Text>
        <Text style={tw('text-green-100 text-sm mt-1')}>{soldCount} {t('farmer.itemsSold')}</Text>
      </View>

      <View style={tw(`mx-4 -mt-5 p-5 rounded-2xl shadow-lg ${isDarkMode ? 'bg-slate-800' : 'bg-white'}`)}>
        <Text style={tw(`text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`)}>{t('farmer.totalRevenue')}</Text>
        <Text style={tw('text-2xl font-bold text-green-600 mt-1')}>{formatCurrency(totalRevenue)}</Text>
      </View>

      {loading ? (
        <View style={tw('flex-1 justify-center items-center')}>
          <ActivityIndicator size="large" color="#16a34a" />
        </View>
      ) : (
        <FlatList
          data={sales}
          keyExtractor={(item) => item._id}
          contentContainerStyle={{ padding: 16, paddingBottom: 30 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#16a34a']} />}
          renderItem={({ item }) => (
            <View style={tw(`p-4 mb-3 rounded-2xl shadow-sm ${isDarkMode ? 'bg-slate-800' : 'bg-white'}`)}>
              <View style={tw('flex-row')}>
                {item.photo ? (
                  <Image source={{ uri: getImageUrl(item.photo) }} style={tw('w-16 h-16 rounded-xl mr-3')} />
                ) : (
                  <Text style={tw('text-3xl mr-3')}>🌾</Text>
                )}
                <View style={tw('flex-1')}>
                  <View style={tw('flex-row justify-between items-start')}>
                    <Text style={tw(`font-semibold text-base flex-1 ${isDarkMode ? 'text-white' : 'text-gray-800'}`)}>
                      {item.cropName}
                    </Text>
                    <View style={{ backgroundColor: statusColor(item.status) + '20', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 }}>
                      <Text style={{ color: statusColor(item.status), fontSize: 11, fontWeight: '600' }}>
                        {item.status}
                      </Text>
                    </View>
                  </View>
                  <Text style={tw(`text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`)}>
                    {item.quantity} {item.quantityUnit}
                  </Text>
                  {item.buyerName && (
                    <Text style={tw(`text-xs mt-1 ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`)}>
                      {t('buyer.buyer')}: {item.buyerName}{item.buyerPhone ? ` (${item.buyerPhone})` : ''}
                    </Text>
                  )}
                  <View style={tw('flex-row justify-between items-center mt-2')}>
                    <Text style={tw('text-green-600 font-bold')}>{formatCurrency(item.farmerAmount ?? item.amount)}</Text>
                    <Text style={tw(`text-xs ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`)}>{formatDateTime(item.date)}</Text>
                  </View>
                  {item.transactionRef && (
                    <Text style={tw(`text-xs mt-1 ${isDarkMode ? 'text-slate-600' : 'text-gray-400'}`)}>
                      {item.transactionRef}
                    </Text>
                  )}
                </View>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={tw('flex-1 justify-center items-center pt-20')}>
              <Text style={tw('text-3xl mb-3')}>📦</Text>
              <Text style={tw(`text-lg ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`)}>{t('farmer.noSalesYet')}</Text>
              <Text style={tw(`text-xs mt-1 ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`)}>
                {t('farmer.salesWillAppear')}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
};

export default SalesHistory;
