import React, { useEffect, useState, useRef, useMemo } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Platform, PermissionsAndroid, Linking } from 'react-native';
import MapView, { Marker, Polyline } from '../../components/MapView';
import { tw } from '../../utils/tw';
import { useTheme } from '../../context/ThemeContext';
import { useI18n } from '../../i18n';
import { deliveryAPI } from '../../services/api';

const TransporterMap = ({ navigation }) => {
  const { isDarkMode } = useTheme();
  const { t } = useI18n();
  const [loading, setLoading] = useState(true);
  const [deliveries, setDeliveries] = useState([]);
  const [region, setRegion] = useState(null);
  const [currentPos, setCurrentPos] = useState(null);
  const [selectedDelivery, setSelectedDelivery] = useState(null);
  const [routeCoords, setRouteCoords] = useState([]);
  const mapRef = useRef(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        if (Platform.OS === 'android') {
          const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
          if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
            // continue without user location
          }
        }

        const res = await deliveryAPI.getAvailable();
        const data = res.data.deliveries || [];
        setDeliveries(data);

        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const { latitude, longitude } = pos.coords;
            setRegion({ latitude, longitude, latitudeDelta: 0.05, longitudeDelta: 0.05 });
            setCurrentPos({ latitude, longitude });
          },
          () => {
            const firstCoords = findFirstCoords(data);
            if (firstCoords) setRegion({ ...firstCoords, latitudeDelta: 0.12, longitudeDelta: 0.12 });
          },
          { enableHighAccuracy: true, timeout: 8000 }
        );
      } catch (err) {
        const firstCoords = findFirstCoords(deliveries);
        if (firstCoords) setRegion({ ...firstCoords, latitudeDelta: 0.2, longitudeDelta: 0.2 });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const getAllCoordinates = useMemo(() => {
    const coords = [];
    deliveries.forEach((d) => {
      const pickup = d.pickupLocation?.coordinates;
      const delivery = d.deliveryLocation?.coordinates;
      if (pickup && pickup.length === 2 && !coords.find((c) => c.latitude === pickup[1] && c.longitude === pickup[0])) {
        coords.push({ latitude: pickup[1], longitude: pickup[0] });
      }
      if (delivery && delivery.length === 2 && !coords.find((c) => c.latitude === delivery[1] && c.longitude === delivery[0])) {
        coords.push({ latitude: delivery[1], longitude: delivery[0] });
      }
    });
    if (currentPos) {
      coords.push(currentPos);
    }
    return coords;
  }, [deliveries, currentPos]);

  useEffect(() => {
    if (!loading && mapRef.current && getAllCoordinates.length > 0) {
      mapRef.current.fitToCoordinates(getAllCoordinates, {
        edgePadding: { top: 80, right: 80, bottom: 220, left: 80 },
        animated: true,
      });
    }
  }, [loading, getAllCoordinates]);

  const findFirstCoords = (items) => {
    for (const d of items) {
      const c = d.pickupLocation?.coordinates || d.deliveryLocation?.coordinates;
      if (c && c.length === 2 && (c[0] !== 0 || c[1] !== 0)) {
        return { latitude: c[1], longitude: c[0] };
      }
    }
    return null;
  };

  const openDirections = (from, to) => {
    const url = `https://www.google.com/maps/dir/?api=1&origin=${from.latitude},${from.longitude}&destination=${to.latitude},${to.longitude}&travelmode=driving`;
    Linking.openURL(url).catch(() => {});
  };

  const fetchRouteForDelivery = async (delivery) => {
    try {
      if (!currentPos) return;
      const origin = `${currentPos.latitude},${currentPos.longitude}`;
      const res = await deliveryAPI.getRoute(delivery._id, origin);
      const coords = res.data.coords || [];
      setRouteCoords(coords);
      if (coords.length > 0 && mapRef.current && mapRef.current.fitToCoordinates) {
        mapRef.current.fitToCoordinates(coords, { edgePadding: { top: 80, right: 80, bottom: 220, left: 80 }, animated: true });
      }
    } catch (err) {
      // ignore
    }
  };

  const renderMarkers = () => {
    return deliveries.map((d) => {
      const pickup = d.pickupLocation?.coordinates;
      const delivery = d.deliveryLocation?.coordinates;
      const pickupCoords = pickup && pickup.length === 2 ? { latitude: pickup[1], longitude: pickup[0] } : null;
      const deliveryCoords = delivery && delivery.length === 2 ? { latitude: delivery[1], longitude: delivery[0] } : null;

      return (
        <View key={d._id}>
          {pickupCoords && (
            <Marker
              coordinate={pickupCoords}
              pinColor="orange"
              title={d.crop?.name || 'Pickup'}
              description={`Pickup: ${d.pickupLocation?.district || 'unknown'}`}
              onPress={() => { setSelectedDelivery(d); fetchRouteForDelivery(d); }}
            />
          )}
          {deliveryCoords && (
            <Marker
              coordinate={deliveryCoords}
              pinColor="green"
              title={d.crop?.name || 'Delivery'}
              description={`Delivery: ${d.deliveryLocation?.district || 'unknown'}`}
              onPress={() => { setSelectedDelivery(d); fetchRouteForDelivery(d); }}
            />
          )}
        </View>
      );
    });
  };

  if (loading || !region) {
    return (
      <View style={tw(`flex-1 justify-center items-center ${isDarkMode ? 'bg-slate-900' : 'bg-white'}`)}>
        <ActivityIndicator size="large" color="#16a34a" />
        <Text style={tw(`mt-3 text-sm ${isDarkMode ? 'text-slate-300' : 'text-gray-500'}`)}>Loading transporter map...</Text>
      </View>
    );
  }

  const initialRegion = region || { latitude: -1.944, longitude: 30.06, latitudeDelta: 0.5, longitudeDelta: 0.5 };

  return (
    <View style={tw('flex-1')}> 
      <View style={tw(`absolute top-0 left-0 right-0 z-10 p-4 ${isDarkMode ? 'bg-slate-950/80' : 'bg-white/90'}`)}>
        <TouchableOpacity style={tw('self-start px-4 py-2 rounded-full bg-green-600 mb-2')}
          onPress={() => navigation.goBack()}>
          <Text style={tw('text-white font-medium')}>← Back</Text>
        </TouchableOpacity>
        <Text style={tw(`text-base font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`)}>Transporter map</Text>
        <Text style={tw(`text-xs mt-1 ${isDarkMode ? 'text-slate-300' : 'text-gray-600'}`)}>
          Tap any pin to select the job and see routing. Orange is pickup, green is dropoff.
        </Text>
      </View>

      <MapView
        ref={mapRef}
        style={{ flex: 1 }}
        initialRegion={initialRegion}
        showsUserLocation
        followsUserLocation
        showsCompass
        showsScale
        loadingEnabled
        mapType="standard"
      >
        {renderMarkers()}
        {routeCoords && routeCoords.length > 0 && (
          <Polyline coordinates={routeCoords} strokeColor="#2563eb" strokeWidth={4} />
        )}
      </MapView>

      <View style={{ position: 'absolute', right: 16, bottom: 20 }}>
        <TouchableOpacity style={tw('bg-white p-3 rounded-full shadow-lg')} onPress={() => {
          const first = findFirstCoords(deliveries);
          if (first) {
            openDirections(currentPos || { latitude: initialRegion.latitude, longitude: initialRegion.longitude }, first);
          }
        }}>
          <Text style={tw('text-green-700 font-bold')}>Navigate</Text>
        </TouchableOpacity>
      </View>

      {selectedDelivery && (
        <View style={{ position: 'absolute', left: 16, right: 16, bottom: 20 }}>
          <View style={tw('bg-white p-4 rounded-3xl shadow-lg')}>
            <Text style={tw('font-semibold text-lg')}>{selectedDelivery.crop?.name || 'Selected delivery'}</Text>
            <Text style={tw('text-sm text-gray-600 mt-1')}>Pickup: {selectedDelivery.pickupLocation?.district || '—'}</Text>
            <Text style={tw('text-sm text-gray-600 mt-1')}>Delivery: {selectedDelivery.deliveryLocation?.district || '—'}</Text>
            <Text style={tw('text-xs text-gray-500 mt-2')}>Contact admin from Delivery Requests to coordinate pickup details.</Text>
          </View>
        </View>
      )}
    </View>
  );
};

export default TransporterMap;
