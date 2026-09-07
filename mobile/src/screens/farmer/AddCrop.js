import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator, ScrollView, Image, Modal, Dimensions, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { File as ExpoFile } from 'expo-file-system';
import { useFocusEffect } from '@react-navigation/native';
import { tw } from '../../utils/tw';
import { useTheme } from '../../context/ThemeContext';
import { useI18n } from '../../i18n';
import { useAuth } from '../../context/AuthContext';
import { farmerAPI, cropAPI, uploadMultipart } from '../../services/api';
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
  const [verification, setVerification] = useState(null);
  const [verificationLoading, setVerificationLoading] = useState(true);
  const [verificationError, setVerificationError] = useState(null);
  const [inFlightCrop, setInFlightCrop] = useState(null);
  const [inFlightCheckDone, setInFlightCheckDone] = useState(!isEditing);

  const fetchInFlight = useCallback(async () => {
    if (isEditing) return;
    try {
      const response = await cropAPI.getMine();
      const inFlight = (response.data?.crops || []).find(c => c.status === 'pending_admin') || null;
      setInFlightCrop(inFlight);
    } catch (error) {
      setInFlightCrop(null);
    } finally {
      setInFlightCheckDone(true);
    }
  }, [isEditing]);

  const fetchVerificationStatus = useCallback(async () => {
    setVerificationLoading(true);
    setVerificationError(null);
    try {
      const response = await farmerAPI.getVerificationStatus();
      setVerification(response.data.farmer);
    } catch (error) {
      setVerification(null);
      setVerificationError(error.response?.data?.message || 'Unable to load verification status');
    } finally {
      setVerificationLoading(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      const media = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!media.granted) {
        Alert.alert('Permission needed', 'Photo permission is required to add photos');
      }
    })();
  }, []);

  useFocusEffect(useCallback(() => {
    fetchVerificationStatus();
    fetchInFlight();
  }, [fetchVerificationStatus, fetchInFlight]));

  // Per-posting gate: before adding a NEW crop, the farmer must be verified by
  // the admin. Payment of the post fee happens AFTER adding the product (the
  // product is reviewed first, then posted once the admin approves it).
  useEffect(() => {
    if (isEditing) return;
    if (verificationLoading) return;
    if (verificationError) return;
    if (!verification || verification.verificationStatus !== 'verified') {
      Alert.alert(
        'Verification Required',
        'You must complete verification and be approved by an admin before adding a product.'
      );
      navigation.navigate('Verification');
    }
  }, [verificationLoading, verificationError, verification, isEditing, navigation]);

  const pickImage = async (replaceIndex) => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: replaceIndex === undefined,
        quality: 0.7,
      });
      if (!result.canceled && result.assets?.length > 0) {
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

  const tapPhoto = (photo, index) => {
    if (Platform.OS === 'web') {
      setPreviewImage(photo.uri);
    } else {
      Alert.alert('Photo Options', '', [
        { text: 'Preview', onPress: () => setPreviewImage(photo.uri) },
        { text: 'Replace', onPress: () => {
          Alert.alert('Replace Photo', 'Choose source', [
            { text: 'Gallery', onPress: () => pickImage(index) },
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
        const file = new ExpoFile(uri);
        fd.append('photos', file, filename);
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
    if (!isEditing && photos.length === 0 && existingPhotos.length === 0) {
      Alert.alert('Photo Required', 'Please add at least one photo of your crop before submitting.');
      return;
    }
    if (!isEditing) {
      if (verificationLoading) {
        Alert.alert('Please wait', 'Checking your verification status before allowing crop posting.');
        return;
      }
      if (verificationError) {
        Alert.alert('Verification Error', 'Unable to confirm your verification status. Please retry from the verification screen.');
        return;
      }
      if (!verification || verification.verificationStatus !== 'verified') {
        Alert.alert(
          'Verification Required',
          'You must submit verification and be approved by admin before posting a product.'
        );
        return;
      }
      if (inFlightCrop) {
        Alert.alert(
          'Product Under Review',
          `You already have "${inFlightCrop.name}" under review. Wait for the admin to approve or reject it before adding another product.`
        );
        navigation.navigate('CropPayment', { cropId: inFlightCrop._id, cropName: inFlightCrop.name });
        return;
      }
    }
    setLoading(true);
    try {
      const formData = await buildFormData();
      if (isEditing) {
        await uploadMultipart(`/crops/${existingCrop._id}`, formData, 'PUT');
        Alert.alert(t('auth.success'), 'Crop updated successfully');
        navigation.goBack();
      } else {
        const res = await uploadMultipart('/crops', formData);
        Alert.alert(t('auth.success'), 'Product submitted successfully. Next: pay the post fee so the admin can review it.');
        const cropId = res.data?.crop?._id;
        navigation.replace('CropPayment', { cropId, cropName: name });
      }
    } catch (error) {
      const status = error.response?.status;
      const msg = error.response?.data?.message || 'Operation failed';
      if (status === 403) {
        Alert.alert('Access Denied', msg);
      } else {
        Alert.alert(t('auth.error'), msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const renderVerificationCallout = () => {
    if (isEditing) return null;

    if (verificationLoading) {
      return (
        <View style={tw(`p-5 rounded-2xl mb-5 ${isDarkMode ? 'bg-slate-800' : 'bg-white'}`)}>
          <Text style={tw(`text-base ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`)}>Checking verification eligibility...</Text>
        </View>
      );
    }

    if (verificationError) {
      return (
        <View style={tw(`p-5 rounded-2xl mb-5 ${isDarkMode ? 'bg-slate-800' : 'bg-white'}`)}>
          <Text style={tw(`text-base ${isDarkMode ? 'text-red-300' : 'text-red-700'}`)}>{verificationError}</Text>
          <TouchableOpacity style={tw('mt-4 py-3 rounded-xl bg-green-800 items-center')}
            onPress={fetchVerificationStatus}>
            <Text style={tw('text-white font-semibold')}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (!verification || verification.verificationStatus !== 'verified') {
      return (
        <View style={tw(`p-5 rounded-2xl mb-5 ${isDarkMode ? 'bg-orange-800/10 border-orange-600/20' : 'bg-orange-50 border border-orange-200'}`)}>
          <Text style={tw(`text-base font-semibold mb-2 ${isDarkMode ? 'text-orange-200' : 'text-orange-800'}`)}>Verification Required</Text>
          <Text style={tw(`text-sm ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`)}>
            You must submit verification and be approved by an admin before you can post a product.
          </Text>
          <TouchableOpacity style={tw('mt-4 py-3 rounded-xl bg-green-800 items-center')}
            onPress={() => navigation.navigate('Verification')}>
            <Text style={tw('text-white font-semibold')}>Go to Verification</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return null;
  };

  const canAddCrop = isEditing || (verification && verification.verificationStatus === 'verified');

  if (!isEditing && (verificationLoading || !inFlightCheckDone)) {
    return (
      <View style={tw(`flex-1 justify-center items-center ${isDarkMode ? 'bg-slate-900' : 'bg-white'}`)}>
        <ActivityIndicator size="large" color="#16a34a" />
      </View>
    );
  }

  if (!canAddCrop) {
    return (
      <View style={tw(`flex-1 justify-center items-center px-6 ${isDarkMode ? 'bg-slate-900' : 'bg-white'}`)}>
        <View style={tw(`w-full p-6 rounded-2xl ${isDarkMode ? 'bg-slate-800' : 'bg-white shadow'}`)}>
          <Text style={tw(`text-xl font-bold mb-2 text-center ${isDarkMode ? 'text-white' : 'text-gray-800'}`)}>
            Verification Required
          </Text>
          <Text style={tw(`text-sm text-center mb-6 ${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`)}>
            You must complete the verification form and be approved by an admin before you can add a product.
          </Text>
          <TouchableOpacity style={tw('bg-green-800 py-3 rounded-xl items-center mb-3')}
            onPress={() => navigation.navigate('Verification')}>
            <Text style={tw('text-white font-semibold')}>Go to Verification</Text>
          </TouchableOpacity>
          <TouchableOpacity style={tw(`py-3 rounded-xl items-center ${isDarkMode ? 'bg-slate-700' : 'bg-gray-200'}`)}
            onPress={() => navigation.goBack()}>
            <Text style={tw(`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-700'}`)}>Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (!isEditing && inFlightCrop) {
    return (
      <View style={tw(`flex-1 justify-center items-center px-6 ${isDarkMode ? 'bg-slate-900' : 'bg-white'}`)}>
        <View style={tw(`w-full p-6 rounded-2xl ${isDarkMode ? 'bg-slate-800' : 'bg-white shadow'}`)}>
          <Text style={tw(`text-xl font-bold mb-2 text-center ${isDarkMode ? 'text-white' : 'text-gray-800'}`)}>
            Product Under Review
          </Text>
          <Text style={tw(`text-sm text-center mb-6 ${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`)}>
            You already have "{inFlightCrop.name}" being reviewed by the admin. You can only add a new product
            after this one is approved and posted to buyers, or rejected (then you can start again).
          </Text>
          <TouchableOpacity style={tw('bg-green-800 py-3 rounded-xl items-center mb-3')}
            onPress={() => navigation.navigate('CropPayment', { cropId: inFlightCrop._id, cropName: inFlightCrop.name })}>
            <Text style={tw('text-white font-semibold')}>View Current Product</Text>
          </TouchableOpacity>
          <TouchableOpacity style={tw(`py-3 rounded-xl items-center ${isDarkMode ? 'bg-slate-700' : 'bg-gray-200'}`)}
            onPress={() => navigation.goBack()}>
            <Text style={tw(`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-700'}`)}>Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

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
      {renderVerificationCallout()}

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
