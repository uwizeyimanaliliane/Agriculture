import React, { useState } from 'react';
import { Platform, View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator, ScrollView, Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { tw } from '../../utils/tw';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { authAPI } from '../../services/api';
import { getImageUrl } from '../../utils/formatters';

const EditProfileScreen = ({ navigation }) => {
  const { user, updateUser } = useAuth();
  const { isDarkMode } = useTheme();
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [province, setProvince] = useState(user?.location?.province || '');
  const [district, setDistrict] = useState(user?.location?.district || '');
  const [sector, setSector] = useState(user?.location?.sector || '');
  const [village, setVillage] = useState(user?.location?.village || '');
  const [avatar, setAvatar] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(user?.avatar || null);
  const [saving, setSaving] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled) {
      setAvatar(result.assets[0]);
      setAvatarPreview(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Name is required');
      return;
    }
    setSaving(true);
    try {
      const data = new FormData();
      data.append('name', name.trim());
      if (phone) data.append('phone', phone);
      if (province) data.append('province', province);
      if (district) data.append('district', district);
      if (sector) data.append('sector', sector);
      if (village) data.append('village', village);
      if (avatar) {
        const rawFilename = avatar.uri.split('/').pop()?.split('?')[0] || 'avatar.jpg';
        const ext = rawFilename.split('.').pop()?.toLowerCase() || 'jpg';
        const filename = rawFilename.includes('.') ? rawFilename : `avatar.${ext}`;
        if (Platform.OS === 'web') {
          const response = await fetch(avatar.uri);
          const blob = await response.blob();
          data.append('avatar', new File([blob], filename, { type: blob.type || `image/${ext}` }));
        } else {
          data.append('avatar', { uri: avatar.uri, type: `image/${ext}`, name: filename });
        }
      }
      const res = await authAPI.updateProfile(data);
      await updateUser(res.data.user);
      Alert.alert('Success', 'Profile updated');
      navigation.goBack();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword) {
      Alert.alert('Error', 'Enter your current password');
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert('Error', 'New password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }
    setChangingPassword(true);
    try {
      await authAPI.changePassword(currentPassword, newPassword);
      Alert.alert('Success', 'Password changed');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to change password');
    } finally {
      setChangingPassword(false);
    }
  };

  const inputStyle = tw(`border rounded-xl px-4 py-3 text-sm ${isDarkMode ? 'border-slate-600 bg-slate-700 text-white' : 'border-gray-300 bg-gray-50 text-gray-900'}`);

  return (
    <ScrollView style={tw(`flex-1 ${isDarkMode ? 'bg-slate-900' : 'bg-white'}`)}>
      <View style={tw(`p-6 pt-12 ${isDarkMode ? 'bg-slate-800' : 'bg-green-800'}`)}>
        <TouchableOpacity style={tw('self-start px-4 py-2 rounded-full bg-green-600')}
          onPress={() => navigation.goBack()}>
          <Text style={tw('text-white font-medium')}>← Back</Text>
        </TouchableOpacity>
        <Text style={tw('text-white text-2xl font-bold mt-4')}>Edit Profile</Text>
      </View>

      <View style={tw('p-4')}>
        <TouchableOpacity style={tw('items-center mb-6')} onPress={pickImage}>
          {avatarPreview ? (
            <Image source={{ uri: avatarPreview.startsWith('file') || avatarPreview.startsWith('data') ? avatarPreview : getImageUrl(avatarPreview) }}
              style={tw('w-24 h-24 rounded-full')} />
          ) : (
            <View style={tw('w-24 h-24 rounded-full bg-green-100 items-center justify-center')}>
              <Text style={tw('text-3xl')}>👤</Text>
            </View>
          )}
          <Text style={tw('text-green-600 text-sm mt-2 font-medium')}>Change Photo</Text>
        </TouchableOpacity>

        <Text style={tw(`text-sm font-semibold mb-1 ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`)}>Name</Text>
        <TextInput style={inputStyle} value={name} onChangeText={setName} placeholder="Full name" placeholderTextColor={isDarkMode ? '#64748b' : '#9ca3af'} />

        <Text style={tw(`text-sm font-semibold mb-1 mt-4 ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`)}>Phone</Text>
        <TextInput style={inputStyle} value={phone} onChangeText={setPhone} placeholder="Phone number" placeholderTextColor={isDarkMode ? '#64748b' : '#9ca3af'} keyboardType="phone-pad" />

        <Text style={tw(`text-lg font-semibold mt-6 mb-3 ${isDarkMode ? 'text-white' : 'text-gray-800'}`)}>Address</Text>
        <Text style={tw(`text-sm font-semibold mb-1 ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`)}>Province</Text>
        <TextInput style={inputStyle} value={province} onChangeText={setProvince} placeholder="Province" placeholderTextColor={isDarkMode ? '#64748b' : '#9ca3af'} />

        <Text style={tw(`text-sm font-semibold mb-1 mt-3 ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`)}>District</Text>
        <TextInput style={inputStyle} value={district} onChangeText={setDistrict} placeholder="District" placeholderTextColor={isDarkMode ? '#64748b' : '#9ca3af'} />

        <Text style={tw(`text-sm font-semibold mb-1 mt-3 ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`)}>Sector</Text>
        <TextInput style={inputStyle} value={sector} onChangeText={setSector} placeholder="Sector" placeholderTextColor={isDarkMode ? '#64748b' : '#9ca3af'} />

        <Text style={tw(`text-sm font-semibold mb-1 mt-3 ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`)}>Village</Text>
        <TextInput style={inputStyle} value={village} onChangeText={setVillage} placeholder="Village" placeholderTextColor={isDarkMode ? '#64748b' : '#9ca3af'} />

        <TouchableOpacity style={tw('bg-green-700 py-3 rounded-xl items-center mt-6')} onPress={handleSave} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={tw('text-white font-semibold')}>Save Changes</Text>}
        </TouchableOpacity>

        <View style={tw(`mt-8 pt-6 border-t ${isDarkMode ? 'border-slate-700' : 'border-gray-200'}`)}>
          <Text style={tw(`text-lg font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-800'}`)}>Change Password</Text>

          <Text style={tw(`text-sm font-semibold mb-1 ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`)}>Current Password</Text>
          <TextInput style={inputStyle} value={currentPassword} onChangeText={setCurrentPassword} placeholder="Current password" placeholderTextColor={isDarkMode ? '#64748b' : '#9ca3af'} secureTextEntry />

          <Text style={tw(`text-sm font-semibold mb-1 mt-3 ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`)}>New Password</Text>
          <TextInput style={inputStyle} value={newPassword} onChangeText={setNewPassword} placeholder="New password (min 6 chars)" placeholderTextColor={isDarkMode ? '#64748b' : '#9ca3af'} secureTextEntry />

          <Text style={tw(`text-sm font-semibold mb-1 mt-3 ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`)}>Confirm New Password</Text>
          <TextInput style={inputStyle} value={confirmPassword} onChangeText={setConfirmPassword} placeholder="Confirm new password" placeholderTextColor={isDarkMode ? '#64748b' : '#9ca3af'} secureTextEntry />

          <TouchableOpacity style={tw('bg-blue-700 py-3 rounded-xl items-center mt-4')} onPress={handleChangePassword} disabled={changingPassword}>
            {changingPassword ? <ActivityIndicator color="#fff" /> : <Text style={tw('text-white font-semibold')}>Change Password</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

export default EditProfileScreen;
