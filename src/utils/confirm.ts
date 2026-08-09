import { Alert, Platform } from 'react-native';

/**
 * Cross-platform destructive confirmation.
 *
 * Native shows the system Alert dialog. Web uses `window.confirm`, because
 * react-native-web's `Alert.alert` is a no-op — the Alert-only pattern would
 * silently do nothing in the browser.
 */
export function confirmDestructive(
  title: string,
  message: string,
  onConfirm: () => void,
): void {
  if (Platform.OS === 'web') {
    if (window.confirm(`${title}\n\n${message}`)) onConfirm();
    return;
  }
  Alert.alert(title, message, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: onConfirm },
  ]);
}
