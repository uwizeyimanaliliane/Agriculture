import { Alert, Platform } from 'react-native';

const isWeb = Platform.OS === 'web';

export function alert(title, message) {
  if (isWeb) {
    window.alert(`${title}\n${message}`);
  } else {
    Alert.alert(title, message);
  }
}

export function confirmAlert(title, message, onConfirm, onCancel, confirmText, cancelText) {
  if (isWeb) {
    if (window.confirm(`${title}\n${message}`)) {
      onConfirm?.();
    } else {
      onCancel?.();
    }
  } else {
    Alert.alert(title, message, [
      { text: cancelText || 'Cancel', style: 'cancel', onPress: onCancel },
      { text: confirmText || 'Confirm', style: 'destructive', onPress: onConfirm },
    ]);
  }
}
