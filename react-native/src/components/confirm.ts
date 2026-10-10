import { Alert, Platform } from 'react-native';

/** Cross-platform confirm: native alert on iOS and Android, window.confirm on web. */
export function confirm(title: string, message: string, actionTitle: string, onConfirm: () => void) {
  if (Platform.OS === 'web') {
    if (window.confirm(`${title}\n\n${message}`)) onConfirm();
    return;
  }
  Alert.alert(title, message, [
    { text: 'Cancel', style: 'cancel' },
    { text: actionTitle, onPress: onConfirm },
  ]);
}
