import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator, ScrollView, Image, Modal, Dimensions, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { tw } from '../../utils/tw';
import { useTheme } from '../../context/ThemeContext';
import { useI18n } from '../../i18n';
import { useAuth } from '../../context/AuthContext';
import { cropAPI } from '../../services/api';
import { cropCategories, quantityUnits, getImageUrl } from '../../utils/formatters';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const AddCrop = ({ navigation, route }) => {
  const existingCrop = route.params?.crop;
  const isEditing = !!existingCrop;

  const [name, setName] = useState(existingCrop?.name || '');
  const [category, setCategory] = useState(existingCrop?.category || '');
  const [description, setDescription] = useState(existingCrop?.description || '');
  const [quantity, setQuantity] = useState(existingCrop?.quantity?.toString() || '');
  const [quantityUnit, setQuantityUnit] = useState(existingCrop?.quantityUnit || '');
  const [price, setPrice] = useState(existingCrop?.price?.toString() || '');
  const [harvestStatus, setHarvestStatus] = useState(
    existingCrop?.isPreHarvest ? 'pre_harvest' : 'harvested'
  );
  const [estimatedHarvestDate, setEstimatedHarvestDate] = useState(
    existingCrop?.estimatedHarvestDate ? existingCrop.estimatedHarvestDate.split('T')[0] : ''
  );
  const [photos, setPhotos] = useState([]);
  const [existingPhotos, setExistingPhotos] = useState(existingCrop?.photos || []);
  const [loading, setLoading] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const [failedImages, setFailedImages] = useState(new Set());

  const markFailed = (url) => setFailedImages(prev => new Set([...prev, url]));

  const { isDarkMode } = useTheme();
  const { t } = useI18n();
  const { user } = useAuth();

  useEffect(() => {
    (async () => {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Camera roll permission is required to add photos');
      }
    })();
  }, []);

  const pickImage = async (replaceIndex) => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: replaceIndex === undefined,
        quality: 0.7,
      });
      if (!result.canceled) {
        if (replaceIndex !== undefined) {
          setPhotos(prev => prev.map((p, i) => i === replaceIndex ? result.assets[0] : p));
        } else {
          setPhotos(prev => [...prev, ...result.assets]);
          setPreviewImage(result.assets[0].uri);
        }
      }
    } catch (error) {
      Alert.alert('Gallery Error', 'Could not open gallery. Please try again.');
    }
  };

  const takePhoto = async (replaceIndex) => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Camera permission is required to take photos');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 0.7,
      });
      if (!result.canceled) {
        if (replaceIndex !== undefined) {
          setPhotos(prev => prev.map((p, i) => i === replaceIndex ? result.assets[0] : p));
        } else {
          setPhotos(prev => [...prev, ...result.assets]);
          setPreviewImage(result.assets[0].uri);
        }
      }
    } catch (error) {
      Alert.alert('Camera Error', 'Could not open camera. Please try again or use gallery.');
    }
  };

  const tapPhoto = (photo, index) => {
    if (Platform.OS === 'web') {
      setPreviewImage(photo.uri);
    } else {
      Alert.alert('Photo Options', '', [
        { text: 'Preview', onPress: () => setPreviewImage(photo.uri) },
        { text: 'Replace', onPress: () => {
          Alert.alert('Replace Photo', 'Choose source', [
            { text: 'Gallery', onPress: () => pickImage(index) },
            { text: 'Camera', onPress: () => takePhoto(index) },
            { text: 'Cancel', style: 'cancel' },
          ]);
        }},
        { text: 'Remove', style: 'destructive', onPress: () => removePhoto(index) },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  };

  const tapExistingPhoto = (url, index) => {
    if (Platform.OS === 'web') {
      setPreviewImage(url);
    } else {
      Alert.alert('Photo Options', '', [
        { text: 'Preview', onPress: () => setPreviewImage(url) },
        { text: 'Replace', onPress: () => {
          Alert.alert('Replace Photo', 'Choose source', [
            { text: 'Gallery', onPress: async () => {
              await pickImage();
              removeExistingPhoto(index);
            }},
            { text: 'Camera', onPress: async () => {
              await takePhoto();
              removeExistingPhoto(index);
            }},
            { text: 'Cancel', style: 'cancel' },
          ]);
        }},
        { text: 'Remove', style: 'destructive', onPress: () => removeExistingPhoto(index) },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  };

  const removePhoto = (index) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const removeExistingPhoto = (index) => {
    setExistingPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const buildFormData = async () => {
    const fd = new FormData();
    fd.append('name', name);
    fd.append('category', category);
    fd.append('description', description);
    fd.append('quantity', parseFloat(quantity));
    fd.append('quantityUnit', quantityUnit);
    if (price) fd.append('price', parseFloat(price));
    fd.append('isPreHarvest', harvestStatus === 'pre_harvest');
    if (harvestStatus === 'pre_harvest' && estimatedHarvestDate) {
      fd.append('estimatedHarvestDate', estimatedHarvestDate);
    }
    fd.append('status', harvestStatus === 'harvested' ? 'available' : 'available');

    for (let i = 0; i < photos.length; i += 1) {
      const photo = photos[i];
      const uri = photo.uri;
      const filename = photo.fileName || photo.uri.split('/').pop() || `photo_${i}.jpg`;
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : photo.type || 'image/jpeg';

      if (Platform.OS === 'web') {
        try {
          const response = await fetch(uri);
          const blob = await response.blob();
          const file = new File([blob], filename, { type });
          fd.append('photos', file);
        } catch (err) {
          fd.append('photos', { uri, type, name: filename });
        }
      } else {
        fd.append('photos', { uri, type, name: filename });
      }
    }

    return fd;
  };

  const handleSubmit = async () => {
    if (user?.role !== 'farmer') {
      Alert.alert(t('auth.error'), 'Only farmers can add crops. Please log in with a farmer account.');
      return;
    }
    if (!name || !category || !quantity || !quantityUnit) {
      Alert.alert(t('auth.error'), t('auth.fillRequired'));
      return;
    }
    setLoading(true);
    try {
      const formData = await buildFormData();
      if (isEditing) {
        await cropAPI.update(existingCrop._id, formData);
      } else {
        await cropAPI.create(formData);
      }
      Alert.alert(t('auth.success'), isEditing ? 'Crop updated successfully' : 'Crop added successfully');
      navigation.goBack();
    } catch (error) {
      const status = error.response?.status;
      const msg = error.response?.data?.message || 'Operation failed';
      if (status === 403) {
        Alert.alert('Access Denied', 'Your account does not have farmer permissions. Please log in with a farmer account or contact support.');
      } else {
        Alert.alert(t('auth.error'), msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={tw(`flex-1 ${isDarkMode ? 'bg-slate-900' : 'bg-white'}`)}
      showsVerticalScrollIndicator={false}>
      <View style={tw(`pt-12 pb-6 px-6 ${isDarkMode ? 'bg-slate-800' : 'bg-green-800'}`)}>
        <TouchableOpacity style={tw(`flex-row items-center self-start px-4 py-2.5 rounded-full ${isDarkMode ? 'bg-slate-700 active:bg-slate-600' : 'bg-green-600 active:bg-green-500'}`)}
          onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Text style={tw('text-white text-lg mr-2')}>←</Text>
          <Text style={tw('text-white text-base font-medium')}>Back</Text>
        </TouchableOpacity>
        <Text style={tw('text-white text-2xl font-bold mt-4')}>
          {isEditing ? 'Edit Crop' : t('farmer.addNewCrop')}
        </Text>
      </View>
      <View style={tw('p-5')}>

      <View style={tw(`p-5 rounded-2xl shadow-sm mb-5 ${isDarkMode ? 'bg-slate-800' : 'bg-white'}`)}>
        <Text style={tw(`text-sm font-medium mb-2 ${isDarkMode ? 'text-slate-300' : 'text-gray-600'}`)}>Photos</Text>
        <Text style={tw(`text-xs mb-3 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`)}>
          Tap an image to preview, replace, or remove it before saving.
        </Text>
        <View style={tw('flex-row flex-wrap gap-2 mb-3')}>
          {existingPhotos.map((url, i) => (
            !failedImages.has(url) && <View key={`exist-${i}`} style={tw('relative')}>
              <TouchableOpacity onPress={() => tapExistingPhoto(url, i)}>
                <Image source={{ uri: getImageUrl(url) }} style={tw('w-20 h-20 rounded-xl')} onError={() => markFailed(url)} />
              </TouchableOpacity>
              <TouchableOpacity
                style={tw('absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full items-center justify-center')}
                onPress={() => removeExistingPhoto(i)}>
                <Text style={tw('text-white text-xs font-bold')}>X</Text>
              </TouchableOpacity>
            </View>
          ))}
          {photos.map((photo, i) => (
            !failedImages.has(photo.uri) && <View key={`new-${i}`} style={tw('relative')}>
              <TouchableOpacity onPress={() => tapPhoto(photo, i)}>
                <Image source={{ uri: photo.uri }} style={tw('w-20 h-20 rounded-xl')} onError={() => setFailedImages(prev => new Set([...prev, photo.uri]))} />
              </TouchableOpacity>
              <TouchableOpacity
                style={tw('absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full items-center justify-center')}
                onPress={() => removePhoto(i)}>
                <Text style={tw('text-white text-xs font-bold')}>X</Text>
              </TouchableOpacity>
            </View>
          ))}
          <TouchableOpacity style={tw(`w-20 h-20 rounded-xl border-2 border-dashed items-center justify-center ${isDarkMode ? 'border-slate-600' : 'border-green-300'}`)}
            onPress={() => pickImage()}>
            <Text style={tw(`text-2xl ${isDarkMode ? 'text-slate-400' : 'text-green-400'}`)}>+</Text>
            <Text style={tw(`text-xs ${isDarkMode ? 'text-slate-500' : 'text-green-500'}`)}>Gallery</Text>
          </TouchableOpacity>
          <TouchableOpacity style={tw(`w-20 h-20 rounded-xl border-2 border-dashed items-center justify-center ${isDarkMode ? 'border-slate-600' : 'border-green-300'}`)}
            onPress={() => takePhoto()}>
            <Text style={tw(`text-2xl ${isDarkMode ? 'text-slate-400' : 'text-green-400'}`)}>📷</Text>
            <Text style={tw(`text-xs ${isDarkMode ? 'text-slate-500' : 'text-green-500'}`)}>Camera</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={tw(`p-5 rounded-2xl shadow-sm mb-5 ${isDarkMode ? 'bg-slate-800' : 'bg-white'}`)}>
        <TextInput style={tw(`border rounded-xl px-4 py-3 mb-4 ${isDarkMode ? 'border-slate-600 bg-slate-700 text-white' : 'border-green-200 bg-green-50 text-gray-800'}`)}
          placeholder={t('farmer.cropName') + ' *'}
          placeholderTextColor={isDarkMode ? '#94a3b8' : '#9ca3af'}
          value={name} onChangeText={setName} />

        <Text style={tw(`mb-2 font-medium ${isDarkMode ? 'text-slate-300' : 'text-gray-600'}`)}>{t('farmer.category')} *</Text>
        <View style={tw('flex-row flex-wrap gap-2 mb-4')}>
          {cropCategories.map((cat) => (
            <TouchableOpacity key={cat.value}
              style={tw(`px-4 py-2 rounded-lg ${category === cat.value ? 'bg-green-800' : isDarkMode ? 'bg-slate-700' : 'bg-green-100'}`)}
              onPress={() => setCategory(cat.value)}>
              <Text style={tw(`${category === cat.value ? 'text-white' : isDarkMode ? 'text-slate-300' : 'text-green-800'}`)}>
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TextInput style={tw(`border rounded-xl px-4 py-3 mb-4 ${isDarkMode ? 'border-slate-600 bg-slate-700 text-white' : 'border-green-200 bg-green-50 text-gray-800'}`)}
          placeholder={t('farmer.description')}
          placeholderTextColor={isDarkMode ? '#94a3b8' : '#9ca3af'}
          value={description} onChangeText={setDescription} multiline numberOfLines={3}
          textAlignVertical="top" />
      </View>

      <View style={tw(`p-5 rounded-2xl shadow-sm mb-5 ${isDarkMode ? 'bg-slate-800' : 'bg-white'}`)}>
        <View style={tw('flex-row gap-3 mb-4')}>
          <View style={tw('flex-1')}>
            <TextInput style={tw(`border rounded-xl px-4 py-3 ${isDarkMode ? 'border-slate-600 bg-slate-700 text-white' : 'border-green-200 bg-green-50 text-gray-800'}`)}
              placeholder={t('farmer.quantity') + ' *'}
              placeholderTextColor={isDarkMode ? '#94a3b8' : '#9ca3af'}
              value={quantity} onChangeText={setQuantity} keyboardType="numeric" />
          </View>
        </View>
        <Text style={tw(`mb-2 font-medium ${isDarkMode ? 'text-slate-300' : 'text-gray-600'}`)}>{t('farmer.unit')} *</Text>
        <View style={tw('flex-row flex-wrap gap-2 mb-4')}>
          {quantityUnits.map((unit) => (
            <TouchableOpacity key={unit.value}
              style={tw(`px-3 py-2 rounded-lg ${quantityUnit === unit.value ? 'bg-green-800' : isDarkMode ? 'bg-slate-700' : 'bg-green-100'}`)}
              onPress={() => setQuantityUnit(unit.value)}>
              <Text style={tw(`text-sm ${quantityUnit === unit.value ? 'text-white' : isDarkMode ? 'text-slate-300' : 'text-green-800'}`)}>
                {unit.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TextInput style={tw(`border rounded-xl px-4 py-3 ${isDarkMode ? 'border-slate-600 bg-slate-700 text-white' : 'border-green-200 bg-green-50 text-gray-800'}`)}
          placeholder={t('farmer.price') + ' (RWF)'}
          placeholderTextColor={isDarkMode ? '#94a3b8' : '#9ca3af'}
          value={price} onChangeText={setPrice} keyboardType="numeric" />
      </View>

      <View style={tw(`p-5 rounded-2xl shadow-sm mb-5 ${isDarkMode ? 'bg-slate-800' : 'bg-white'}`)}>
        <Text style={tw(`font-medium mb-3 ${isDarkMode ? 'text-slate-300' : 'text-gray-600'}`)}>Harvest Status</Text>
        <View style={tw('flex-row gap-3 mb-4')}>
          <TouchableOpacity style={tw(`flex-1 py-3 rounded-xl items-center ${harvestStatus === 'harvested' ? 'bg-green-800' : isDarkMode ? 'bg-slate-700' : 'bg-green-100'}`)}
            onPress={() => setHarvestStatus('harvested')}>
            <Text style={tw(`font-medium ${harvestStatus === 'harvested' ? 'text-white' : isDarkMode ? 'text-slate-300' : 'text-green-800'}`)}>
              Already Harvested
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={tw(`flex-1 py-3 rounded-xl items-center ${harvestStatus === 'pre_harvest' ? 'bg-orange-500' : isDarkMode ? 'bg-slate-700' : 'bg-orange-100'}`)}
            onPress={() => setHarvestStatus('pre_harvest')}>
            <Text style={tw(`font-medium ${harvestStatus === 'pre_harvest' ? 'text-white' : isDarkMode ? 'text-slate-300' : 'text-orange-700'}`)}>
              {t('farmer.preHarvest')}
            </Text>
          </TouchableOpacity>
        </View>

        {harvestStatus === 'pre_harvest' && (
          <TextInput style={tw(`border rounded-xl px-4 py-3 ${isDarkMode ? 'border-slate-600 bg-slate-700 text-white' : 'border-green-200 bg-green-50 text-gray-800'}`)}
            placeholder={t('farmer.estimatedHarvest') + ' (YYYY-MM-DD)'}
            placeholderTextColor={isDarkMode ? '#94a3b8' : '#9ca3af'}
            value={estimatedHarvestDate} onChangeText={setEstimatedHarvestDate} />
        )}
      </View>

      <TouchableOpacity style={tw(`py-4 rounded-xl items-center mb-10 ${loading ? 'bg-green-700' : 'bg-green-800'}`)}
        onPress={handleSubmit} disabled={loading}>
        {loading ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={tw('text-white font-semibold text-base')}>
            {isEditing ? 'Update Crop' : t('farmer.submit')}
          </Text>
        )}
      </TouchableOpacity>
      </View>

      <Modal visible={!!previewImage} transparent animationType="fade"
        onRequestClose={() => setPreviewImage(null)}>
        <TouchableOpacity style={tw('flex-1 bg-black/90 justify-center items-center')}
          activeOpacity={1} onPress={() => setPreviewImage(null)}>
          {previewImage && (
            <Image source={{ uri: getImageUrl(previewImage) }}
              style={{ width: SCREEN_WIDTH - 40, height: SCREEN_WIDTH - 40 }}
              resizeMode="contain" onError={() => { setPreviewImage(null); }} />
          )}
          <TouchableOpacity style={tw('absolute top-12 right-6 w-10 h-10 bg-white/20 rounded-full items-center justify-center')}
            onPress={() => setPreviewImage(null)}>
            <Text style={tw('text-white text-xl')}>✕</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </ScrollView>
  );
};

export default AddCrop;
