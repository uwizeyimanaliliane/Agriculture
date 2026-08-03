import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, FlatList, TextInput, Image } from 'react-native';
import { tw } from '../../utils/tw';
import { useTheme } from '../../context/ThemeContext';
import { adminAPI } from '../../services/api';
import { formatCurrency, cropCategories, getImageUrl } from '../../utils/formatters';

const CropImage = ({ uri }) => {
  const [failed, setFailed] = useState(false);
  if (!uri || failed) return <Text style={tw('text-3xl')}>🌾</Text>;
  return <Image source={{ uri: getImageUrl(uri) }} style={tw('w-14 h-14 rounded-xl')} onError={() => setFailed(true)} />;
};

const AdminCrops = () => {
  const [crops, setCrops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');
  const { isDarkMode } = useTheme();

  useEffect(() => { fetchCrops(); }, [category, status]);

  const fetchCrops = async () => {
    setLoading(true);
    try {
      const params = {};
      if (category) params.category = category;
      if (status) params.status = status;
      if (search) params.search = search;
      const res = await adminAPI.getCrops(params);
      setCrops(res.data.crops);
    } catch (err) {
      console.error('Failed to load crops');
    } finally {
      setLoading(false);
    }
  };

  const statusColor = (s) => {
    switch (s) {
      case 'available': return 'text-green-600 bg-green-100';
      case 'sold': return 'text-red-600 bg-red-100';
      case 'reserved': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const renderCrop = ({ item }) => (
    <View style={tw(`p-4 mb-2 rounded-2xl shadow-sm ${isDarkMode ? 'bg-slate-800' : 'bg-white'}`)}>
      <View style={tw('flex-row items-center')}>
        <CropImage uri={item.photos?.[0]} />
        <View style={tw('flex-1 ml-3')}>
          <View style={tw('flex-row justify-between items-start')}>
            <Text style={tw(`font-semibold flex-1 ${isDarkMode ? 'text-white' : 'text-gray-800'}`)}>{item.name}</Text>
            <View style={tw(`px-2 py-0.5 rounded-full ${statusColor(item.status)}`)}>
              <Text style={tw('text-xs font-medium')}>{item.status}</Text>
            </View>
          </View>
          <Text style={tw(`text-xs mt-1 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`)}>
            {item.quantity} {item.quantityUnit} - {formatCurrency(item.price)}/{item.quantityUnit}
          </Text>
          {item.user && (
            <Text style={tw(`text-xs mt-0.5 ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`)}>
              Farmer: {item.user.name} ({item.user.email})
            </Text>
          )}
          <Text style={tw(`text-xs ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`)}>
            {item.location?.district || 'Unknown'} {item.isPreHarvest ? '(Pre-Harvest)' : ''}
          </Text>
        </View>
      </View>
    </View>
  );

  return (
    <View style={tw(`flex-1 ${isDarkMode ? 'bg-slate-900' : 'bg-white'}`)}>
      <View style={tw(`p-5 pt-12 ${isDarkMode ? 'bg-slate-800' : 'bg-green-800'}`)}>
        <Text style={tw('text-white text-xl font-bold')}>All Crops</Text>
      </View>

      <View style={tw('px-4 pt-3 flex-row gap-2')}>
        <TextInput style={tw(`flex-1 border rounded-xl px-4 py-2 ${isDarkMode ? 'border-slate-600 bg-slate-700 text-white' : 'border-gray-300 bg-white text-gray-800'}`)}
          placeholder="Search crops..." placeholderTextColor={isDarkMode ? '#94a3b8' : '#9ca3af'}
          value={search} onChangeText={setSearch} onSubmitEditing={fetchCrops} />
        <TouchableOpacity style={tw('bg-green-800 px-4 py-2 rounded-xl items-center justify-center')}
          onPress={fetchCrops}>
          <Text style={tw('text-white text-sm')}>Search</Text>
        </TouchableOpacity>
      </View>

      <View style={tw('px-4 py-3')}>
        <FlatList horizontal showsHorizontalScrollIndicator={false} data={[{ value: '', label: 'All' }, { value: 'available', label: 'Available' }, { value: 'sold', label: 'Sold' }]}
          renderItem={({ item }) => (
            <TouchableOpacity key={item.value}
              style={tw(`mr-2 px-4 py-1.5 rounded-full ${status === item.value ? 'bg-green-800' : isDarkMode ? 'bg-slate-700' : 'bg-green-100'}`)}
              onPress={() => setStatus(status === item.value ? '' : item.value)}>
              <Text style={tw(`text-xs ${status === item.value ? 'text-white' : isDarkMode ? 'text-slate-300' : 'text-green-800'}`)}>{item.label}</Text>
            </TouchableOpacity>
          )} keyExtractor={(item) => item.value} />
      </View>

      {loading ? (
        <View style={tw('flex-1 justify-center items-center')}>
          <ActivityIndicator size="large" color="#16a34a" />
        </View>
      ) : (
        <FlatList data={crops} renderItem={renderCrop} keyExtractor={(item) => item._id}
          contentContainerStyle={{ padding: 16 }}
          ListEmptyComponent={
            <Text style={tw(`text-center mt-12 ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`)}>No crops found</Text>
          } />
      )}
    </View>
  );
};

export default AdminCrops;