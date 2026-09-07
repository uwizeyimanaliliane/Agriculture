import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, Alert, ActivityIndicator, FlatList } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { tw } from '../../utils/tw';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useI18n } from '../../i18n';
import { deliveryAPI } from '../../services/api';
import { formatCurrency } from '../../utils/formatters';
import { alert, confirmAlert } from '../../utils/platform';
import ContactButtons from '../../components/ContactButtons';
import { ADMIN_PHONE, ADMIN_NAME } from '../../utils/contact';

const MyDeliveriesScreen = ({ navigation }) => {
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const { user } = useAuth();
  const { isDarkMode } = useTheme();
  const { t } = useI18n();

  const loadDeliveries = async () => {
    setLoading(true);
    try {
      const res = await deliveryAPI.getMine();
      setDeliveries(res.data.deliveries || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { loadDeliveries(); }, []));

  const handleAcceptPrice = (delivery) => {
    confirmAlert('Accept Price', `Accept ${formatCurrency(delivery.transporterPrice)} from transporter?`, async () => {
      try {
        await deliveryAPI.acceptPrice(delivery._id);
        alert('Success', 'Price accepted! Transporter has been notified.');
        loadDeliveries();
      } catch (err) {
        alert('Error', 'Failed to accept price');
      }
    }, null, 'Accept', 'Cancel');
  };

  const filtered = filter === 'all' ? deliveries : deliveries.filter(d => d.status === filter);

  const getStatusColor = (status) => {
    const colors = {
      pending: 'text-yellow-500',
      assigned: 'text-blue-500',
      picked_up: 'text-purple-500',
      in_transit: 'text-orange-500',
      delivered: 'text-green-500',
      confirmed: 'text-green-700',
      cancelled: 'text-red-500',
    };
    return colors[status] || 'text-gray-500';
  };

  const renderItem = ({ item }) => {
    const awaitingPrice = item.priceStatus === 'pending' && item.transporterPrice && !item.qrScannedByBuyer;
    const needsAccept = awaitingPrice && (user?._id === String(item.orderedBy || item.farmer?._id));

    return (
      <View style={tw(`p-4 mb-3 rounded-2xl shadow-sm ${isDarkMode ? 'bg-slate-800' : 'bg-white'}`)}>
        <View style={tw('flex-row justify-between items-start')}>
          <View style={tw('flex-1')}>
            <Text style={tw(`font-semibold text-base ${isDarkMode ? 'text-white' : 'text-gray-800'}`)}>
              {item.crop?.name || 'Delivery'}
            </Text>
            <Text style={tw(`text-xs ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`)}>
              {item.crop?.quantity} {item.crop?.quantityUnit}
            </Text>
          </View>
          <View style={tw(`px-2 py-0.5 rounded-full ${isDarkMode ? 'bg-slate-700' : 'bg-gray-100'}`)}>
            <Text style={tw(`text-xs capitalize ${getStatusColor(item.status)}`)}>{item.status}</Text>
          </View>
        </View>

        {item.transporter?.name && (
          <View style={tw('mt-2')}>
            <Text style={tw(`text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`)}>
              Transporter: {item.transporter.name}
            </Text>
            {user?.role === 'buyer' && (
              <ContactButtons
                phone={ADMIN_PHONE}
                name={ADMIN_NAME}
                smsBody={`Help coordinating delivery for ${item.crop?.name || 'order'} with transporter ${item.transporter.name}`}
                compact
                isDarkMode={isDarkMode}
              />
            )}
          </View>
        )}

        {item.transporterPrice && (
          <View style={tw('flex-row items-center mt-2')}>
            <Text style={tw('text-green-600 font-semibold')}>{formatCurrency(item.transporterPrice)}</Text>
            <View style={tw(`ml-2 px-2 py-0.5 rounded-full ${item.priceStatus === 'accepted' ? 'bg-green-100' : item.priceStatus === 'pending' ? 'bg-yellow-100' : 'bg-gray-100'}`)}>
              <Text style={tw(`text-xs ${item.priceStatus === 'accepted' ? 'text-green-700' : item.priceStatus === 'pending' ? 'text-yellow-700' : 'text-gray-600'}`)}>
                {item.priceStatus}
              </Text>
            </View>
          </View>
        )}

        {needsAccept && (
          <TouchableOpacity style={tw('mt-3 bg-green-800 py-2.5 rounded-xl items-center')}
            onPress={() => handleAcceptPrice(item)}>
            <Text style={tw('text-white font-medium text-sm')}>Accept Price ({formatCurrency(item.transporterPrice)})</Text>
          </TouchableOpacity>
        )}

        {item.status === 'in_transit' && item.transporter?.name && user?.role === 'buyer' && (
          <TouchableOpacity style={tw('mt-2 bg-blue-600 py-2.5 rounded-xl items-center')}
            onPress={() => navigation.navigate('DeliveryTracking', { deliveryId: item._id })}>
            <Text style={tw('text-white font-medium text-sm')}>Track Delivery</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const filters = ['all', 'pending', 'assigned', 'in_transit', 'delivered', 'confirmed'];

  return (
    <View style={tw(`flex-1 ${isDarkMode ? 'bg-slate-900' : 'bg-white'}`)}>
      <View style={tw(`p-6 pt-12 ${isDarkMode ? 'bg-slate-800' : 'bg-green-800'}`)}>
        <Text style={tw('text-white text-2xl font-bold')}>My Deliveries</Text>
      </View>

      <View style={tw('flex-row px-4 py-3')}>
        <FlatList horizontal showsHorizontalScrollIndicator={false} data={filters}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={tw(`mr-2 px-4 py-2 rounded-full ${filter === item ? 'bg-green-600' : isDarkMode ? 'bg-slate-700' : 'bg-white shadow-sm'}`)}
              onPress={() => setFilter(item)}>
              <Text style={tw(`text-sm capitalize ${filter === item ? 'text-white' : isDarkMode ? 'text-slate-300' : 'text-gray-700'}`)}>{item}</Text>
            </TouchableOpacity>
          )} keyExtractor={item => item} />
      </View>

      <View style={tw('flex-1 px-4')}>
        {loading ? (
          <View style={tw('flex-1 justify-center items-center')}>
            <ActivityIndicator size="large" color="#16a34a" />
          </View>
        ) : (
          <FlatList data={filtered} renderItem={renderItem} keyExtractor={item => item._id}
            contentContainerStyle={{ paddingBottom: 20 }}
            ListEmptyComponent={
              <View style={tw('flex-1 justify-center items-center pt-20')}>
                <Text style={tw(`text-lg ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`)}>No deliveries found</Text>
              </View>
            } />
        )}
      </View>
    </View>
  );
};

export default MyDeliveriesScreen;
