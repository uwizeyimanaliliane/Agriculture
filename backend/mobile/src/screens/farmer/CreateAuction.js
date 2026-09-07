import React, { useState, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { tw } from '../../utils/tw';
import { useTheme } from '../../context/ThemeContext';
import { cropAPI, auctionAPI } from '../../services/api';
import BackButton from '../../components/BackButton';

const CreateAuction = ({ navigation }) => {
  const [crops, setCrops] = useState([]);
  const [selectedCrop, setSelectedCrop] = useState(null);
  const [startingPrice, setStartingPrice] = useState('');
  const [loading, setLoading] = useState(false);
  const { isDarkMode } = useTheme();

  const fetchCrops = useCallback(async () => {
    try {
      const response = await cropAPI.getMine();
      setCrops(response.data.crops.filter(c => c.status !== 'sold' && c.status !== 'in_auction'));
    } catch (error) {
      Alert.alert('Error', 'Failed to load crops');
    }
  }, []);

  useFocusEffect(useCallback(() => {
    fetchCrops();
  }, [fetchCrops]));

  const handleSubmit = async () => {
    if (!selectedCrop || !startingPrice) {
      Alert.alert('Error', 'Please select a crop and enter a price');
      return;
    }
    setLoading(true);
    try {
      await auctionAPI.create({
        cropId: selectedCrop._id,
        startingPrice: parseFloat(startingPrice),
      });
      Alert.alert('Success', 'Listing created successfully');
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to create listing');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={tw(`flex-1 p-6 ${isDarkMode ? 'bg-slate-900' : 'bg-white'}`)}>
      <BackButton onPress={() => navigation.goBack()} />
      <Text style={tw(`text-2xl font-bold mb-6 ${isDarkMode ? 'text-white' : 'text-green-800'}`)}>Create Listing</Text>

      <Text style={tw(`mb-2 font-semibold ${isDarkMode ? 'text-white' : 'text-gray-700'}`)}>Select Crop *</Text>
      {crops.map((crop) => (
        <TouchableOpacity key={crop._id}
          style={tw(`p-3 mb-2 rounded-xl border ${selectedCrop?._id === crop._id ? 'border-green-500 bg-green-50' : isDarkMode ? 'border-slate-600 bg-slate-700' : 'border-gray-200 bg-white'}`)}
          onPress={() => setSelectedCrop(crop)}>
          <Text style={tw(`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'}`)}>{crop.name}</Text>
          <Text style={tw(`text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`)}>{crop.quantity} {crop.quantityUnit}</Text>
        </TouchableOpacity>
      ))}

      <TextInput style={tw(`border rounded-xl px-4 py-3 mb-6 mt-3 ${isDarkMode ? 'border-slate-600 bg-slate-700 text-white' : 'border-green-200 bg-white text-gray-800'}`)}
        placeholder="Price (RWF) *" placeholderTextColor={isDarkMode ? '#94a3b8' : '#9ca3af'}
        value={startingPrice} onChangeText={setStartingPrice} keyboardType="numeric" />

      <TouchableOpacity style={tw(`py-3 rounded-xl ${loading ? 'bg-green-700' : 'bg-green-800'} mb-8`)}
        onPress={handleSubmit} disabled={loading}>
        {loading ? <ActivityIndicator color="white" /> : <Text style={tw('text-white font-semibold text-base text-center')}>Create Listing</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
};

export default CreateAuction;