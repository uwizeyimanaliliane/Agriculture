import React from 'react';
import { Text, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { useI18n } from '../i18n';

const tabIcon = (emoji) => ({ color }) => (
  <Text style={{ fontSize: 20, color }}>{emoji}</Text>
);

const tabIconWithBadge = (emoji, count) => ({ color }) => (
  <View style={{ width: 28, height: 28, alignItems: 'center', justifyContent: 'center' }}>
    <Text style={{ fontSize: 20, color }}>{emoji}</Text>
    {count > 0 && (
      <View
        style={{
          position: 'absolute',
          right: -6,
          top: -4,
          minWidth: 16,
          height: 16,
          borderRadius: 8,
          backgroundColor: '#ef4444',
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 3,
        }}
      >
        <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>
          {count > 9 ? '9+' : String(count)}
        </Text>
      </View>
    )}
  </View>
);

const tabScreenOptions = {
  headerShown: false,
  tabBarStyle: { backgroundColor: '#166534', borderTopColor: '#14532d', borderTopWidth: 1, paddingBottom: 4, height: 56 },
  tabBarActiveTintColor: '#ffffff',
  tabBarInactiveTintColor: '#bbf7d0',
  tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
};

import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import EmailVerificationScreen from '../screens/auth/EmailVerificationScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';
import ResetPasswordScreen from '../screens/auth/ResetPasswordScreen';

import FarmerDashboard from '../screens/farmer/FarmerDashboard';
import MyCrops from '../screens/farmer/MyCrops';
import AddCrop from '../screens/farmer/AddCrop';
import CreateAuction from '../screens/farmer/CreateAuction';
import VerificationScreen from '../screens/farmer/VerificationScreen';

import BrowseCrops from '../screens/buyer/BrowseCrops';
import Transporters from '../screens/buyer/Transporters';
import OrderScreen from '../screens/buyer/OrderScreen';
import AuctionList from '../screens/buyer/AuctionList';
import AuctionDetail from '../screens/buyer/AuctionDetail';
import DeliveryTracking from '../screens/buyer/DeliveryTracking';

import TransporterJobs from '../screens/transporter/TransporterJobs';
import ActiveDeliveries from '../screens/transporter/ActiveDeliveries';
import TransporterMap from '../screens/transporter/TransporterMap';
import CropBidScreen from '../screens/transporter/CropBidScreen';
import QRScanScreen from '../screens/shared/QRScanScreen';
import NotificationsScreen from '../screens/shared/NotificationsScreen';
import SettingsScreen from '../screens/shared/SettingsScreen';
import EditProfileScreen from '../screens/shared/EditProfileScreen';
import OrderTransporterScreen from '../screens/shared/OrderTransporterScreen';
import MyDeliveriesScreen from '../screens/shared/MyDeliveriesScreen';
import MyOrdersScreen from '../screens/shared/MyOrdersScreen';

import AdminDashboard from '../screens/admin/AdminDashboard';
import AdminCrops from '../screens/admin/AdminCrops';
import AdminUsers from '../screens/admin/AdminUsers';
import AdminUserEdit from '../screens/admin/AdminUserEdit';
import AdminEscrows from '../screens/admin/AdminEscrows';
import AdminPendingCrops from '../screens/admin/AdminPendingCrops';
import AdminPostProduct from '../screens/admin/AdminPostProduct';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const FarmerTabs = () => {
  const { unreadCount } = useNotifications();
  const { t } = useI18n();
  return (
    <Tab.Navigator screenOptions={tabScreenOptions}>
      <Tab.Screen name="Dashboard" component={FarmerDashboard} options={{ tabBarIcon: tabIcon('🏠'), tabBarLabel: t('farmer.dashboard') }} />
      <Tab.Screen name="MyCrops" component={MyCrops} options={{ tabBarIcon: tabIcon('🌾'), tabBarLabel: t('farmer.myCrops') }} />
      <Tab.Screen name="Deliveries" component={MyDeliveriesScreen} options={{ tabBarIcon: tabIcon('🚚'), tabBarLabel: t('transporter.myDeliveries') }} />
      <Tab.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{
          tabBarIcon: tabIconWithBadge('🔔', unreadCount),
          tabBarLabel: t('common.notifications'),
        }}
      />
      <Tab.Screen name="Settings" component={SettingsScreen} options={{ tabBarIcon: tabIcon('⚙️'), tabBarLabel: t('common.settings') }} />
    </Tab.Navigator>
  );
};

const BuyerTabs = () => {
  const { unreadCount } = useNotifications();
  const { t } = useI18n();
  return (
    <Tab.Navigator screenOptions={tabScreenOptions}>
      <Tab.Screen name="Browse" component={BrowseCrops} options={{ tabBarIcon: tabIcon('🔍'), tabBarLabel: t('buyer.browse') }} />
      <Tab.Screen name="Transporters" component={Transporters} options={{ tabBarIcon: tabIcon('🚚'), tabBarLabel: t('auth.transporter') }} />
      <Tab.Screen name="Auctions" component={AuctionList} options={{ tabBarIcon: tabIcon('🏪'), tabBarLabel: t('buyer.activeAuctions') }} />
      <Tab.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{
          tabBarIcon: tabIconWithBadge('🔔', unreadCount),
          tabBarLabel: t('common.notifications'),
        }}
      />
      <Tab.Screen name="Settings" component={SettingsScreen} options={{ tabBarIcon: tabIcon('⚙️'), tabBarLabel: t('common.settings') }} />
    </Tab.Navigator>
  );
};

