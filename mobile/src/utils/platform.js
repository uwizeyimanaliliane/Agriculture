import { Alert } from 'react-native';
import { showPopup } from '../components/Popup/popup';

// All alerts and confirmations are shown through the in-app popup dialog.

export function alert(title, message) {
  Alert.alert(title, message);
}

export function confirmAlert(title, message, onConfirm, onCancel, confirmText, cancelText) {
  showPopup({
    title: title || '',
    message: message || '',
    buttons: [
      { text: cancelText || 'Cancel', style: 'cancel', onPress: () => onCancel?.() },
      { text: confirmText || 'Confirm', style: 'default', onPress: () => onConfirm?.() },
    ],
  });
}
