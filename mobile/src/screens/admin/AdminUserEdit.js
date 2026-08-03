import React, { useState, useEffect } from 'react';
import { Platform, View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator, ScrollView, Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { tw } from '../../utils/tw';
import { useTheme } from '../../context/ThemeContext';
import { adminAPI } from '../../services/api';
import { getImageUrl } from '../../utils/formatters';

const AdminUserEdit = ({ route, navigation }) => {
  const { userId } = route.params;
  const { isDarkMode } = useTheme();
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('');
  const [province, setProvince] = useState('');
  const [district, setDistrict] = useState('');
  const [sector, setSector] = useState('');
  const [village, setVillage] = useState('');
  const [avatar, setAvatar] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [saving, setSaving] = useState(false);

  const [newPassword, setNewPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await adminAPI.getUserById(userId);
        const u = res.data.user;
        setName(u.name || '');
        setPhone(u.phone || '');
        setEmail(u.email || '');
        setRole(u.role || '');
        setProvince(u.location?.province || '');
        setDistrict(u.location?.district || '');
        setSector(u.location?.sector || '');
        setVillage(u.location?.village || '');
        setAvatarPreview(u.avatar || null);
      } catch (err) {
        Alert.alert('Error', 'Failed to load user');
        navigation.goBack();
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, [userId]);

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
      await adminAPI.updateUserProfile(userId, data);
      Alert.alert('Success', 'User profile updated');
      navigation.goBack();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to update user');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }
    setChangingPassword(true);
    try {
      await adminAPI.changeUserPassword(userId, newPassword);
      Alert.alert('Success', 'Password changed for ' + email);
      setNewPassword('');
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to change password');
    } finally {
      setChangingPassword(false);
    }
  };

  if (loading) {
    return (
      <View style={tw(`flex-1 justify-center items-center ${isDarkMode ? 'bg-slate-900' : 'bg-white'}`)}>
        <ActivityIndicator size="large" color="#16a34a" />
      </View>
    );
  }

  const inputStyle = tw(`border rounded-xl px-4 py-3 text-sm ${isDarkMode ? 'border-slate-600 bg-slate-700 text-white' : 'border-gray-300 bg-gray-50 text-gray-900'}`);

  return (
    <ScrollView style={tw(`flex-1 ${isDarkMode ? 'bg-slate-900' : 'bg-white'}`)}>
      <View style={tw(`p-6 pt-12 ${isDarkMode ? 'bg-slate-800' : 'bg-green-800'}`)}>
        <TouchableOpacity style={tw('self-start px-4 py-2 rounded-full bg-green-600')}
          onPress={() => navigation.goBack()}>
          <Text style={tw('text-white font-medium')}>← Back</Text>
        </TouchableOpacity>
        <Text style={tw('text-white text-2xl font-bold mt-4')}>Edit User</Text>
        <Text style={tw('text-green-200 text-sm mt-1')}>{email} · {role}</Text>
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
          <Text style={tw(`text-lg font-semibold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-800'}`)}>Change Password</Text>
          <Text style={tw(`text-xs mb-4 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`)}>
            Set a new password for this user (no current password needed)
          </Text>

          <Text style={tw(`text-sm font-semibold mb-1 ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`)}>New Password</Text>
          <TextInput style={inputStyle} value={newPassword} onChangeText={setNewPassword} placeholder="Min 6 characters" placeholderTextColor={isDarkMode ? '#64748b' : '#9ca3af'} secureTextEntry />

          <TouchableOpacity style={tw('bg-blue-700 py-3 rounded-xl items-center mt-4')} onPress={handleChangePassword} disabled={changingPassword}>
            {changingPassword ? <ActivityIndicator color="#fff" /> : <Text style={tw('text-white font-semibold')}>Change Password</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

export default AdminUserEdit;
