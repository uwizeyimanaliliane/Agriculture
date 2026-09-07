import React, { useState, useCallback } from 'react';
import { View, Text, Image, TouchableOpacity, Alert, ActivityIndicator, FlatList } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { tw } from '../../utils/tw';
import { useTheme } from '../../context/ThemeContext';
import { cropAPI } from '../../services/api';
import { formatCurrency, getImageUrl } from '../../utils/formatters';

const AuctionList = ({ navigation }) => {
  const [crops, setCrops] = useState([]);
  const [loading, setLoading] = useState(true);
  const { isDarkMode } = useTheme();

  const fetchCrops = useCallback(async () => {
    try {
      const response = await cropAPI.getAvailable();
      setCrops(response.data.crops || []);
    } catch (error) {
      Alert.alert('Error', 'Failed to load available crops');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    fetchCrops();
  }, [fetchCrops]));

  const renderCrop = ({ item }) => (
    <TouchableOpacity
      style={tw(`p-4 mb-3 rounded-2xl shadow-sm ${isDarkMode ? 'bg-slate-800' : 'bg-white'}`)}
      onPress={() => navigation.navigate('Order', { crop: item })}
    >
      <View style={tw('flex-row items-center')}>
        {item.photos?.[0] ? (
          <Image source={{ uri: getImageUrl(item.photos[0]) }} style={tw('w-16 h-16 rounded-xl mr-3')} />
        ) : (
          <View style={tw('w-16 h-16 rounded-xl mr-3 bg-green-100 items-center justify-center')}>
            <Text style={tw('text-2xl')}>🌾</Text>
          </View>
        )}
        <View style={tw('flex-1')}>
          <Text style={tw(`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'}`)}>
            {item.name || 'Unknown'}
          </Text>
          <Text style={tw(`text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`)}>
            {item.quantity} {item.quantityUnit}
          </Text>
          <Text style={tw('text-green-600 font-semibold mt-1')}>
            {formatCurrency(item.price + 2500 + (item.transportPrice || 0))}
          </Text>
          <Text style={tw(`text-xs ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`)}>
            {item.location?.district || 'Unknown'}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return <View style={tw(`flex-1 justify-center items-center ${isDarkMode ? 'bg-slate-900' : 'bg-white'}`)}>
      <ActivityIndicator size="large" color="#16a34a" />
    </View>;
  }

  return (
    <View style={tw(`flex-1 ${isDarkMode ? 'bg-slate-900' : 'bg-white'}`)}>
      <View style={tw(`p-6 pt-12 ${isDarkMode ? 'bg-slate-800' : 'bg-green-800'}`)}>
        <Text style={tw('text-white text-2xl font-bold')}>Available Crops</Text>
        <Text style={tw('text-green-200 text-sm mt-1')}>Browse and buy crops now</Text>
      </View>
      <FlatList data={crops} renderItem={renderCrop} keyExtractor={(item) => item._id}
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={
          <View style={tw('flex-1 items-center justify-center pt-10')}>
            <Text style={tw(`text-lg ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`)}>No crops available</Text>
          </View>
        } />
    </View>
  );
};

export default AuctionList;
