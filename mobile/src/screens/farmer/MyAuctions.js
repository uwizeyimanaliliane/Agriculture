import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, Alert, ActivityIndicator, FlatList } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { tw } from '../../utils/tw';
import { useTheme } from '../../context/ThemeContext';
import { auctionAPI } from '../../services/api';
import { formatCurrency, formatDate, getStatusColor } from '../../utils/formatters';

const MyAuctions = ({ navigation }) => {
  const [auctions, setAuctions] = useState([]);
  const [loading, setLoading] = useState(true);
  const { isDarkMode } = useTheme();

  const fetchAuctions = useCallback(async () => {
    try {
      const response = await auctionAPI.getMine();
      setAuctions(response.data.auctions);
    } catch (error) {
      Alert.alert('Error', 'Failed to load auctions');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    fetchAuctions();
  }, [fetchAuctions]));

  const handleClose = (id) => {
    Alert.alert('Remove Listing', 'This will remove this crop listing. Continue?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', onPress: async () => {
        try {
          await auctionAPI.close(id);
          fetchAuctions();
        } catch (error) {
          Alert.alert('Error', 'Failed to remove listing');
        }
      }},
    ]);
  };

  const renderAuction = ({ item }) => {
    const statusColor = getStatusColor(item.status);
    return (
      <View style={tw(`p-4 mb-3 rounded-2xl shadow-sm ${isDarkMode ? 'bg-slate-800' : 'bg-white'}`)}>
        <View style={tw('flex-row justify-between items-start')}>
          <View style={tw('flex-1')}>
            <Text style={tw(`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'}`)}>
              {item.crop?.name || 'Unknown Crop'}
            </Text>
            <Text style={tw(`text-sm mt-1 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`)}>
              Price: {formatCurrency(item.startingPrice)}
            </Text>
            <Text style={tw(`text-xs mt-1 ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`)}>
              {item.crop?.quantity} {item.crop?.quantityUnit}
            </Text>
          </View>
          <View style={{ backgroundColor: statusColor + '20', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 }}>
            <Text style={{ color: statusColor, fontSize: 12, fontWeight: '600' }}>{item.status}</Text>
          </View>
        </View>
        {item.status === 'active' && (
          <TouchableOpacity style={tw('mt-3 bg-red-500 py-2 rounded-xl items-center')}
            onPress={() => handleClose(item._id)}>
            <Text style={tw('text-white font-medium text-sm')}>Remove Listing</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={tw(`flex-1 justify-center items-center ${isDarkMode ? 'bg-slate-900' : 'bg-white'}'`)}>
        <ActivityIndicator size="large" color="#16a34a" />
      </View>
    );
  }

  return (
    <View style={tw(`flex-1 ${isDarkMode ? 'bg-slate-900' : 'bg-white'}`)}>
      <View style={tw(`p-6 pt-12 ${isDarkMode ? 'bg-slate-800' : 'bg-green-800'}`)}>
        <TouchableOpacity style={tw('self-start px-4 py-2 rounded-full bg-green-600')}
          onPress={() => navigation.goBack()}>
          <Text style={tw('text-white font-medium')}>← Back</Text>
        </TouchableOpacity>
        <Text style={tw('text-white text-2xl font-bold mt-4')}>My Listings</Text>
        <Text style={tw('text-green-100 text-sm mt-1')}>{auctions.length} listings</Text>
      </View>

      <FlatList data={auctions} renderItem={renderAuction} keyExtractor={(item) => item._id}
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={
          <View style={tw('items-center pt-16')}>
            <Text style={tw(`text-lg mb-4 ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`)}>No listings yet</Text>
            <TouchableOpacity style={tw('bg-green-800 px-6 py-3 rounded-xl')}
              onPress={() => navigation.navigate('CreateAuction')}>
              <Text style={tw('text-white font-semibold')}>Create Listing</Text>
            </TouchableOpacity>
          </View>
        } />

      <TouchableOpacity style={tw('absolute bottom-6 right-6 w-14 h-14 bg-green-800 rounded-full items-center justify-center shadow-lg')}
        onPress={() => navigation.navigate('CreateAuction')}>
        <Text style={tw('text-white text-3xl leading-none')}>+</Text>
      </TouchableOpacity>
    </View>
  );
};

export default MyAuctions;
