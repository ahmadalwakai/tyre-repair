import { Alert } from 'react-native';

/**
 * Item 10 — Offline guard for sensitive actions.
 *
 * Wrap any destructive / outbound action (send payment link, send SMS,
 * mark dispatched, write decisions) with `runIfOnline`. When offline,
 * shows a clear blocking alert and skips the action.
 */
export function runIfOnline<TArgs extends unknown[], TResult>(
  online: boolean,
  fn: (...args: TArgs) => Promise<TResult>,
): (...args: TArgs) => Promise<TResult | null> {
  return async (...args: TArgs): Promise<TResult | null> => {
    if (!online) {
      Alert.alert(
        'You are offline',
        'This action sends data to the server and is disabled until the device reconnects.',
      );
      return null;
    }
    return fn(...args);
  };
}
