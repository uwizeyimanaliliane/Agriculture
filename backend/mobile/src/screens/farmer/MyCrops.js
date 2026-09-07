import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, Alert, ActivityIndicator, FlatList, Image, RefreshControl, Modal } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { tw } from '../../utils/tw';
import { useTheme } from '../../context/ThemeContext';
import { useI18n } from '../../i18n';
import { cropAPI } from '../../services/api';
import { formatCurrency, getImageUrl } from '../../utils/formatters';
import { confirmAlert } from '../../utils/platform';

const CropImage = ({ uri, onPress }) => {
  const [failed, setFailed] = useState(false);
  if (!uri || failed) return (
    <View style={tw('w-16 h-16 rounded-xl mr-3 bg-gray-200 items-center justify-center')}>
      <Text style={tw('text-xl')}>🌾</Text>
    </View>
  );
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
      <Image source={{ uri: getImageUrl(uri) }} style={tw('w-16 h-16 rounded-xl mr-3')} onError={() => setFailed(true)} />
    </TouchableOpacity>
  );
};

const MyCrops = ({ navigation }) => {
  const [crops, setCrops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const { isDarkMode } = useTheme();
  const { t } = useI18n();

  const fetchCrops = useCallback(async () => {
    try {
      const response = await cropAPI.getMine();
      setCrops(response.data.crops || []);
    } catch (error) {
      Alert.alert(t('auth.error'), 'Failed to load crops');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    fetchCrops();
  }, [fetchCrops]));

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchCrops();
  };

  const handleDelete = (id, name) => {
    confirmAlert('Delete Crop', `Delete "${name}"? This cannot be undone.`, async () => {
      try {
        await cropAPI.delete(id);
        setCrops(prev => prev.filter(c => c._id !== id));
      } catch (error) {
        Alert.alert(t('auth.error'), 'Failed to delete crop');
      }
    }, null, t('farmer.delete'), t('common.cancel'));
  };

  const handleEdit = (crop) => {
    navigation.navigate('AddCrop', { crop });
  };

  const statusBg = (status) => {
    switch (status) {
      case 'approved': return 'bg-green-100';
      case 'pending_admin': return 'bg-amber-100';
      case 'available': return 'bg-green-100';
      case 'in_auction': case 'sold': return 'bg-blue-100';
      case 'harvested': return 'bg-amber-100';
      case 'rejected': return 'bg-red-100';
      default: return isDarkMode ? 'bg-slate-700' : 'bg-gray-100';
    }
  };

  const statusText = (status) => {
    switch (status) {
      case 'approved': return 'text-green-800';
      case 'pending_admin': return 'text-amber-800';
      case 'available': return 'text-green-800';
      case 'in_auction': return 'text-blue-700';
      case 'sold': return 'text-blue-800';
      case 'harvested': return 'text-amber-800';
      case 'rejected': return 'text-red-800';
      default: return isDarkMode ? 'text-slate-300' : 'text-gray-600';
    }
  };

  const renderCrop = ({ item }) => {
    const photoUrl = item.photos?.[0];
    return (
      <>
      <View style={tw(`p-4 mb-3 rounded-2xl shadow-sm ${isDarkMode ? 'bg-slate-800' : 'bg-white'}`)}>
            <View style={tw('flex-row')}>
              <CropImage uri={photoUrl} onPress={() => setPreviewImage(photoUrl)} />
          <View style={tw('flex-1')}>
            <View style={tw('flex-row items-center justify-between')}>
              <Text style={tw(`text-lg font-semibold flex-1 ${isDarkMode ? 'text-white' : 'text-gray-800'}`)}>
                {item.name}
              </Text>
              <View style={tw(`px-2 py-0.5 rounded-full ${statusBg(item.status)}`)}>
                <Text style={tw(`text-xs font-medium ${statusText(item.status)}`)}>
                  {item.status.replace('_', ' ')}
                </Text>
              </View>
            </View>
            <Text style={tw(`text-sm mt-1 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`)}>
              {item.quantity} {item.quantityUnit}
              {item.price ? ` - ${formatCurrency(item.price)}` : ''}
            </Text>
            <Text style={tw(`text-xs ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`)}>
              {item.category}
            </Text>
            {item.isPreHarvest && (
              <View style={tw('bg-orange-100 self-start px-2 py-0.5 rounded-full mt-1')}>
                <Text style={tw('text-orange-700 text-xs')}>{t('farmer.preHarvest')}</Text>
              </View>
            )}
            {item.status === 'rejected' && item.rejectReason ? (
              <Text style={tw(`text-xs mt-2 ${isDarkMode ? 'text-red-300' : 'text-red-600'}`)}>
                Rejection reason: {item.rejectReason}
              </Text>
            ) : null}
          </View>
        </View>
        <View style={tw('flex-row justify-end mt-3 pt-3 border-t border-gray-100')}>
          <TouchableOpacity style={tw('px-3 py-2 rounded-lg bg-blue-500 mr-2')} onPress={() => handleEdit(item)}>
            <Text style={tw('text-white text-sm font-medium')}>{t('farmer.edit')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={tw('px-3 py-2 rounded-lg bg-red-500')} onPress={() => handleDelete(item._id, item.name)}>
            <Text style={tw('text-white text-sm font-medium')}>{t('farmer.delete')}</Text>
          </TouchableOpacity>
        </View>
      </View>
      <Modal visible={!!previewImage} transparent animationType="fade" onRequestClose={() => setPreviewImage(null)}>
        <TouchableOpacity style={tw('flex-1 bg-black/90 justify-center items-center')} activeOpacity={1} onPress={() => setPreviewImage(null)}>
          {previewImage && (
            <Image source={{ uri: getImageUrl(previewImage) }} style={{ width: 320, height: 320 }} resizeMode="contain" />
          )}
        </TouchableOpacity>
      </Modal>
    </>
    );
  };

  if (loading) {
    return (
      <View style={tw(`flex-1 justify-center items-center ${isDarkMode ? 'bg-slate-900' : 'bg-white'}`)}>
        <ActivityIndicator size="large" color="#16a34a" />
      </View>
    );
  }

  return (
    <View style={tw(`flex-1 ${isDarkMode ? 'bg-slate-900' : 'bg-white'}`)}>
      <View style={tw(`p-5 pt-12 ${isDarkMode ? 'bg-slate-800' : 'bg-green-800'}`)}>
        <Text style={tw('text-white text-xl font-bold')}>{t('farmer.myCrops')}</Text>
        <Text style={tw('text-green-100 text-sm mt-1')}>{crops.length} {t('farmer.cropsListed')}</Text>
      </View>

      <FlatList
        data={crops}
        renderItem={renderCrop}
        keyExtractor={(item) => item._id}
        contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#16a34a']} />
        }
        ListEmptyComponent={
          <View style={tw('items-center pt-16')}>
            <Text style={tw(`text-lg mb-4 ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`)}>
              {t('farmer.noCrops')}
            </Text>
            <TouchableOpacity style={tw('bg-green-800 px-6 py-3 rounded-xl')}
              onPress={() => navigation.navigate('AddCrop')}>
              <Text style={tw('text-white font-semibold')}>{t('farmer.addFirstCrop')}</Text>
            </TouchableOpacity>
          </View>
        }
      />

      <TouchableOpacity style={tw('absolute bottom-6 right-6 w-14 h-14 bg-green-800 rounded-full items-center justify-center shadow-lg')}
        onPress={() => navigation.navigate('AddCrop')}>
        <Text style={tw('text-white text-3xl leading-none')}>+</Text>
      </TouchableOpacity>
    </View>
  );
};

export default MyCrops;
