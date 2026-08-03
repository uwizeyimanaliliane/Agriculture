import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert, ActivityIndicator, FlatList, TextInput } from 'react-native';
import { tw } from '../../utils/tw';
import { useTheme } from '../../context/ThemeContext';
import { adminAPI } from '../../services/api';
import { alert, confirmAlert } from '../../utils/platform';
import ContactButtons from '../../components/ContactButtons';

const ROLE_COLORS = {
  farmer: 'bg-green-100 text-green-800',
  buyer: 'bg-blue-100 text-blue-700',
  transporter: 'bg-orange-100 text-orange-700',
  admin: 'bg-purple-100 text-purple-700',
};

const AdminUsers = ({ navigation }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('');
  const { isDarkMode } = useTheme();

  useEffect(() => {
    fetchUsers();
  }, [filter]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filter) params.role = filter;
      if (search) params.search = search;
      const response = await adminAPI.getUsers(params);
      setUsers(response.data.users);
    } catch (error) {
      Alert.alert('Error', 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = (user) => {
    const action = user.isVerified ? 'deactivate' : 'activate';
    confirmAlert(`Confirm ${action}`, `Are you sure you want to ${action} ${user.name}?`, async () => {
      try {
        await adminAPI.toggleUserStatus(user._id);
        fetchUsers();
      } catch (error) {
        alert('Error', 'Failed to update user status');
      }
    }, null, action.charAt(0).toUpperCase() + action.slice(1), 'Cancel');
  };

  const handleDeleteUser = (user) => {
    confirmAlert('Delete User', `Delete ${user.name}? This will remove all their data.`, async () => {
      try {
        await adminAPI.deleteUser(user._id);
        fetchUsers();
      } catch (error) {
        alert('Error', error.response?.data?.message || 'Failed to delete user');
      }
    }, null, 'Delete', 'Cancel');
  };

  const renderUser = ({ item }) => (
    <View style={tw(`p-4 mb-2 rounded-2xl shadow-sm ${isDarkMode ? 'bg-slate-800' : 'bg-white'}`)}>
      <View style={tw('flex-row items-center justify-between')}>
        <View style={tw('flex-1')}>
          <Text style={tw(`text-base font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'}`)}>{item.name}</Text>
          <Text style={tw(`text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`)}>{item.email}</Text>
          {item.phone && (
            <Text style={tw(`text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`)}>{item.phone}</Text>
          )}
          {item.role === 'transporter' && item.phone && (
            <ContactButtons
              phone={item.phone}
              name={item.name}
              smsBody={`Agri-Link transport coordination`}
              compact
              isDarkMode={isDarkMode}
            />
          )}
          <View style={tw('flex-row items-center mt-1')}>
            <View style={tw(`px-2 py-0.5 rounded-full ${ROLE_COLORS[item.role] || 'bg-gray-100'} ${isDarkMode ? '' : ''}`)}>
              <Text style={tw(`text-xs font-medium`)}>{item.role}</Text>
            </View>
            <View style={tw(`ml-2 px-2 py-0.5 rounded-full ${item.isVerified ? 'bg-green-100' : 'bg-red-100'}`)}>
              <Text style={tw(`text-xs ${item.isVerified ? 'text-green-700' : 'text-red-700'}`)}>
                {item.isVerified ? 'Verified' : 'Unverified'}
              </Text>
            </View>
          </View>
        </View>
        <View style={tw('flex-col gap-1')}>
          <TouchableOpacity style={tw('px-3 py-1.5 rounded-lg bg-blue-600 items-center')}
            onPress={() => navigation.navigate('AdminUserEdit', { userId: item._id })}>
            <Text style={tw('text-white text-xs')}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity style={tw(`px-3 py-1.5 rounded-lg items-center ${item.isVerified ? 'bg-amber-500' : 'bg-green-600'}`)}
            onPress={() => handleToggleStatus(item)}>
            <Text style={tw('text-white text-xs')}>{item.isVerified ? 'Deactivate' : 'Activate'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={tw('px-3 py-1.5 rounded-lg bg-red-500 items-center')}
            onPress={() => handleDeleteUser(item)}>
            <Text style={tw('text-white text-xs')}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <View style={tw(`flex-1 ${isDarkMode ? 'bg-slate-900' : 'bg-white'}`)}>
      <View style={tw(`p-5 pt-12 ${isDarkMode ? 'bg-slate-800' : 'bg-green-800'}`)}>
        <Text style={tw('text-white text-xl font-bold')}>Manage Users</Text>
      </View>

      <View style={tw('px-4 pt-3 flex-row gap-2')}>
        <TextInput style={tw(`flex-1 border rounded-xl px-4 py-2 ${isDarkMode ? 'border-slate-600 bg-slate-700 text-white' : 'border-gray-300 bg-white text-gray-800'}`)}
          placeholder="Search users..." placeholderTextColor={isDarkMode ? '#94a3b8' : '#9ca3af'}
          value={search} onChangeText={setSearch} onSubmitEditing={fetchUsers} />
        <TouchableOpacity style={tw('bg-green-800 px-4 py-2 rounded-xl items-center justify-center')}
          onPress={fetchUsers}>
          <Text style={tw('text-white text-sm')}>Search</Text>
        </TouchableOpacity>
      </View>

      <View style={tw('flex-row px-4 py-3 gap-2')}>
        {['', 'farmer', 'buyer', 'transporter', 'admin'].map((role) => (
          <TouchableOpacity key={role}
            style={tw(`px-3 py-1.5 rounded-full ${filter === role ? 'bg-green-800' : isDarkMode ? 'bg-slate-700' : 'bg-green-100'}`)}
            onPress={() => setFilter(role === filter ? '' : role)}>
            <Text style={tw(`text-xs ${filter === role ? 'text-white' : isDarkMode ? 'text-slate-300' : 'text-green-800'}`)}>
              {role || 'All'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={tw('flex-1 justify-center items-center')}>
          <ActivityIndicator size="large" color="#16a34a" />
        </View>
      ) : (
        <FlatList data={users} renderItem={renderUser} keyExtractor={(item) => item._id}
          contentContainerStyle={{ padding: 16 }}
          ListEmptyComponent={
            <Text style={tw(`text-center mt-12 ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`)}>No users found</Text>
          } />
      )}
    </View>
  );
};

export default AdminUsers;
