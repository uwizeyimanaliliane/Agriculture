import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { navigationRef } from './navigationRef';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../i18n';
import { tw } from '../utils/tw';
import {
  HomeIcon,
  CropsIcon,
  HistoryIcon,
  SettingsIcon,
  SearchIcon,
  JobsIcon,
  DashboardIcon,
  UsersIcon,
  VerificationIcon,
} from '../components/Icons';

const tabIcon = (IconComponent) => ({ color }) => (
  <IconComponent size={24} color={color} />
);

const tabScreenOptions = {
  headerShown: false,
  tabBarStyle: {
    backgroundColor: '#166534',
    borderTopColor: '#14532d',
    borderTopWidth: 1,
    height: 56,
  },
  tabBarActiveTintColor: '#ffffff',
  tabBarInactiveTintColor: '#bbf7d0',
  tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
};

const settingsOption = (t) => ({
  tabBarIcon: tabIcon(SettingsIcon),
  tabBarLabel: t('common.settings'),
});

import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import EmailVerificationScreen from '../screens/auth/EmailVerificationScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';
import ResetPasswordScreen from '../screens/auth/ResetPasswordScreen';

import FarmerDashboard from '../screens/farmer/FarmerDashboard';
import MyCrops from '../screens/farmer/MyCrops';
import AddCrop from '../screens/farmer/AddCrop';
import AddCropGateway from '../screens/farmer/AddCropGateway';
import CreateAuction from '../screens/farmer/CreateAuction';
import VerificationScreen from '../screens/farmer/VerificationScreen';
import CropPaymentScreen from '../screens/farmer/CropPaymentScreen';
import SalesHistory from '../screens/farmer/SalesHistory';
import FarmerAgreementScreen from '../screens/farmer/FarmerAgreementScreen';
import MyAuctions from '../screens/farmer/MyAuctions';

import BrowseCrops from '../screens/buyer/BrowseCrops';
import BuyerDashboard from '../screens/buyer/BuyerDashboard';
import OrderScreen from '../screens/buyer/OrderScreen';
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
import BuyerHistoryScreen from '../screens/buyer/BuyerHistoryScreen';

import AdminDashboard from '../screens/admin/AdminDashboard';
import AdminCrops from '../screens/admin/AdminCrops';
import AdminUsers from '../screens/admin/AdminUsers';
import AdminUserEdit from '../screens/admin/AdminUserEdit';
import AdminEscrows from '../screens/admin/AdminEscrows';
import AdminPendingCrops from '../screens/admin/AdminPendingCrops';
import AdminPostProduct from '../screens/admin/AdminPostProduct';
import AdminPostFees from '../screens/admin/AdminPostFees';
import AdminVerifications from '../screens/admin/AdminVerifications';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// ---- Farmer nested stacks (stable module scope) ----
const FarmerDashboardStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="DashboardHome" component={FarmerDashboard} />
    <Stack.Screen name="Notifications" component={NotificationsScreen} />
    <Stack.Screen name="Verification" component={VerificationScreen} />
    <Stack.Screen name="AddCrop" component={AddCrop} />
    <Stack.Screen name="CropPayment" component={CropPaymentScreen} />
    <Stack.Screen name="AddCropGateway" component={AddCropGateway} />
    <Stack.Screen name="MyOrders" component={MyOrdersScreen} />
  </Stack.Navigator>
);

const FarmerMyCropsStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="MyCropsHome" component={MyCrops} />
    <Stack.Screen name="AddCrop" component={AddCrop} />
    <Stack.Screen name="Verification" component={VerificationScreen} />
    <Stack.Screen name="CropPayment" component={CropPaymentScreen} />
    <Stack.Screen name="AddCropGateway" component={AddCropGateway} />
    <Stack.Screen name="MyOrders" component={MyOrdersScreen} />
    <Stack.Screen name="CreateAuction" component={CreateAuction} />
    <Stack.Screen name="MyAuctions" component={MyAuctions} />
  </Stack.Navigator>
);

const FarmerHistoryStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="HistoryHome" component={SalesHistory} />
  </Stack.Navigator>
);

const FarmerSettingsStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="SettingsHome" component={SettingsScreen} />
    <Stack.Screen name="EditProfile" component={EditProfileScreen} />
  </Stack.Navigator>
);

