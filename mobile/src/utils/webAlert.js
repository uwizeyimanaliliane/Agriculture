import { Alert } from 'react-native';
import { showPopup } from '../components/Popup/popup';

// Route every Alert.alert call through the in-app popup dialog
// instead of the native alert/confirm box.
Alert.alert = (title, message, buttons) => {
  const normalized = Array.isArray(buttons) && buttons.length
    ? buttons
    : [{ text: 'OK', onPress: undefined }];

  showPopup({
    title: title || '',
    message: message || '',
    buttons: normalized.map((b) => ({
      text: (b && b.text) || 'OK',
      style: b && b.style,
      onPress: b && b.onPress,
    })),
  });
};

export default Alert;
