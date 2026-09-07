import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';

import { useFocusEffect } from '@react-navigation/native';
import { tw } from '../../utils/tw';
import { useTheme } from '../../context/ThemeContext';
import { useI18n } from '../../i18n';
import { orderAPI } from '../../services/api';
import { formatCurrency, formatDateTime } from '../../utils/formatters';

const statusColors = {
  pending_deposit: 'text-yellow-500',
  payment_pending_verification: 'text-orange-500',
  locked: 'text-blue-500',
  in_transit: 'text-purple-500',
  delivered: 'text-green-500',
  released: 'text-green-700',
  disputed: 'text-red-500',
  refunded: 'text-red-700',
};

const BuyerHistoryScreen = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const { isDarkMode } = useTheme();
  const { t } = useI18n();

  const loadOrders = useCallback(async () => {
    try {
      const res = await orderAPI.getMine();
      setOrders(res.data.orders || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadOrders(); }, [loadOrders]));

  const Row = ({ label, value }) => (
    <View style={tw('flex-row justify-between py-1')}>
      <Text style={tw(`text-xs ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`)}>{label}</Text>
      <Text style={tw(`text-xs flex-1 text-right pl-3 ${isDarkMode ? 'text-slate-200' : 'text-gray-700'}`)}>{value || '-'}</Text>
    </View>
  );

  const renderItem = ({ item }) => {
    const expanded = expandedId === item._id;
    const quantityUnit = item.quantityUnit || item.crop?.quantityUnit || 'kg';

    return (
      <View style={tw(`p-4 mb-3 rounded-2xl shadow-sm ${isDarkMode ? 'bg-slate-800' : 'bg-white'}`)}>
        <TouchableOpacity onPress={() => setExpandedId(expanded ? null : item._id)} activeOpacity={0.7}>
          <View style={tw('flex-row justify-between items-start')}>
            <View style={tw('flex-1')}>
              <Text style={tw(`font-semibold text-base ${isDarkMode ? 'text-white' : 'text-gray-800'}`)}>
                {item.crop?.name || t('buyer.order')}
              </Text>
              <Text style={tw(`text-xs mt-0.5 ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`)}>
                {formatDateTime(item.createdAt)}
              </Text>
            </View>
            <View style={tw(`px-2 py-0.5 rounded-full ${isDarkMode ? 'bg-slate-700' : 'bg-gray-100'}`)}>
              <Text style={tw(`text-xs capitalize ${statusColors[item.status] || 'text-gray-500'}`)}>
                {item.status?.replace(/_/g, ' ')}
              </Text>
            </View>
          </View>

          <View style={tw('flex-row justify-between items-center mt-3')}>
            <View>
              <Text style={tw(`text-xs ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`)}>
                {t('buyer.quantity')}: {item.quantity ?? '-'} {quantityUnit}
              </Text>
              <Text style={tw(`text-xs mt-0.5 ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`)}>
                {t('buyer.farmer')}: {item.farmer?.name || '-'}
              </Text>
            </View>
            <Text style={tw('font-bold text-green-600')}>{formatCurrency(item.amount)}</Text>
          </View>

          <Text style={tw(`text-xs mt-2 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`)}>
            {expanded ? '▲' : '▼'} {expanded ? t('buyer.hideDetails') : t('buyer.viewDetails')}
          </Text>
        </TouchableOpacity>

        {expanded && (
          <View style={tw(`mt-3 pt-3 border-t ${isDarkMode ? 'border-slate-700' : 'border-gray-200'}`)}>
            <Row label={t('buyer.transactionRef')} value={item.transactionRef} />
            <Row label={t('buyer.status')} value={item.status?.replace(/_/g, ' ')} />
            <Row label={t('buyer.total')} value={formatCurrency(item.amount)} />
            <Row label={`${t('buyer.quantity')} (${quantityUnit})`} value={item.quantity ?? '-'} />
            <Row label={t('buyer.farmer')} value={item.farmer?.name} />
            {item.farmer?.phone && <Row label="Phone" value={item.farmer.phone} />}
            {item.farmer?.email && <Row label="Email" value={item.farmer.email} />}
            {item.paymentMethod && (
              <Row label={t('buyer.paymentMethod')} value={item.paymentMethod === 'mobile_money' ? 'Mobile Money' : 'Payment Code'} />
            )}
            {item.network && <Row label="Network" value={item.network} />}
            {item.payerPhone && <Row label="Payer Phone" value={item.payerPhone} />}
            {item.paidAt && <Row label="Paid At" value={formatDateTime(item.paidAt)} />}
            {item.delivery?.status && (
              <>
                <Row label={t('buyer.delivery')} value={item.delivery.status.replace(/_/g, ' ')} />
                {item.delivery?.transporter?.name && (
                  <Row label={t('buyer.transporter')} value={item.delivery.transporter.name} />
                )}
              </>
            )}
            {item.status === 'released' && (
              <Text style={tw('mt-2 text-green-700 text-sm font-medium')}>✓ {t('buyer.paymentReleased')}</Text>
            )}
            {item.status === 'refunded' && (
              <Text style={tw('mt-2 text-red-600 text-sm font-medium')}>Refunded</Text>
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={tw(`flex-1 ${isDarkMode ? 'bg-slate-900' : 'bg-white'}`)}>
      <View style={tw(`p-6 pt-12 ${isDarkMode ? 'bg-slate-800' : 'bg-green-800'}`)}>
        <Text style={tw('text-white text-2xl font-bold mt-4')}>{t('buyer.purchaseHistory')}</Text>
        <Text style={tw(`text-sm mt-1 ${isDarkMode ? 'text-slate-400' : 'text-green-100'}`)}>
          {orders.length} {t('buyer.itemsPurchased')}
        </Text>
      </View>

      <View style={tw('flex-1 px-4 pt-4')}>
        {loading ? (
          <View style={tw('flex-1 justify-center items-center')}>
            <ActivityIndicator size="large" color="#16a34a" />
          </View>
        ) : (
          <FlatList
            data={[...orders].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))}
            renderItem={renderItem}
            keyExtractor={(item) => item._id}
            contentContainerStyle={{ paddingBottom: 20 }}
            ListEmptyComponent={
              <View style={tw('flex-1 justify-center items-center pt-20')}>
                <Text style={tw(`text-lg ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`)}>
                  {t('buyer.noPurchases')}
                </Text>
              </View>
            }
          />
        )}
      </View>
    </View>
  );
};

export default BuyerHistoryScreen;