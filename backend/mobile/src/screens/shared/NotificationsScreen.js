import React, { useCallback } from 'react';
import { View, Text, TouchableOpacity, FlatList } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { tw } from '../../utils/tw';
import { useTheme } from '../../context/ThemeContext';
import { useNotifications } from '../../context/NotificationContext';
import { formatDateTime } from '../../utils/formatters';

const NotificationsScreen = ({ navigation }) => {
  const { notifications, unreadCount, fetchNotifications, markAsRead, markAllAsRead } = useNotifications();
  const { isDarkMode } = useTheme();

  useFocusEffect(useCallback(() => {
    fetchNotifications();
  }, []));

  const handlePress = async (notification) => {
    if (!notification.isRead) {
      await markAsRead(notification._id);
    }
  };

  const renderNotification = ({ item }) => (
    <TouchableOpacity
      style={tw(`p-4 mb-2 rounded-2xl ${!item.isRead
        ? (isDarkMode ? 'bg-slate-700 border-l-4 border-green-500' : 'bg-green-50 border-l-4 border-green-500')
        : (isDarkMode ? 'bg-slate-800' : 'bg-white')}`)}
      onPress={() => handlePress(item)}
    >
      <View style={tw('flex-row justify-between items-start')}>
        <Text style={tw(`flex-1 text-base ${!item.isRead ? 'font-bold' : 'font-semibold'} ${isDarkMode ? 'text-white' : 'text-gray-800'}`)}>
          {item.title}
        </Text>
        <Text style={tw(`text-xs ml-2 ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`)}>
          {formatDateTime(item.createdAt)}
        </Text>
      </View>
      <Text style={tw(`text-sm mt-1 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`)}>
        {item.message}
      </Text>
      <View style={tw('self-start px-3 py-1 rounded-full mt-2 bg-gray-100')}>
        <Text style={tw('text-xs text-gray-500 capitalize')}>{item.type.replace(/_/g, ' ')}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={tw(`flex-1 ${isDarkMode ? 'bg-slate-900' : 'bg-white'}`)}>
      <View style={tw(`p-6 pt-12 ${isDarkMode ? 'bg-slate-800' : 'bg-green-800'}`)}>
        <View style={tw('flex-row justify-between items-center')}>
          <View>
            <Text style={tw('text-white text-2xl font-bold')}>Notifications</Text>
            <Text style={tw('text-green-100 text-sm mt-1')}>{unreadCount} unread</Text>
          </View>
          {unreadCount > 0 && (
            <TouchableOpacity style={tw('bg-white/20 px-4 py-2 rounded-full')} onPress={markAllAsRead}>
              <Text style={tw('text-white text-sm font-medium')}>Mark All Read</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
      <FlatList data={notifications} renderItem={renderNotification} keyExtractor={(item) => item._id}
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={
          <View style={tw('flex-1 justify-center items-center pt-20')}>
            <Text style={tw(`text-lg ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`)}>No notifications</Text>
          </View>
        } />
    </View>
  );
};

export default NotificationsScreen;


