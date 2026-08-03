import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, FlatList } from 'react-native';
import { tw } from '../../utils/tw';
import { useTheme } from '../../context/ThemeContext';
import { orderAPI } from '../../services/api';

const Transporters = () => {
  const { isDarkMode } = useTheme();
  const [address, setAddress] = useState('');
  const [transporters, setTransporters] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchTransporters();
  }, []);

  const fetchTransporters = async (searchAddress) => {
    setLoading(true);
    setError(null);

    try {
      const params = {};
      if (searchAddress) params.address = searchAddress;
      const res = await orderAPI.getTransporters(params);
      setTransporters(res.data.transporters || []);
    } catch (err) {
      setError('Unable to load transporters right now.');
      setTransporters([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    fetchTransporters(address.trim());
  };

  const renderItem = ({ item }) => (
    <View style={tw(`p-4 mb-3 rounded-2xl ${isDarkMode ? 'bg-slate-800 border border-slate-700' : 'bg-white border border-gray-200'}`)}>
      <View style={tw('flex-row justify-between items-start')}> 
        <Text style={tw(`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`)}>{item.name}</Text>
        <Text style={tw(`text-xs font-semibold ${isDarkMode ? 'text-green-300' : 'text-green-700'}`)}>
          {item.distance !== null && item.distance !== undefined ? `${item.distance} km` : 'Distance N/A'}
        </Text>
      </View>
      <Text style={tw(`text-sm mt-2 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`)}>{item.address}</Text>
      <Text style={tw(`text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`)}>Phone: {item.phone || 'N/A'}</Text>
      <Text style={tw(`text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`)}>Email: {item.email || 'N/A'}</Text>
      {item.isVerified && (
        <Text style={tw(`text-xs mt-2 font-semibold ${isDarkMode ? 'text-green-300' : 'text-green-700'}`)}>
          Verified transporter
        </Text>
      )}
    </View>
  );

  return (
    <View style={tw(`flex-1 ${isDarkMode ? 'bg-slate-900' : 'bg-white'}`)}>
      <View style={tw(`p-6 pt-12 ${isDarkMode ? 'bg-slate-800' : 'bg-green-800'}`)}>
        <Text style={tw('text-white text-2xl font-bold')}>Available Transporters</Text>
        <Text style={tw('text-green-200 text-sm mt-1')}>Search transporters by address or name</Text>
      </View>

      <View style={tw('p-4')}>
        <TextInput
          style={tw(`border rounded-2xl px-4 py-3 mb-4 ${isDarkMode ? 'border-slate-600 text-white bg-slate-800' : 'border-gray-300 text-gray-800 bg-white'}`)}
          placeholder="Search by address or transporter name"
          placeholderTextColor={isDarkMode ? '#94a3b8' : '#9ca3af'}
          value={address}
          onChangeText={setAddress}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
        />
        <TouchableOpacity style={tw(`py-4 rounded-xl items-center ${isDarkMode ? 'bg-green-700' : 'bg-green-800'}`)} onPress={handleSearch}>
          <Text style={tw('text-white font-semibold')}>Search</Text>
        </TouchableOpacity>
      </View>

      <View style={tw('flex-1 px-4 pb-6')}>
        {loading ? (
          <View style={tw('flex-1 justify-center items-center')}>
            <ActivityIndicator size="large" color="#16a34a" />
          </View>
        ) : error ? (
          <View style={tw('flex-1 justify-center items-center')}>
            <Text style={tw(`text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`)}>{error}</Text>
          </View>
        ) : (
          <FlatList
            data={transporters}
            keyExtractor={(item) => item._id}
            renderItem={renderItem}
            ListEmptyComponent={(
              <View style={tw('flex-1 justify-center items-center pt-20')}>
                <Text style={tw(`text-lg ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`)}>No transporters found</Text>
                <Text style={tw(`text-sm mt-2 ${isDarkMode ? 'text-slate-500' : 'text-gray-500'}`)}>
                  Try another address or check back later.
                </Text>
              </View>
            )}
            contentContainerStyle={{ paddingBottom: 22 }}
          />
        )}
      </View>
    </View>
  );
};

export default Transporters;
