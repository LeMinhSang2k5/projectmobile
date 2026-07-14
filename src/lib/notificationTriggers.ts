import { Platform } from 'react-native';

type NotificationsModule = typeof import('expo-notifications');
type DailyTriggerInput = import('expo-notifications').DailyTriggerInput;

/** Trigger lặp hàng ngày — dùng DAILY (Android không hỗ trợ CALENDAR). */
export function buildDailyTrigger(
  Notifications: NotificationsModule,
  hour: number,
  minute: number,
  channelId?: string,
): DailyTriggerInput {
  return {
    type: Notifications.SchedulableTriggerInputTypes.DAILY,
    hour,
    minute,
    ...(Platform.OS === 'android' && channelId ? { channelId } : {}),
  };
}