const TransporterTabs = () => {
  const { unreadCount } = useNotifications();
  const { t } = useI18n();
  return (
    <Tab.Navigator screenOptions={tabScreenOptions}>
      <Tab.Screen name="Jobs" component={TransporterJobs} options={{ tabBarIcon: tabIcon('📋'), tabBarLabel: t('transporter.availableJobs') }} />
      <Tab.Screen name="Deliveries" component={ActiveDeliveries} options={{ tabBarIcon: tabIcon('🚚'), tabBarLabel: t('transporter.myDeliveries') }} />
      <Tab.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{
          tabBarIcon: tabIconWithBadge('🔔', unreadCount),
          tabBarLabel: t('common.notifications'),
        }}
      />
      <Tab.Screen name="Settings" component={SettingsScreen} options={{ tabBarIcon: tabIcon('⚙️'), tabBarLabel: t('common.settings') }} />
    </Tab.Navigator>
  );
};

const AdminTabs = () => {
  const { unreadCount } = useNotifications();
  const { t } = useI18n();
  return (
    <Tab.Navigator screenOptions={tabScreenOptions}>
      <Tab.Screen name="Dashboard" component={AdminDashboard} options={{ tabBarIcon: tabIcon('📊'), tabBarLabel: t('admin.dashboard') }} />
      <Tab.Screen name="AdminCrops" component={AdminCrops} options={{ tabBarIcon: tabIcon('🌾'), tabBarLabel: t('admin.marketplace') }} />
      <Tab.Screen name="AdminUsers" component={AdminUsers} options={{ tabBarIcon: tabIcon('👥'), tabBarLabel: t('admin.users') }} />
      <Tab.Screen name="AdminEscrows" component={AdminEscrows} options={{ tabBarIcon: tabIcon('💳'), tabBarLabel: t('admin.pendingEscrows') }} />
      <Tab.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{
          tabBarIcon: tabIconWithBadge('🔔', unreadCount),
          tabBarLabel: t('common.notifications'),
        }}
      />
      <Tab.Screen name="Settings" component={SettingsScreen} options={{ tabBarIcon: tabIcon('⚙️'), tabBarLabel: t('common.settings') }} />
    </Tab.Navigator>
  );
};

const AuthStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Login" component={LoginScreen} />
    <Stack.Screen name="Register" component={RegisterScreen} />
    <Stack.Screen name="EmailVerification" component={EmailVerificationScreen} />
    <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
    <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
  </Stack.Navigator>
);

const AppNavigator = () => {
  const { isAuthenticated, user } = useAuth();

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          <Stack.Screen name="Auth" component={AuthStack} />
        ) : (
          <>
            {user?.role === 'farmer' && (
              <Stack.Screen name="FarmerHome" component={FarmerTabs} />
            )}
            {user?.role === 'buyer' && (
              <Stack.Screen name="BuyerHome" component={BuyerTabs} />
            )}
            {user?.role === 'transporter' && (
              <Stack.Screen name="TransporterHome" component={TransporterTabs} />
            )}
            {user?.role === 'transporter' && (
              <Stack.Screen name="TransporterMap" component={TransporterMap} />
            )}
            {user?.role === 'transporter' && (
              <Stack.Screen name="CropBid" component={CropBidScreen} />
            )}
            {user?.role === 'admin' && (
              <Stack.Screen name="AdminHome" component={AdminTabs} />
            )}
            <Stack.Screen name="AddCrop" component={AddCrop} />
            <Stack.Screen name="CreateAuction" component={CreateAuction} />
            <Stack.Screen name="AuctionDetail" component={AuctionDetail} />
            <Stack.Screen name="DeliveryTracking" component={DeliveryTracking} />
            <Stack.Screen name="QRScan" component={QRScanScreen} />
            <Stack.Screen name="Verification" component={VerificationScreen} />
            <Stack.Screen name="Notifications" component={NotificationsScreen} />
            <Stack.Screen name="Settings" component={SettingsScreen} />
            <Stack.Screen name="EditProfile" component={EditProfileScreen} />
            <Stack.Screen name="OrderTransporter" component={OrderTransporterScreen} />
            <Stack.Screen name="MyDeliveries" component={MyDeliveriesScreen} />
            <Stack.Screen name="MyOrders" component={MyOrdersScreen} />
            <Stack.Screen name="Order" component={OrderScreen} />
            {user?.role === 'admin' && (
              <Stack.Screen name="AdminPendingCrops" component={AdminPendingCrops} />
            )}
            {user?.role === 'admin' && (
              <Stack.Screen name="AdminPostProduct" component={AdminPostProduct} />
            )}
            {user?.role === 'admin' && (
              <Stack.Screen name="AdminUserEdit" component={AdminUserEdit} />
            )}
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
