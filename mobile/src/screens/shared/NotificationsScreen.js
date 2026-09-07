import React, { useCallback, useMemo } from 'react';
import { View, Text, TouchableOpacity, SectionList } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { tw } from '../../utils/tw';
import { useTheme } from '../../context/ThemeContext';
import { useNotifications } from '../../context/NotificationContext';
import { formatDateTime, formatDate } from '../../utils/formatters';
import { BellIcon, CloseIcon, MoonIcon, SunIcon } from '../../components/Icons';

const TYPE_META = {
  new_bid: { label: 'New Bid', color: '#16a34a', bg: '#dcfce7' },
  outbid: { label: 'Outbid', color: '#dc2626', bg: '#fee2e2' },
  auction_won: { label: 'Auction Won', color: '#7c3aed', bg: '#ede9fe' },
  auction_closed: { label: 'Auction Closed', color: '#7c3aed', bg: '#ede9fe' },
  delivery_update: { label: 'Delivery Update', color: '#2563eb', bg: '#dbeafe' },
  delivery_assigned: { label: 'Delivery Assigned', color: '#2563eb', bg: '#dbeafe' },
  delivery_confirmed: { label: 'Delivery Confirmed', color: '#16a34a', bg: '#dcfce7' },
  escrow_deposited: { label: 'Escrow Deposited', color: '#b45309', bg: '#fef3c7' },
  escrow_released: { label: 'Escrow Released', color: '#16a34a', bg: '#dcfce7' },
  payment_received: { label: 'Payment Received', color: '#16a34a', bg: '#dcfce7' },
  verification_update: { label: 'Verification Update', color: '#2563eb', bg: '#dbeafe' },
  verification_approved: { label: 'Verification Approved', color: '#16a34a', bg: '#dcfce7' },
  verification_rejected: { label: 'Verification Rejected', color: '#dc2626', bg: '#fee2e2' },
  verification_request: { label: 'Verification Request', color: '#b45309', bg: '#fef3c7' },
  subscription_reminder: { label: 'Subscription', color: '#7c3aed', bg: '#ede9fe' },
  new_message: { label: 'Message', color: '#2563eb', bg: '#dbeafe' },
  system: { label: 'System', color: '#64748b', bg: '#e2e8f0' },
  price_quote: { label: 'Price Quote', color: '#b45309', bg: '#fef3c7' },
  price_accepted: { label: 'Price Accepted', color: '#16a34a', bg: '#dcfce7' },
  payment_received_admin: { label: 'Payment Notice', color: '#2563eb', bg: '#dbeafe' },
  crop_sold: { label: 'Crop Sold', color: '#16a34a', bg: '#dcfce7' },
  transporter_assigned: { label: 'Transporter Assigned', color: '#2563eb', bg: '#dbeafe' },
  new_crop_available: { label: 'New Crop', color: '#16a34a', bg: '#dcfce7' },
  new_transport_job: { label: 'Transport Job', color: '#b45309', bg: '#fef3c7' },
  buyer_interested: { label: 'Buyer Interested', color: '#2563eb', bg: '#dbeafe' },
  transport_price_quoted: { label: 'Transport Price', color: '#b45309', bg: '#fef3c7' },
  transport_price_accepted: { label: 'Price Accepted', color: '#16a34a', bg: '#dcfce7' },
  post_fee_paid: { label: 'Post Fee Paid', color: '#2563eb', bg: '#dbeafe' },
  post_fee_received: { label: 'Post Fee Received', color: '#16a34a', bg: '#dcfce7' },
};

const typeMeta = (type) => TYPE_META[type] || TYPE_META.system;