const FarmerTabs = () => {
  const { t } = useI18n();
  return (
    <Tab.Navigator screenOptions={tabScreenOptions}>
      <Tab.Screen name="Dashboard" component={FarmerDashboardStack} options={{ tabBarIcon: tabIcon(HomeIcon), tabBarLabel: t('farmer.dashboard') }} />
      <Tab.Screen name="MyCrops" component={FarmerMyCropsStack} options={{ tabBarIcon: tabIcon(CropsIcon), tabBarLabel: t('farmer.myCrops') }} />
      <Tab.Screen name="History" component={FarmerHistoryStack} options={{ tabBarIcon: tabIcon(HistoryIcon), tabBarLabel: t('farmer.salesHistory') }} />
      <Tab.Screen name="Settings" component={FarmerSettingsStack} options={settingsOption(t)} />
    </Tab.Navigator>
  );
};

// ---- Buyer nested stacks ----
const BuyerDashboardStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="DashboardHome" component={BuyerDashboard} />
    <Stack.Screen name="Notifications" component={NotificationsScreen} />
    <Stack.Screen name="Order" component={OrderScreen} />
    <Stack.Screen name="OrderTransporter" component={OrderTransporterScreen} />
    <Stack.Screen name="MyOrders" component={MyOrdersScreen} />
  </Stack.Navigator>
);

const BuyerBrowseStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="BrowseHome" component={BrowseCrops} />
    <Stack.Screen name="AuctionDetail" component={AuctionDetail} />
    <Stack.Screen name="Order" component={OrderScreen} />
    <Stack.Screen name="OrderTransporter" component={OrderTransporterScreen} />
    <Stack.Screen name="MyOrders" component={MyOrdersScreen} />
    <Stack.Screen name="MyDeliveries" component={MyDeliveriesScreen} />
    <Stack.Screen name="DeliveryTracking" component={DeliveryTracking} />
    <Stack.Screen name="QRScan" component={QRScanScreen} />
  </Stack.Navigator>
);

const BuyerSettingsStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="SettingsHome" component={SettingsScreen} />
    <Stack.Screen name="EditProfile" component={EditProfileScreen} />
  </Stack.Navigator>
);

const BuyerHistoryStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="HistoryHome" component={BuyerHistoryScreen} />
  </Stack.Navigator>
);

const BuyerTabs = () => {
  const { t } = useI18n();
  const { isAuthenticated, user } = useAuth();
  const hasBuyerAccount = isAuthenticated && user?.role === 'buyer' && user?.isGuest !== true;
  return (
    <Tab.Navigator screenOptions={tabScreenOptions}>
      <Tab.Screen name="Dashboard" component={BuyerDashboardStack} options={{ tabBarIcon: tabIcon(HomeIcon), tabBarLabel: t('buyer.dashboard') }} />
      <Tab.Screen name="Browse" component={BuyerBrowseStack} options={{ tabBarIcon: tabIcon(SearchIcon), tabBarLabel: t('buyer.browse') }} />
      {hasBuyerAccount && (
        <>
          <Tab.Screen name="History" component={BuyerHistoryStack} options={{ tabBarIcon: tabIcon(HistoryIcon), tabBarLabel: t('buyer.history') }} />
          <Tab.Screen name="Settings" component={BuyerSettingsStack} options={settingsOption(t)} />
        </>
      )}
    </Tab.Navigator>
  );
};

// ---- Transporter nested stacks ----
const TransporterJobsStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="JobsHome" component={TransporterJobs} />
    <Stack.Screen name="Notifications" component={NotificationsScreen} />
    <Stack.Screen name="CropBid" component={CropBidScreen} />
    <Stack.Screen name="TransporterMap" component={TransporterMap} />
    <Stack.Screen name="MyDeliveries" component={MyDeliveriesScreen} />
    <Stack.Screen name="DeliveryTracking" component={DeliveryTracking} />
    <Stack.Screen name="QRScan" component={QRScanScreen} />
  </Stack.Navigator>
);

const TransporterDeliveriesStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="DeliveriesHome" component={ActiveDeliveries} />
  </Stack.Navigator>
);

const TransporterSettingsStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="SettingsHome" component={SettingsScreen} />
    <Stack.Screen name="EditProfile" component={EditProfileScreen} />
  </Stack.Navigator>
);

