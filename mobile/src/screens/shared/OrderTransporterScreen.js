import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert, ActivityIndicator, FlatList, TextInput } from 'react-native';
import { tw } from '../../utils/tw';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { orderAPI, deliveryAPI } from '../../services/api';
import BackButton from '../../components/BackButton';
import { alert, confirmAlert } from '../../utils/platform';

const OrderTransporterScreen = ({ route, navigation }) => {
  const { crop, deliveryId: existingDeliveryId, escrowId, orderType = 'farmer' } = route.params || {};
  const { user } = useAuth();
  const { isDarkMode } = useTheme();
  const [step, setStep] = useState(existingDeliveryId ? 'transporters' : 'create_delivery');
  const [deliveryId, setDeliveryId] = useState(existingDeliveryId || null);
  const [transporters, setTransporters] = useState([]);
  const [selectedTransporter, setSelectedTransporter] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingTransporters, setLoadingTransporters] = useState(false);
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [ordered, setOrdered] = useState(false);

  useEffect(() => {
    if (existingDeliveryId || step === 'transporters') {
      fetchTransporters();
    }
  }, [existingDeliveryId]);

  const fetchTransporters = async () => {
    setLoadingTransporters(true);
    try {
      const params = {};
      if (user?.location?.coordinates) {
        params.lat = user.location.coordinates[1];
        params.lng = user.location.coordinates[0];
      }
      const res = await orderAPI.getTransporters(params);
      setTransporters(res.data.transporters || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingTransporters(false);
    }
  };

  const handleCreateDelivery = async () => {
    if (!crop) return;
    setLoading(true);
    try {
      const res = await deliveryAPI.create({
        cropId: crop._id || crop.id,
        requestedBy: orderType,
        deliveryNotes,
        pickupLocation: crop.location || {},
        deliveryLocation: {},
      });
      setDeliveryId(res.data.delivery._id);
      setStep('transporters');
      fetchTransporters();
    } catch (err) {
      alert('Error', err.response?.data?.message || 'Failed to create delivery request');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTransporter = async (transporter) => {
    setSelectedTransporter(transporter);
    confirmAlert('Confirm Transporter', `Send delivery request to ${transporter.name}${transporter.distance ? ` (${transporter.distance} km away)` : ''}?`, async () => {
      setLoading(true);
      try {
        await orderAPI.orderTransporter(deliveryId, transporter._id);
        setOrdered(true);
      } catch (err) {
        alert('Error', err.response?.data?.message || 'Failed to order transporter');
        setSelectedTransporter(null);
      } finally {
        setLoading(false);
      }
    }, () => setSelectedTransporter(null), 'Send Request', 'Cancel');
  };

  if (ordered) {
    return (
      <View style={tw(`flex-1 ${isDarkMode ? 'bg-slate-900' : 'bg-white'}`)}>
        <View style={tw(`p-6 pt-12 ${isDarkMode ? 'bg-slate-800' : 'bg-green-800'}`)}>
          <Text style={tw('text-white text-2xl font-bold')}>Request Sent!</Text>
        </View>
        <View style={tw('flex-1 p-4 items-center justify-center')}>
          <Text style={tw('text-6xl mb-4')}>🚚</Text>
          <Text style={tw(`text-xl font-bold mb-2 text-center ${isDarkMode ? 'text-white' : 'text-gray-800'}`)}>
            Transporter Notified
          </Text>
          <Text style={tw(`text-sm mb-6 text-center px-4 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`)}>
            {selectedTransporter?.name} has been notified. They will review your request and set a price. You'll get a notification when they respond. Agri-Link admin will coordinate the delivery.
          </Text>
          {selectedTransporter && (
            <View style={tw(`w-full p-4 rounded-2xl mb-6 ${isDarkMode ? 'bg-slate-800' : 'bg-white'}`)}>
              <Text style={tw(`text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`)}>Transporter</Text>
              <Text style={tw(`text-base font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`)}>{selectedTransporter.name}</Text>
              {selectedTransporter.distance && (
                <Text style={tw(`text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`)}>Distance: {selectedTransporter.distance} km</Text>
              )}
            </View>
          )}
          <TouchableOpacity style={tw('bg-green-800 py-4 px-8 rounded-xl w-full items-center')}
            onPress={() => navigation.navigate('MyDeliveries')}>
            <Text style={tw('text-white font-semibold')}>View My Deliveries</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (step === 'create_delivery' && !deliveryId) {
    return (
      <View style={tw(`flex-1 ${isDarkMode ? 'bg-slate-900' : 'bg-white'}`)}>
        <View style={tw(`p-6 pt-12 ${isDarkMode ? 'bg-slate-800' : 'bg-green-800'}`)}>
          <BackButton onPress={() => navigation.goBack()} />
          <Text style={tw('text-white text-2xl font-bold mt-4')}>Order Transporter</Text>
          <Text style={tw('text-green-200 text-sm mt-1')}>Request a transporter for your crop</Text>
        </View>

        <View style={tw('p-4')}>
          {crop && (
            <View style={tw(`p-4 mb-4 rounded-2xl ${isDarkMode ? 'bg-slate-800' : 'bg-white'}`)}>
              <Text style={tw(`text-lg font-semibold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-800'}`)}>{crop.name}</Text>
              <Text style={tw(`text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`)}>{crop.quantity} {crop.quantityUnit}</Text>
              {crop.location?.district && (
                <Text style={tw(`text-xs mt-1 ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`)}>Location: {crop.location.district}</Text>
              )}
            </View>
          )}

          <Text style={tw(`text-sm font-medium mb-2 ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`)}>Delivery Notes (optional)</Text>
          <TextInput
            style={tw(`border rounded-xl px-4 py-3 mb-6 ${isDarkMode ? 'border-slate-600 text-white bg-slate-800' : 'border-gray-300 text-gray-800 bg-white'}`)}
            placeholder="e.g., handle with care..."
            placeholderTextColor="#94a3b8"
            value={deliveryNotes}
            onChangeText={setDeliveryNotes}
            multiline
          />

          <TouchableOpacity style={tw(`py-4 rounded-xl items-center ${loading ? 'bg-green-700' : 'bg-green-800'}`)}
            onPress={handleCreateDelivery} disabled={loading}>
            {loading ? <ActivityIndicator color="white" /> : <Text style={tw('text-white font-semibold text-base')}>Continue to Select Transporter</Text>}
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={tw(`flex-1 ${isDarkMode ? 'bg-slate-900' : 'bg-white'}`)}>
      <View style={tw(`p-6 pt-12 ${isDarkMode ? 'bg-slate-800' : 'bg-green-800'}`)}>
        <BackButton onPress={() => navigation.goBack()} />
        <Text style={tw('text-white text-2xl font-bold mt-4')}>Select Transporter</Text>
        <Text style={tw('text-green-200 text-sm mt-1')}>
          {transporters.length} available {transporters.length === 1 ? 'transporter' : 'transporters'}
        </Text>
      </View>

      <View style={tw('flex-1 px-4 pt-4')}>
        {loadingTransporters ? (
          <View style={tw('flex-1 justify-center items-center')}>
            <ActivityIndicator size="large" color="#16a34a" />
          </View>
        ) : (
          <FlatList data={transporters} keyExtractor={(item) => item._id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={tw(`p-4 mb-3 rounded-2xl shadow-sm border-2 ${selectedTransporter?._id === item._id ? 'border-green-500' : 'border-transparent'} ${isDarkMode ? 'bg-slate-800' : 'bg-white'}`)}
                onPress={() => handleSelectTransporter(item)}
                disabled={loading}
              >
                <View style={tw('flex-row items-center')}>
                  <View style={tw('w-12 h-12 rounded-full bg-orange-100 items-center justify-center mr-3')}>
                    <Text style={tw('text-orange-600 text-xl font-bold')}>T</Text>
                  </View>
                  <View style={tw('flex-1')}>
                    <Text style={tw(`font-semibold text-base ${isDarkMode ? 'text-white' : 'text-gray-800'}`)}>{item.name}</Text>
                    {item.distance !== null && item.distance !== undefined && (
                      <Text style={tw('text-xs text-orange-500 font-medium')}>{item.distance} km away</Text>
                    )}
                    {item.location?.district && (
                      <Text style={tw(`text-xs ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`)}>{item.location.district}</Text>
                    )}
                  </View>
                  <Text style={tw('text-green-600 text-lg')}>{'>'}</Text>
                </View>
              </TouchableOpacity>
            )}
            contentContainerStyle={{ paddingBottom: 20 }}
            ListEmptyComponent={
              <View style={tw('flex-1 justify-center items-center pt-20')}>
                <Text style={tw(`text-lg ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`)}>No transporters available</Text>
                <Text style={tw(`text-sm mt-1 text-center ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`)}>Check back later or contact support</Text>
              </View>
            }
          />
        )}
      </View>
    </View>
  );
};

export default OrderTransporterScreen;