const NotificationsScreen = ({ navigation }) => {
  const { notifications, unreadCount, fetchNotifications, markAsRead, markAllAsRead, deleteNotification } = useNotifications();
  const { isDarkMode, toggleTheme } = useTheme();

  useFocusEffect(useCallback(() => {
    fetchNotifications();
  }, []));

  const handlePress = async (notification) => {
    if (!notification.isRead) {
      await markAsRead(notification._id);
    }
  };

  const sections = useMemo(() => {
    const sorted = [...notifications].sort((a, b) => {
      if (a.isRead !== b.isRead) return Number(a.isRead) - Number(b.isRead);
      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    });

    const groups = new Map();
    sorted.forEach((n) => {
      const key = formatDate(n.createdAt);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(n);
    });

    return Array.from(groups.entries())
      .map(([title, data]) => ({
        title,
        data: [...data].sort((a, b) => {
          if (a.isRead !== b.isRead) return Number(a.isRead) - Number(b.isRead);
          return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
        }),
      }))
      .sort((a, b) => new Date(b.data[0]?.createdAt || 0) - new Date(a.data[0]?.createdAt || 0));
  }, [notifications]);

  const formatSectionTitle = (title) => {
    if (!title) return 'Latest';
    const today = formatDate(new Date());
    const yesterday = formatDate(new Date(Date.now() - 86400000));
    if (title === today) return 'Today';
    if (title === yesterday) return 'Yesterday';
    return title.toUpperCase();
  };

  const renderNotification = ({ item }) => {
    const unread = !item.isRead;
    const meta = typeMeta(item.type);
    const cardClass = isDarkMode
      ? (unread ? 'bg-slate-700 border border-green-500' : 'bg-slate-800 border border-slate-700')
      : (unread ? 'bg-white border border-green-300' : 'bg-white border border-gray-200');
    return (
      <View style={tw(`p-4 mb-3 rounded-2xl ${cardClass}`)}>
        <TouchableOpacity onPress={() => handlePress(item)} activeOpacity={0.9}>
          <View style={tw('flex-row items-center justify-between mb-2')}>
            <View style={tw(`px-2.5 py-1 rounded-full ${isDarkMode ? 'bg-slate-600' : meta.bg}`)}>
              <Text style={tw(`text-[11px] font-bold uppercase ${isDarkMode ? 'text-white' : meta.color}`)}>
                {meta.label}
              </Text>
            </View>
            <Text style={tw(`text-[11px] ml-2 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`)}>
              {formatDateTime(item.createdAt)}
            </Text>
          </View>

          <Text style={tw(`text-base ${unread ? 'font-bold' : 'font-semibold'} ${isDarkMode ? 'text-white' : 'text-gray-900'}`)}>
            {item.title}
          </Text>

          <Text style={tw(`mt-1 text-[15px] leading-6 ${isDarkMode ? 'text-slate-200' : 'text-gray-700'}`)}>
            {item.message}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => deleteNotification(item._id)}
          style={tw('absolute right-3 top-3 w-8 h-8 rounded-full items-center justify-center bg-red-100')}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityLabel="Delete notification"
        >
          <CloseIcon size={16} color="#dc2626" />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={tw(`flex-1 ${isDarkMode ? 'bg-slate-900' : 'bg-white'}`)}>
      <View style={tw(`p-6 pt-12 ${isDarkMode ? 'bg-slate-800' : 'bg-green-800'}`)}>
        <View style={tw('flex-row justify-between items-start mb-3')}>
          <View style={tw('flex-row items-center flex-1')}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={tw('w-10 h-10 rounded-full items-center justify-center bg-white/10 mr-3')}
              accessibilityLabel="Go back"
            >
              <Text style={tw('text-2xl text-white')}>←</Text>
            </TouchableOpacity>

            <BellIcon size={28} color="#ffffff" />
            <View style={tw('ml-3')}>
              <Text style={tw('text-white text-2xl font-bold')}>Notifications</Text>
              <Text style={tw('text-green-100 text-sm mt-1')}>{unreadCount} unread</Text>
            </View>
          </View>

          <View style={tw('flex-row items-center ml-4')}>
            <TouchableOpacity
              onPress={toggleTheme}
              style={tw('w-10 h-10 rounded-full items-center justify-center bg-white/10 mr-2')}
              accessibilityLabel="Toggle theme"
            >
              {isDarkMode ? <MoonIcon size={20} color="#ffffff" /> : <SunIcon size={20} color="#ffffff" />}
            </TouchableOpacity>
          </View>
        </View>

        <View style={tw('flex-row items-center justify-between pt-3 border-t border-white/20')}>
          {unreadCount > 0 && (
            <TouchableOpacity style={tw('bg-white/20 px-4 py-2 rounded-full')} onPress={markAllAsRead}>
              <Text style={tw('text-white text-sm font-medium')}>Mark All Read</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
      <SectionList
        sections={sections}
        renderItem={renderNotification}
        renderSectionHeader={({ section }) => (
          <Text style={tw(`text-[11px] font-bold uppercase tracking-wide mb-2 mt-4 ${isDarkMode ? 'text-slate-300' : 'text-gray-600'}`)}>
            {formatSectionTitle(section.title)}
          </Text>
        )}
        keyExtractor={(item) => item._id}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
        ListEmptyComponent={
          <View style={tw('flex-1 justify-center items-center pt-20')}>
            <Text style={tw(`text-lg ${isDarkMode ? 'text-slate-300' : 'text-gray-500'}`)}>No notifications</Text>
          </View>
        }
      />
    </View>
  );
};

export default NotificationsScreen;
