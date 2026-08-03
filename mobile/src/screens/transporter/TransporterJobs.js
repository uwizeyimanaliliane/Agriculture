import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, TouchableOpacity, Alert, ActivityIndicator, FlatList, TextInput, Modal, Dimensions } from 'react-native';
import MapView, { Marker } from '../../components/MapView';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { tw } from '../../utils/tw';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useI18n } from '../../i18n';
import { deliveryAPI } from '../../services/api';
import { formatCurrency } from '../../utils/formatters';
import ContactButtons from '../../components/ContactButtons';
import { ADMIN_PHONE, ADMIN_NAME } from '../../utils/contact';

const { width } = Dimensions.get('window');
const MAP_PREVIEW_HEIGHT = 380;

const TransporterJobs = () => {
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [priceModal, setPriceModal] = useState({ visible: false, delivery: null });
  const [price, setPrice] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { isDarkMode } = useTheme();
  const { user } = useAuth();
  const { t } = useI18n();
  const navigation = useNavigation();

  const loadDeliveries = async () => {
    setLoading(true);
    try {
      const res = await deliveryAPI.getAvailable();
      setDeliveries(res.data.deliveries || []);
    } catch (err) {
      setDeliveries([]);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { loadDeliveries(); }, []));

  const handleSetPrice = async () => {
    const delivery = priceModal.delivery;
    if (!price || isNaN(price) || Number(price) <= 0) {
      Alert.alert('Error', 'Please enter a valid price');
      return;
    }
    setSubmitting(true);
    try {
      await deliveryAPI.setPrice(delivery._id, Number(price));
      Alert.alert('Success', 'Price quoted! Waiting for user to accept.');
      setPriceModal({ visible: false, delivery: null });
      setPrice('');
      loadDeliveries();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to set price');
    } finally {
      setSubmitting(false);
    }
  };

  const getLocation = (d) => {
    const parts = [];
    if (d.pickupLocation?.province) parts.push(d.pickupLocation.province);
    if (d.pickupLocation?.district) parts.push(d.pickupLocation.district);
    return parts.join(', ') || 'Location not specified';
  };

  const mapMarkers = useMemo(() => {
    return deliveries.flatMap((d) => {
      const markers = [];
      const pickup = d.pickupLocation?.coordinates;
      const delivery = d.deliveryLocation?.coordinates;
      if (pickup && pickup.length === 2) {
        markers.push({
          id: `${d._id}-pickup`,
          coordinate: { latitude: pickup[1], longitude: pickup[0] },
          title: d.crop?.name || 'Pickup',
          description: `Pickup: ${d.pickupLocation?.district || 'unknown'}`,
          pinColor: 'orange',
        });
      }
      if (delivery && delivery.length === 2) {
        markers.push({
          id: `${d._id}-delivery`,
          coordinate: { latitude: delivery[1], longitude: delivery[0] },
          title: d.crop?.name || 'Delivery',
          description: `Dropoff: ${d.deliveryLocation?.district || 'unknown'}`,
          pinColor: 'green',
        });
      }
      return markers;
    });
  }, [deliveries]);

  const previewRegion = useMemo(() => {
    if (mapMarkers.length === 0) {
      return { latitude: -1.944, longitude: 30.06, latitudeDelta: 0.5, longitudeDelta: 0.5 };
    }

    const latitudes = mapMarkers.map((m) => m.coordinate.latitude);
    const longitudes = mapMarkers.map((m) => m.coordinate.longitude);
    const north = Math.max(...latitudes);
    const south = Math.min(...latitudes);
    const east = Math.max(...longitudes);
    const west = Math.min(...longitudes);
    const latitudeDelta = Math.max(0.02, north - south + 0.08);
    const longitudeDelta = Math.max(0.02, east - west + 0.08);
    return {
      latitude: (north + south) / 2,
      longitude: (east + west) / 2,
      latitudeDelta,
      longitudeDelta,
    };
  }, [mapMarkers]);

  const renderItem = ({ item }) => {
    const assignedToMe = item.transporter && String(item.transporter._id || item.transporter) === String(user?._id);
    const canSetPrice = !item.transporterPrice && (!item.transporter || assignedToMe);
    const adminContact = item.adminContact || { phone: ADMIN_PHONE, name: ADMIN_NAME };

    return (
    <View style={tw(`p-4 mb-3 rounded-2xl shadow-sm ${isDarkMode ? 'bg-slate-800' : 'bg-white'}`)}>
      <View style={tw('flex-row items-start')}>
        <View style={tw('w-10 h-10 rounded-full bg-orange-100 items-center justify-center mr-3')}>
          <Text style={tw('text-orange-600 text-lg font-bold')}>T</Text>
        </View>
        <View style={tw('flex-1')}>
          <Text style={tw(`font-semibold text-base ${isDarkMode ? 'text-white' : 'text-gray-800'}`)}>
            {item.crop?.name || 'Crop Delivery'}
          </Text>
          <Text style={tw(`text-sm mt-1 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`)}>
            Pickup: {getLocation(item)}
          </Text>
          {item.deliveryLocation?.district && (
            <Text style={tw(`text-sm mt-1 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`)}>
              Dropoff: {[item.deliveryLocation.province, item.deliveryLocation.district].filter(Boolean).join(', ')}
            </Text>
          )}
          {item.crop?.quantity && (
            <Text style={tw(`text-xs mt-1 ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`)}>
              {item.crop.quantity} {item.crop.quantityUnit}
            </Text>
          )}
          {item.deliveryNotes && (
            <Text style={tw(`text-xs mt-1 italic ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`)}>
              {item.deliveryNotes}
            </Text>
          )}

          <View style={tw('flex-row items-center mt-2')}>
            <View style={tw('bg-gray-100 px-2 py-0.5 rounded-full mr-2')}>
              <Text style={tw('text-xs text-gray-600')}>{item.status}</Text>
            </View>
            {assignedToMe && (
              <View style={tw('bg-orange-100 px-2 py-0.5 rounded-full mr-2')}>
                <Text style={tw('text-xs text-orange-700')}>Assigned to you</Text>
              </View>
            )}
            {item.transporterPrice && (
              <Text style={tw('text-green-600 font-semibold text-sm')}>
                {formatCurrency(item.transporterPrice)}
              </Text>
            )}
          </View>

          <ContactButtons
            phone={adminContact.phone}
            name={adminContact.name}
            smsBody={`Delivery request for ${item.crop?.name || 'crop'} - pickup ${getLocation(item)}`}
            compact
            isDarkMode={isDarkMode}
          />

          {canSetPrice && (
            <TouchableOpacity style={tw('mt-3 bg-green-800 py-2.5 rounded-xl items-center')}
              onPress={() => setPriceModal({ visible: true, delivery: item })}>
              <Text style={tw('text-white font-medium')}>Set Your Price</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
  };

  return (
    <View style={tw(`flex-1 ${isDarkMode ? 'bg-slate-900' : 'bg-white'}`)}>
      <View style={tw(`p-6 pt-12 ${isDarkMode ? 'bg-slate-800' : 'bg-green-800'}`)}>
        <View style={tw('flex-row justify-between items-center')}>
          <View>
            <Text style={tw('text-white text-2xl font-bold')}>Delivery Requests</Text>
            <Text style={tw('text-green-200 text-sm mt-1')}>Available transport jobs</Text>
          </View>
          <View style={tw('flex-row items-center')}>
            <TouchableOpacity style={tw('bg-white/20 p-2 rounded-lg mr-2')} onPress={() => navigation.navigate('TransporterMap')}>
              <Text style={tw('text-white text-xs')}>Full Map</Text>
            </TouchableOpacity>
            <TouchableOpacity style={tw('bg-white/20 p-2 rounded-lg')} onPress={loadDeliveries}>
              <Text style={tw('text-white text-xs')}>Refresh</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <View style={tw('px-4 pt-3')}>
        <TouchableOpacity style={tw('bg-blue-600 py-2.5 rounded-xl items-center mb-3')}
          onPress={() => navigation.navigate('CropBid')}>
          <Text style={tw('text-white font-medium')}>Bid on Crops Needing Transport</Text>
        </TouchableOpacity>
      </View>

      <View style={tw('px-4 pt-1')}> 
        <Text style={tw(`text-base font-semibold mb-3 ${isDarkMode ? 'text-white' : 'text-gray-800'}`)}>
          Job locations on the map
        </Text>
        <View style={tw('rounded-3xl overflow-hidden mb-4')}> 
          {mapMarkers.length > 0 ? (
            <MapView
              style={{ width: width - 32, height: MAP_PREVIEW_HEIGHT }}
              initialRegion={previewRegion}
              region={previewRegion}
              loadingEnabled
              mapType="standard"
              showsCompass
              showsScale
              showsUserLocation={false}
              showsMyLocationButton={false}
              pitchEnabled={false}
              zoomControlEnabled={true}
            >
              {mapMarkers.map((marker) => (
                <Marker
                  key={marker.id}
                  coordinate={marker.coordinate}
                  title={marker.title}
                  description={marker.description}
                  pinColor={marker.pinColor}
                />
              ))}
            </MapView>
          ) : (
            <View style={tw(`w-[${width - 32}] h-[${MAP_PREVIEW_HEIGHT}] items-center justify-center ${isDarkMode ? 'bg-slate-800' : 'bg-white'}`)}>
              <Text style={tw(`text-sm ${isDarkMode ? 'text-slate-300' : 'text-gray-500'}`)}>
                No mapped job coordinates found in the database.
              </Text>
            </View>
          )}
        </View>

        <View style={tw('flex-row items-center justify-between mb-4')}>
          <Text style={tw(`text-sm ${isDarkMode ? 'text-slate-300' : 'text-gray-500'}`)}>
            Only database delivery locations are shown.
          </Text>
          <TouchableOpacity style={tw('bg-green-800 px-4 py-2 rounded-2xl')} onPress={() => navigation.navigate('TransporterMap')}>
            <Text style={tw('text-white font-semibold')}>Open full map</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={tw('flex-1 px-4')}>
        {loading ? (
          <View style={tw('flex-1 justify-center items-center')}>
            <ActivityIndicator size="large" color="#16a34a" />
          </View>
        ) : (
          <FlatList data={deliveries} renderItem={renderItem} keyExtractor={item => item._id}
            contentContainerStyle={{ paddingBottom: 20 }}
            ListEmptyComponent={
              <View style={tw('flex-1 justify-center items-center pt-20')}>
                <Text style={tw(`text-lg ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`)}>No delivery requests yet</Text>
              </View>
            } />
        )}
      </View>

      <Modal visible={priceModal.visible} transparent animationType="fade">
        <View style={tw('flex-1 justify-center items-center bg-black/50')}>
          <View style={tw(`w-80 p-6 rounded-2xl ${isDarkMode ? 'bg-slate-800' : 'bg-white'}`)}>
            <Text style={tw(`text-lg font-semibold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-800'}`)}>
              Set Your Price
            </Text>
            {priceModal.delivery?.crop?.name && (
              <Text style={tw('text-sm text-gray-500 mb-4')}>
                {priceModal.delivery.crop.name} delivery
              </Text>
            )}
            <View style={tw('flex-row items-center mb-4')}>
              <Text style={tw(`text-lg font-semibold mr-2 ${isDarkMode ? 'text-white' : 'text-gray-800'}`)}>RWF</Text>
              <TextInput
                style={tw(`flex-1 border rounded-xl px-4 py-3 text-lg font-semibold ${isDarkMode ? 'border-slate-600 text-white' : 'border-gray-300 text-gray-800'}`)}
                placeholder="0"
                placeholderTextColor="#94a3b8"
                keyboardType="numeric"
                value={price}
                onChangeText={setPrice}
              />
            </View>
            <View style={tw('flex-row')}>
              <TouchableOpacity style={tw('flex-1 py-3 rounded-xl border border-gray-300 mr-2 items-center')}
                onPress={() => { setPriceModal({ visible: false, delivery: null }); setPrice(''); }}>
                <Text style={tw('text-gray-600 font-medium')}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={tw(`flex-1 py-3 rounded-xl items-center ${submitting ? 'bg-green-700' : 'bg-green-800'}`)}
                onPress={handleSetPrice} disabled={submitting}>
                {submitting ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={tw('text-white font-medium')}>Submit Price</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default TransporterJobs;
