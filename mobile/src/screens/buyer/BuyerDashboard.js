import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Image, ScrollView, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { tw } from '../../utils/tw';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useI18n } from '../../i18n';
import { cropAPI } from '../../services/api';
import { formatCurrency, getImageUrl } from '../../utils/formatters';
import { BellIcon, MoonIcon, SunIcon } from '../../components/Icons';
import { useNotifications } from '../../context/NotificationContext';
import { navigateToRoot } from '../../navigation/navigationRef';

const BuyerDashboard = ({ navigation }) => {
  const { isDarkMode, toggleTheme } = useTheme();
  const { t } = useI18n();
  const { isAuthenticated, user, logout } = useAuth();
  const { unreadCount } = useNotifications();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchProducts = useCallback(async () => {
    try {
      const res = await cropAPI.getAvailable();
      setProducts(res.data.crops || []);
    } catch (err) {
      setProducts([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    fetchProducts();
  }, [fetchProducts]));

  const onRefresh = () => { setRefreshing(true); fetchProducts(); };

  const handleSignInAsFarmer = async () => {
    // A guest already has an active (buyer) session, so the root 'Auth'
    // screen is not mounted. Clear the guest session first so the Auth stack
    // becomes available, then navigate to login with the farmer role selected.
    if (isAuthenticated && user?.isGuest) {
      await logout();
      setTimeout(() => {
        navigateToRoot('Auth', { screen: 'Login', params: { selectedRole: 'farmer' } });
      }, 100);
      return;
    }
    navigateToRoot('Auth', { screen: 'Login', params: { selectedRole: 'farmer' } });
  };

  return (
    <ScrollView style={tw(`flex-1 ${isDarkMode ? 'bg-slate-900' : 'bg-white'}`)}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#16a34a']} />}>
      <View style={tw(`p-6 pt-12 ${isDarkMode ? 'bg-slate-800' : 'bg-green-800'}`)}>
        <View style={tw('flex-row justify-between items-start')}>
          <View style={tw('flex-1')}>
            <Text style={tw('text-white text-2xl font-bold')}>{t('app.name')}</Text>
            <Text style={tw('text-green-100 text-sm mt-1')}>{t('app.tagline')}</Text>
          </View>

          <View style={tw('flex-row items-center')}>
            <TouchableOpacity
              onPress={() => navigation.navigate('Notifications')}
              style={tw('w-12 h-12 rounded-full items-center justify-center bg-white/10 mr-2 relative')}
              activeOpacity={0.9}
            >
              <BellIcon size={28} color="#ffffff" />
              {unreadCount > 0 && (
                <View style={tw('absolute top-0 right-0 min-w-[18px] h-[18px] rounded-full bg-red-500 items-center justify-center px-1 z-10')}>
                  <Text style={tw('text-[9px] text-white font-bold')}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={toggleTheme}
              style={tw('w-10 h-10 rounded-full items-center justify-center bg-white/10')}
            >
              {isDarkMode ? <MoonIcon size={20} color="#ffffff" /> : <SunIcon size={20} color="#ffffff" />}
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <View style={tw(`mx-4 -mt-6 p-5 rounded-2xl shadow-lg ${isDarkMode ? 'bg-slate-800' : 'bg-white'}`)}>
        <Text style={tw(`text-lg font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-800'}`)}>🌍 {t('buyer.aboutProject')}</Text>
        <Text style={tw(`text-sm leading-6 ${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`)}>
          {t('buyer.projectDescription')}
        </Text>
      </View>

      {(!isAuthenticated || user?.isGuest) && (
        <View style={tw(`mx-4 mt-4 p-5 rounded-2xl shadow-lg ${isDarkMode ? 'bg-slate-800' : 'bg-white'}`)}>
          <Text style={tw(`text-base font-semibold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-800'}`)}>
            {t('buyer.guestBuyerTitle')}
          </Text>
          <Text style={tw(`text-sm leading-6 ${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`)}>
            {t('buyer.guestBuyerDescription')}
          </Text>
          <TouchableOpacity
            style={tw(`mt-4 rounded-xl py-3 items-center ${isDarkMode ? 'bg-green-700' : 'bg-green-800'}`)}
            onPress={handleSignInAsFarmer}
          >
            <Text style={tw('text-white text-base font-semibold')}>{t('auth.farmer')}</Text>
          </TouchableOpacity>
        </View>
      )}

      {isAuthenticated && user?.name && (
        <View style={tw('mx-4 mt-4')}>
          <Text style={tw(`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`)}>
            {t('farmer.welcome')}, {user.name} 👋
          </Text>
        </View>
      )}

      <View style={tw('px-4 mt-6 mb-8')}>
        <Text style={tw(`text-lg font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-800'}`)}>{t('buyer.availableProducts')}</Text>

        {loading ? (
          <View style={tw('py-10 items-center')}>
            <ActivityIndicator size="large" color="#16a34a" />
          </View>
        ) : products.length === 0 ? (
          <View style={tw(`p-8 rounded-2xl items-center ${isDarkMode ? 'bg-slate-800' : 'bg-white'}`)}>
            <Text style={tw('text-3xl mb-3')}>🌾</Text>
            <Text style={tw(`${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`)}>{t('buyer.noCrops')}</Text>
          </View>
        ) : (
          products.map((item) => (
            <View key={item._id} style={tw(`p-4 mb-3 rounded-2xl shadow-sm ${isDarkMode ? 'bg-slate-800' : 'bg-white'}`)}>
              <View style={tw('flex-row')}>
                {item.photos?.[0] ? (
                  <Image source={{ uri: getImageUrl(item.photos[0]) }} style={tw('w-20 h-20 rounded-xl mr-3')} />
                ) : (
                  <Text style={tw('text-4xl mr-3')}>🌾</Text>
                )}
                <View style={tw('flex-1')}>
                  <Text style={tw(`text-base font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'}`)}>{item.name}</Text>
                  <Text style={tw(`text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`)}>
                    {item.quantity} {item.quantityUnit} · {item.location?.district || t('buyer.unknown')}
                  </Text>
                  <Text style={tw('text-green-600 font-semibold mt-1')}>
                    {formatCurrency(item.price)} / {item.priceUnit}
                  </Text>
                  <TouchableOpacity style={tw('bg-green-700 py-2 px-4 rounded-lg mt-2 self-start')}
                    onPress={() => navigation.navigate('Order', { crop: item })}>
                    <Text style={tw('text-white text-xs font-medium')}>{t('buyer.order')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
};

export default BuyerDashboard;
