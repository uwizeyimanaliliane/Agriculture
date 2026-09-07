import { Linking, Alert } from 'react-native';

export const ADMIN_PHONE = '0781793232';
export const ADMIN_NAME = 'Agri-Link Admin';

export const callPhone = (phone) => {
  if (!phone) {
    Alert.alert('No phone number', 'Contact information is not available.');
    return;
  }
  Linking.openURL(`tel:${phone}`).catch(() => {
    Alert.alert('Error', 'Could not open the phone app.');
  });
};

export const smsPhone = (phone, body = '') => {
  if (!phone) {
    Alert.alert('No phone number', 'Contact information is not available.');
    return;
  }
  const separator = body ? `?body=${encodeURIComponent(body)}` : '';
  Linking.openURL(`sms:${phone}${separator}`).catch(() => {
    Alert.alert('Error', 'Could not open the messaging app.');
  });
};
