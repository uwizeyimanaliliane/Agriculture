import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator, FlatList, Image, Modal, Dimensions } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const CropImage = ({ uri, onPress }) => {
  const [failed, setFailed] = useState(false);
  if (!uri || failed) return <Text style={tw('text-3xl mr-3')}>🌾</Text>;
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
      <Image source={{ uri: getImageUrl(uri) }} style={tw('w-24 h-24 rounded-xl mr-3')} onError={() => setFailed(true)} />
    </TouchableOpacity>
  );
};
import { tw } from '../../utils/tw';
import { useTheme } from '../../context/ThemeContext';
import { useI18n } from '../../i18n';
import { cropAPI } from '../../services/api';
import { formatCurrency, cropCategories, getImageUrl } from '../../utils/formatters';
import BackButton from '../../components/BackButton';

const BrowseCrops = ({ navigation }) => {
  const [crops, setCrops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [previewImage, setPreviewImage] = useState(null);
  const { isDarkMode } = useTheme();
  const { t } = useI18n();

  useEffect(() => {
    fetchCrops();
  }, [selectedCategory, selectedDistrict]);

  const fetchCrops = async () => {
    setLoading(true);
    try {
      const params = {};
      if (selectedCategory) params.category = selectedCategory;
      if (selectedDistrict) params.district = selectedDistrict;
      const response = await cropAPI.getAvailable(params);
      setCrops(response.data.crops);
    } catch (error) {
      Alert.alert(t('auth.error'), t('buyer.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  const filteredCrops = crops.filter(c =>
    c.name?.toLowerCase().includes(search.toLowerCase())
  );

  const renderCrop = ({ item }) => (
    <TouchableOpacity
      style={tw(`p-4 mb-3 rounded-2xl shadow-sm ${isDarkMode ? 'bg-slate-800' : 'bg-white'}`)}
      onPress={() => navigation.navigate('AuctionDetail', { cropId: item._id })}
    >
      <View style={tw('flex-row')}>
        <CropImage uri={item.photos?.[0]} onPress={() => setPreviewImage(item.photos?.[0])} />
        <View style={tw('flex-1')}>
          <View style={tw('flex-row justify-between items-start')}>
            <Text style={tw(`text-lg font-semibold flex-1 ${isDarkMode ? 'text-white' : 'text-gray-800'}`)}>{item.name}</Text>
            {item.farmer?.verifiedBadge && (
              <View style={tw('bg-green-600 px-2 py-0.5 rounded-full ml-2')}>
                <Text style={tw('text-green-800 text-xs font-semibold')}>{t('buyer.verified')}</Text>
              </View>
            )}
          </View>
          <Text style={tw(`text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`)}>{item.quantity} {item.quantityUnit}</Text>
          {item.price && (
            <Text style={tw('text-green-600 font-semibold mt-1')}>{formatCurrency(item.price + 2500 + (item.transportPrice || 0))}</Text>
          )}
          <Text style={tw(`text-xs mt-1 ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`)}>
            {item.location?.district || t('buyer.unknown')}
          </Text>
          <View style={tw('flex-row mt-2')}>
            {item.price && (item.status === 'approved' || item.status === 'available' || item.status === 'in_auction') && (
              <TouchableOpacity style={tw('bg-green-700 py-1.5 px-4 rounded-lg mr-2')}
                onPress={() => navigation.navigate('Order', { crop: item })}>
                <Text style={tw('text-white text-xs font-medium')}>{t('buyer.order')}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={tw(`flex-1 ${isDarkMode ? 'bg-slate-900' : 'bg-white'}`)}>
      <View style={tw(`p-6 pt-12 ${isDarkMode ? 'bg-slate-800' : 'bg-green-800'}`)}>
        <BackButton onPress={() => navigation.getParent()?.navigate('Dashboard')} style="mb-3" />
        <Text style={tw('text-white text-2xl font-bold')}>{t('buyer.browse')}</Text>
        <TextInput
          style={tw('mt-3 bg-white/20 rounded-xl px-4 py-3 text-white placeholder-slate-300')}
          placeholder={t('buyer.search')}
          placeholderTextColor="#94a3b8"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <View style={tw('py-3 px-4')}>
        <FlatList horizontal showsHorizontalScrollIndicator={false} data={cropCategories}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={tw(`mr-2 px-4 py-2 rounded-full ${selectedCategory === item.value ? 'bg-green-600' : isDarkMode ? 'bg-slate-700' : 'bg-white shadow-sm'}`)}
              onPress={() => setSelectedCategory(selectedCategory === item.value ? '' : item.value)}
            >
              <Text style={tw(`text-sm font-medium ${selectedCategory === item.value ? 'text-white' : isDarkMode ? 'text-slate-300' : 'text-gray-700'}`)}>{t('buyer.categories.' + item.value)}</Text>
            </TouchableOpacity>
          )} keyExtractor={(item) => item.value} />
      </View>

      {loading ? (
        <View style={tw('flex-1 justify-center items-center')}>
          <ActivityIndicator size="large" color="#16a34a" />
        </View>
      ) : (
        <FlatList data={filteredCrops} renderItem={renderCrop} keyExtractor={(item) => item._id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20 }}
          ListEmptyComponent={
            <View style={tw('flex-1 justify-center items-center pt-20')}>
              <Text style={tw(`text-lg ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`)}>{t('buyer.noCrops')}</Text>
            </View>
          } />
      )}

      <Modal visible={!!previewImage} transparent animationType="fade"
        onRequestClose={() => setPreviewImage(null)}>
        <TouchableOpacity style={tw('flex-1 bg-black/90 justify-center items-center')}
          activeOpacity={1} onPress={() => setPreviewImage(null)}>
          {previewImage && (
            <Image source={{ uri: getImageUrl(previewImage) }}
              style={{ width: SCREEN_WIDTH - 40, height: SCREEN_WIDTH - 40 }}
              resizeMode="contain" onError={() => setPreviewImage(null)} />
          )}
          <TouchableOpacity style={tw('absolute top-12 right-6 w-10 h-10 bg-white/20 rounded-full items-center justify-center')}
            onPress={() => setPreviewImage(null)}>
            <Text style={tw('text-white text-xl')}>✕</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

export default BrowseCrops;


