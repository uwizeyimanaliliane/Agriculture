import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { tw } from '../../utils/tw';
import { useTheme } from '../../context/ThemeContext';
import { deliveryAPI } from '../../services/api';
import BackButton from '../../components/BackButton';

const QRScanScreen = ({ route, navigation }) => {
  const { deliveryId } = route.params || {};
  const [scanning, setScanning] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const { isDarkMode } = useTheme();

  const handleSimulateScan = async () => {
    if (!deliveryId) {
      Alert.alert('Error', 'No delivery ID provided');
      return;
    }

    setScanning(true);
    try {
      await deliveryAPI.confirmQR(deliveryId);
      setConfirmed(true);
      Alert.alert(
        'Delivery Confirmed',
        'QR code scanned successfully.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to confirm delivery');
    } finally {
      setScanning(false);
    }
  };

  return (
    <View style={tw(`flex-1 ${isDarkMode ? 'bg-slate-900' : 'bg-white'}`)}>
      <View style={tw(`p-6 pt-12 ${isDarkMode ? 'bg-slate-800' : 'bg-green-800'}`)}>
        <BackButton onPress={() => navigation.goBack()} />
        <Text style={tw('text-white text-2xl font-bold mt-4')}>Scan QR Code</Text>
        <Text style={tw('text-blue-200 text-sm mt-1')}>Scan the farmer's QR code to confirm delivery</Text>
      </View>

      <View style={tw(`flex-1 justify-center items-center px-6`)}>
        <View style={tw(`w-64 h-64 rounded-2xl items-center justify-center mb-8 shadow-lg border-2
          ${isDarkMode ? 'bg-slate-800 border-slate-600' : 'bg-white border-gray-200'}`)}>
          {confirmed ? (
            <View style={tw('items-center')}>
              <Text style={tw('text-5xl mb-2')}>✅</Text>
              <Text style={tw(`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'}`)}>Confirmed</Text>
            </View>
          ) : (
            <View style={tw('items-center')}>
              <View style={tw('w-20 h-20 rounded-2xl bg-blue-100 items-center justify-center mb-3')}>
                <Text style={tw('text-4xl')}>📷</Text>
              </View>
              <Text style={tw(`text-sm mt-2 text-center ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`)}>
                Point camera at QR code
              </Text>
            </View>
          )}
        </View>

        {!confirmed && (
          <TouchableOpacity
            style={tw(`w-full py-4 rounded-xl items-center ${scanning ? 'bg-blue-400' : 'bg-blue-600'}`)}
            onPress={handleSimulateScan}
            disabled={scanning}
          >
            <Text style={tw('text-white font-semibold text-base')}>
              {scanning ? 'Scanning...' : 'Simulate QR Scan'}
            </Text>
          </TouchableOpacity>
        )}

        <Text style={tw(`text-xs mt-4 text-center ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`)}>
          Note: In production, this will use the device camera to scan
        </Text>
      </View>
    </View>
  );
};

export default QRScanScreen;
