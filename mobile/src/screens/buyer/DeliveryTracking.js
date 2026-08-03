import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { tw } from '../../utils/tw';
import { useTheme } from '../../context/ThemeContext';
import { deliveryAPI } from '../../services/api';
import { formatDateTime, getStatusColor } from '../../utils/formatters';
import BackButton from '../../components/BackButton';
import ContactButtons from '../../components/ContactButtons';
import { ADMIN_PHONE, ADMIN_NAME } from '../../utils/contact';

const DeliveryTracking = ({ route, navigation }) => {
  const { deliveryId } = route.params || {};
  const [delivery, setDelivery] = useState(null);
  const [loading, setLoading] = useState(true);
  const { isDarkMode } = useTheme();

  useEffect(() => {
    if (deliveryId) fetchDelivery();
  }, [deliveryId]);

  const fetchDelivery = async () => {
    try {
      const response = await deliveryAPI.getById(deliveryId);
      setDelivery(response.data.delivery);
    } catch (error) {
      Alert.alert('Error', 'Failed to load delivery');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmQR = () => {
    navigation.navigate('QRScan', { deliveryId });
  };

  const statusSteps = ['pending', 'assigned', 'picked_up', 'in_transit', 'delivered', 'confirmed'];

  if (loading) {
    return <View style={tw(`flex-1 justify-center items-center ${isDarkMode ? 'bg-slate-900' : 'bg-white'}`)}>
      <ActivityIndicator size="large" color="#16a34a" />
    </View>;
  }

  if (!delivery) {
    return <View style={tw(`flex-1 justify-center items-center ${isDarkMode ? 'bg-slate-900' : 'bg-white'}`)}>
      <Text style={tw(`text-lg ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`)}>Delivery not found</Text>
    </View>;
  }

  const currentIndex = statusSteps.indexOf(delivery.status);

  return (
    <View style={tw(`flex-1 ${isDarkMode ? 'bg-slate-900' : 'bg-white'}`)}>
      <View style={tw(`p-6 pt-12 ${isDarkMode ? 'bg-slate-800' : 'bg-green-800'}`)}>
        <BackButton onPress={() => navigation.goBack()} />
        <Text style={tw('text-white text-2xl font-bold mt-4')}>Delivery Tracking</Text>
        <Text style={tw('text-blue-200 text-sm mt-1')}>Order #{delivery._id?.slice(-6).toUpperCase()}</Text>
      </View>

      <View style={tw(`mx-4 -mt-6 p-5 rounded-2xl shadow-lg ${isDarkMode ? 'bg-slate-800' : 'bg-white'}`)}>
        <View style={tw('flex-row justify-between items-center mb-4')}>
          <Text style={tw(`font-semibold text-lg ${isDarkMode ? 'text-white' : 'text-gray-800'}`)}>Status</Text>
          <View style={{ backgroundColor: getStatusColor(delivery.status) + '20', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 }}>
            <Text style={{ color: getStatusColor(delivery.status), fontSize: 13, fontWeight: '600' }}>
              {delivery.status.replace('_', ' ')}
            </Text>
          </View>
        </View>

        <View style={tw('mb-2')}>
          {statusSteps.map((step, index) => {
            const isComplete = index <= currentIndex;
            const isCurrent = index === currentIndex;
            return (
              <View key={step} style={tw('flex-row items-center mb-2')}>
                <View style={tw(`w-6 h-6 rounded-full items-center justify-center ${isComplete ? 'bg-green-500' : isDarkMode ? 'bg-slate-700' : 'bg-gray-200'}`)}>
                  <Text style={tw(`text-xs font-bold ${isComplete ? 'text-white' : isDarkMode ? 'text-slate-500' : 'text-gray-500'}`)}>
                    {isComplete ? '✓' : index + 1}
                  </Text>
                </View>
                <Text style={tw(`ml-3 text-sm capitalize ${isComplete ? 'text-green-600 font-medium' : isCurrent ? 'text-blue-500 font-medium' : isDarkMode ? 'text-slate-500' : 'text-gray-400'}`)}>
                  {step.replace(/_/g, ' ')}
                </Text>
              </View>
            );
          })}
        </View>

        {delivery.crop?.name && (
          <View style={tw(`mt-4 pt-4 border-t ${isDarkMode ? 'border-slate-700' : 'border-gray-100'}`)}>
            <Text style={tw(`text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`)}>Crop</Text>
            <Text style={tw(`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'}`)}>{delivery.crop.name}</Text>
          </View>
        )}

        {delivery.transporter?.name && (
          <View style={tw(`mt-2 pt-2 border-t ${isDarkMode ? 'border-slate-700' : 'border-gray-100'}`)}>
            <Text style={tw(`text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`)}>Transporter</Text>
            <Text style={tw(`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'}`)}>{delivery.transporter.name}</Text>
            <Text style={tw(`text-xs mt-1 ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`)}>
              Contact Agri-Link admin to coordinate with your transporter.
            </Text>
            <ContactButtons
              phone={ADMIN_PHONE}
              name={ADMIN_NAME}
              smsBody={`Delivery #${delivery._id?.slice(-6)} - transporter ${delivery.transporter.name}`}
              compact
              isDarkMode={isDarkMode}
            />
          </View>
        )}

        {delivery.pickupDate && (
          <Text style={tw(`text-xs mt-2 ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`)}>
            Pickup: {formatDateTime(delivery.pickupDate)}
          </Text>
        )}
        {delivery.deliveryDate && (
          <Text style={tw(`text-xs mt-1 ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`)}>
            Delivered: {formatDateTime(delivery.deliveryDate)}
          </Text>
        )}
      </View>

      {delivery.status === 'delivered' && !delivery.qrScannedByBuyer && (
        <View style={tw('mx-4 mt-4')}>
          <TouchableOpacity style={tw('bg-green-800 py-4 rounded-xl items-center')}
            onPress={handleConfirmQR}>
            <Text style={tw('text-white font-semibold text-base')}>Scan QR to Confirm Delivery</Text>
          </TouchableOpacity>
        </View>
      )}

      {delivery.qrScannedByBuyer && (
        <View style={tw('mx-4 mt-4 p-4 rounded-2xl bg-green-100 items-center')}>
          <Text style={tw('text-green-800 font-semibold text-base')}>✓ Delivery Confirmed</Text>
          <Text style={tw('text-green-600 text-sm mt-1')}>Awaiting admin payment release</Text>
        </View>
      )}
    </View>
  );
};

export default DeliveryTracking;