const TransporterTabs = () => {
  const { t } = useI18n();
  return (
    <Tab.Navigator screenOptions={tabScreenOptions}>
      <Tab.Screen name="Jobs" component={TransporterJobsStack} options={{ tabBarIcon: tabIcon(JobsIcon), tabBarLabel: t('transporter.availableJobs') }} />
      <Tab.Screen name="Deliveries" component={TransporterDeliveriesStack} options={{ tabBarIcon: tabIcon(TruckIcon), tabBarLabel: t('transporter.myDeliveries') }} />
      <Tab.Screen name="Settings" component={TransporterSettingsStack} options={settingsOption(t)} />
    </Tab.Navigator>
  );
};

// ---- Admin nested stacks ----
const AdminDashboardStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="DashboardHome" component={AdminDashboard} />
    <Stack.Screen name="Notifications" component={NotificationsScreen} />
    <Stack.Screen name="AdminEscrows" component={AdminEscrows} />
    <Stack.Screen name="AdminPostFees" component={AdminPostFees} />
    <Stack.Screen name="AdminPostProduct" component={AdminPostProduct} />
    <Stack.Screen name="AdminPendingCrops" component={AdminPendingCrops} />
  </Stack.Navigator>
);

const AdminCropsStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="AdminCropsHome" component={AdminCrops} />
  </Stack.Navigator>
);

const AdminUsersStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="AdminUsersHome" component={AdminUsers} />
    <Stack.Screen name="AdminUserEdit" component={AdminUserEdit} />
  </Stack.Navigator>
);

const AdminVerificationsStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="AdminVerificationsHome" component={AdminVerifications} />
  </Stack.Navigator>
);

const AdminSettingsStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="SettingsHome" component={SettingsScreen} />
    <Stack.Screen name="EditProfile" component={EditProfileScreen} />
  </Stack.Navigator>
);

const AdminTabs = () => {
  const { t } = useI18n();
  return (
    <Tab.Navigator screenOptions={tabScreenOptions}>
      <Tab.Screen name="Dashboard" component={AdminDashboardStack} options={{ tabBarIcon: tabIcon(DashboardIcon), tabBarLabel: t('admin.dashboard') }} />
      <Tab.Screen name="AdminCrops" component={AdminCropsStack} options={{ tabBarIcon: tabIcon(CropsIcon), tabBarLabel: t('admin.marketplace') }} />
      <Tab.Screen name="AdminUsers" component={AdminUsersStack} options={{ tabBarIcon: tabIcon(UsersIcon), tabBarLabel: t('admin.users') }} />
      <Tab.Screen name="AdminVerifications" component={AdminVerificationsStack} options={{ tabBarIcon: tabIcon(VerificationIcon), tabBarLabel: t('admin.verifications') }} />
      <Tab.Screen name="Settings" component={AdminSettingsStack} options={settingsOption(t)} />
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
  const { isAuthenticated, user, agreementAccepted, loading } = useAuth();

  if (loading) {
    return (
      <View style={tw('flex-1 items-center justify-center bg-white')}>
        <ActivityIndicator size="large" color="#16a34a" />
      </View>
    );
  }

  const initialRoute = !isAuthenticated ? 'Auth' :
    user?.role === 'farmer' && !agreementAccepted ? 'FarmerAgreement' :
    user?.role === 'farmer' ? 'FarmerHome' :
    user?.role === 'transporter' ? 'TransporterHome' :
    user?.role === 'admin' ? 'AdminHome' :
    'BuyerHome';

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator
      key={isAuthenticated ? 'signed-in' : 'signed-out'}
      initialRouteName={initialRoute}
      screenOptions={{ headerShown: false }}
    >
        {!isAuthenticated ? (
          <>
            <Stack.Screen name="Auth" component={AuthStack} />
            <Stack.Screen name="BuyerHome" component={BuyerTabs} />
          </>
        ) : (
          <>
            {user?.role === 'farmer' && (
              <>
                <Stack.Screen name="FarmerAgreement" component={FarmerAgreementScreen} />
                <Stack.Screen name="FarmerHome" component={FarmerTabs} />
              </>
            )}
            {user?.role === 'buyer' && (
              <Stack.Screen name="BuyerHome" component={BuyerTabs} />
            )}
            {user?.role === 'transporter' && (
              <Stack.Screen name="TransporterHome" component={TransporterTabs} />
            )}
            {user?.role === 'admin' && (
              <Stack.Screen name="AdminHome" component={AdminTabs} />
            )}
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
