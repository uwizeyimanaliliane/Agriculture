import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, Alert, ActivityIndicator, FlatList } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { tw } from '../../utils/tw';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { deliveryAPI } from '../../services/api';
import { getStatusColor, formatCurrency } from '../../utils/formatters';
import ContactButtons from '../../components/ContactButtons';
import { ADMIN_PHONE, ADMIN_NAME } from '../../utils/contact';

const ActiveDeliveries = ({ navigation }) => {
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(null);
  const { isDarkMode } = useTheme();
  const { user } = useAuth();

  const fetchDeliveries = async () => {
    try {
      const response = await deliveryAPI.getMine();
      const mine = (response.data.deliveries || []).filter((d) => {
        const tid = d.transporter?._id || d.transporter;
        if (!tid || String(tid) !== String(user?._id)) return false;
        return ['assigned', 'picked_up', 'in_transit', 'delivered', 'confirmed'].includes(d.status)
          || d.priceStatus === 'accepted';
      });
      setDeliveries(mine);
    } catch (error) {
      Alert.alert('Error', 'Failed to load deliveries');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchDeliveries(); }, []));

  const updateStatus = async (id, status) => {
    setUpdating(id);
    try {
      await deliveryAPI.updateStatus(id, { status });
      Alert.alert('Success', `Status updated to ${status}`);
      fetchDeliveries();
    } catch (error) {
      Alert.alert('Error', 'Failed to update status');
    } finally {
      setUpdating(null);
    }
  };

  const statusOptions = ['picked_up', 'in_transit', 'delivered'];

  const renderDelivery = ({ item }) => {
    const adminContact = item.adminContact || { phone: ADMIN_PHONE, name: ADMIN_NAME };

    return (
    <View style={tw(`p-4 mb-3 rounded-2xl shadow-sm ${isDarkMode ? 'bg-slate-800' : 'bg-white'}`)}>
      <View style={tw('flex-row items-start justify-between')}>
        <Text style={tw(`text-lg font-semibold flex-1 ${isDarkMode ? 'text-white' : 'text-gray-800'}`)}>
          {item.crop?.name || 'Delivery'} #{item._id?.slice(-6).toUpperCase()}
        </Text>
        <View style={[tw('px-2 py-1 rounded-full'), { backgroundColor: getStatusColor(item.status) + '20' }]}>
          <Text style={[tw('text-xs font-medium'), { color: getStatusColor(item.status) }]}>
            {item.status.replace('_', ' ')}
          </Text>
        </View>
      </View>

      {item.crop?.quantity && (
        <Text style={tw(`text-sm mt-2 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`)}>
          {item.crop.quantity} {item.crop.quantityUnit}
        </Text>
      )}

      <View style={tw('flex-row mt-3')}>
        <View style={tw('flex-1')}>
          <Text style={tw(`text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`)}>Pickup</Text>
          <Text style={tw(`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-800'}`)}>
            {item.pickupLocation?.district || 'N/A'}
          </Text>
        </View>
        <View style={tw('flex-1')}>
          <Text style={tw(`text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`)}>Delivery</Text>
          <Text style={tw(`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-800'}`)}>
            {item.deliveryLocation?.district || 'N/A'}
          </Text>
        </View>
      </View>

      {item.transporterPrice && (
        <Text style={tw('text-green-600 font-semibold mt-2')}>
          Your price: {formatCurrency(item.transporterPrice)}
        </Text>
      )}

      <ContactButtons
        phone={adminContact.phone}
        name={adminContact.name}
        smsBody={`Active delivery #${item._id?.slice(-6)} for ${item.crop?.name || 'crop'}`}
        compact
        isDarkMode={isDarkMode}
      />

      {item.status !== 'delivered' && item.status !== 'confirmed' && (
        <View style={tw('flex-row mt-3')}>
          {statusOptions.map((status) => {
            const currentIdx = statusOptions.indexOf(item.status);
            const statusIdx = statusOptions.indexOf(status);
            if (statusIdx <= currentIdx) return null;
            return (
              <TouchableOpacity key={status}
                style={tw(`mr-2 py-2 px-4 rounded-lg ${updating === item._id ? 'bg-gray-400' : 'bg-blue-500'}`)}
                onPress={() => updateStatus(item._id, status)}
                disabled={updating === item._id}>
                {updating === item._id ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <Text style={tw('text-white font-medium text-sm')}>
                    Mark {status.replace('_', ' ')}
                  </Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {item.qrScannedByBuyer && (
        <View style={tw('mt-2')}>
          <Text style={tw('text-green-600 font-medium text-sm')}>✓ Confirmed by buyer - Payment released</Text>
        </View>
      )}
    </View>
    );
  };

  if (loading) {
    return <View style={tw(`flex-1 justify-center items-center ${isDarkMode ? 'bg-slate-900' : 'bg-white'}`)}>
      <ActivityIndicator size="large" color="#f97316" />
    </View>;
  }

  return (
    <View style={tw(`flex-1 ${isDarkMode ? 'bg-slate-900' : 'bg-white'}`)}>
      <View style={tw(`p-6 pt-12 ${isDarkMode ? 'bg-slate-800' : 'bg-green-800'}`)}>
        <Text style={tw('text-white text-2xl font-bold')}>My Deliveries</Text>
        <Text style={tw('text-blue-200 text-sm mt-1')}>{deliveries.length} active deliveries</Text>
      </View>
      <FlatList data={deliveries} renderItem={renderDelivery} keyExtractor={(item) => item._id}
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={
          <View style={tw('flex-1 items-center justify-center pt-10')}>
            <Text style={tw(`text-lg ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`)}>No active deliveries</Text>
            <Text style={tw(`text-sm mt-1 text-center ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`)}>
              Accept a job to start delivering
            </Text>
          </View>
        } />
    </View>
  );
};

export default ActiveDeliveries;
