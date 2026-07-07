/**
 * Service Thông báo — nhắc tập, prefs, thông báo huy hiệu mới.
 * Lazy-load expo-notifications; trên Expo Go trả null để không crash.
 * Cờ bật/tắt lưu profiles; id lịch local lưu AsyncStorage.
 * @see docs/pdf/dac_ta_ky_thuat_de_hieu.pdf — mục 5, 10.9–10.11
 */
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { supabase } from '../../utils/supabase';
import {
  disableWaterReminders,
  enableWaterReminders,
  syncWaterRemindersOnLaunch,
} from './waterReminderService';
import type { NotificationPreferences } from '../types';

type NotificationsModule = typeof import('expo-notifications');
type PermResult = { granted?: boolean; status?: string };

const WORKOUT_REMINDER_ID_KEY = 'workout_reminder_id';
const isExpoGo =
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

let notificationsModule: NotificationsModule | null | undefined;

function isNotificationGranted(
  perm: Awaited<ReturnType<NotificationsModule['getPermissionsAsync']>>
): boolean {
  const p = perm as PermResult;
  return p.granted === true || p.status === 'granted';
}

/**
 * Lazy-load expo-notifications — an toàn trên Expo Go (trả null sớm).
 * undefined = chưa thử load; null = đã thử nhưng lỗi; module = đã cache thành công.
 */
async function getNotifications(): Promise<NotificationsModule | null> {
  if (isExpoGo) return null;

  if (notificationsModule === undefined) {
    try {
      notificationsModule = await import('expo-notifications');
      notificationsModule.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: false,
          shouldShowBanner: true,
          shouldShowList: true,
        }),
      });
    } catch (error) {
      console.warn('expo-notifications unavailable:', error);
      notificationsModule = null;
    }
  }

  return notificationsModule;
}

async function requestPermissions(): Promise<boolean> {
  const Notifications = await getNotifications();
  if (!Notifications) return false;

  const existing = await Notifications.getPermissionsAsync();
  if (isNotificationGranted(existing)) return true;

  const result = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowBadge: true, allowSound: true },
  });
  return isNotificationGranted(result);
}

function parseWakeupTime(value: string): { hour: number; minute: number } {
  const [hourText, minuteText] = value.split(':');
  const hour = Number(hourText);
  const minute = Number(minuteText);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) {
    return { hour: 6, minute: 30 };
  }
  return { hour, minute };
}

/** Hủy lịch nhắc tập cũ trước khi đặt lịch mới (tránh trùng). Id lưu AsyncStorage. */
async function cancelWorkoutReminder(): Promise<void> {
  const Notifications = await getNotifications();
  if (!Notifications) return;

  const rawId = await AsyncStorage.getItem(WORKOUT_REMINDER_ID_KEY);
  if (rawId) {
    await Notifications.cancelScheduledNotificationAsync(rawId);
    await AsyncStorage.removeItem(WORKOUT_REMINDER_ID_KEY);
  }
}

/** Lập lịch nhắc tập hàng ngày đúng giờ wakeup_time (trigger CALENDAR, repeats: true). */
async function scheduleWorkoutReminder(wakeupTime: string): Promise<void> {
  const Notifications = await getNotifications();
  if (!Notifications) return;

  await cancelWorkoutReminder();
  const { hour, minute } = parseWakeupTime(wakeupTime);

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Giờ tập luyện 💪',
      body: 'Đã đến giờ tập! Hãy bắt đầu buổi tập của bạn ngay hôm nay.',
      sound: true,
      ...(Platform.OS === 'android' ? { channelId: 'workout-reminders' } : {}),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
      hour,
      minute,
      repeats: true,
    },
  });

  await AsyncStorage.setItem(WORKOUT_REMINDER_ID_KEY, id);
}

export function isNotificationSupported(): boolean {
  return !isExpoGo;
}

/** Đọc 3 cờ nhắc nhở + wakeup_time từ bảng profiles. */
export async function getNotificationPreferences(
  userId: string,
): Promise<NotificationPreferences> {
  const { data, error } = await supabase
    .from('profiles')
    .select('water_reminder_enabled, workout_reminder_enabled, badge_notifications_enabled, wakeup_time')
    .eq('id', userId)
    .single();

  if (error) throw error;

  return {
    water_reminder_enabled: data.water_reminder_enabled ?? false,
    workout_reminder_enabled: data.workout_reminder_enabled ?? false,
    badge_notifications_enabled: data.badge_notifications_enabled ?? true,
    wakeup_time: data.wakeup_time ?? '06:30',
  };
}

/**
 * Cập nhật cài đặt nhắc nhở: lập lịch trên máy trước, sau đó ghi cờ lên profiles.
 * Không phải transaction — nếu update Supabase thất bại, lịch local và cờ server có thể lệch.
 */
export async function updateNotificationPreferences(
  userId: string,
  prefs: Partial<NotificationPreferences>,
): Promise<NotificationPreferences> {
  const current = await getNotificationPreferences(userId);
  const next: NotificationPreferences = { ...current, ...prefs };

  if (isExpoGo && prefs.workout_reminder_enabled === true) {
    throw new Error(
      'Nhắc tập luyện không khả dụng trên Expo Go. Hãy dùng development build để bật thông báo.',
    );
  }

  if (prefs.water_reminder_enabled === true) {
    await enableWaterReminders(userId);
  } else if (prefs.water_reminder_enabled === false) {
    await disableWaterReminders(userId);
  }

  if (prefs.workout_reminder_enabled === true) {
    const granted = await requestPermissions();
    if (!granted) {
      throw new Error('Cần quyền thông báo để bật nhắc tập luyện');
    }
    const Notifications = await getNotifications();
    if (!Notifications) {
      throw new Error('Không thể khởi tạo thông báo trên thiết bị này');
    }
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('workout-reminders', {
        name: 'Nhắc tập luyện',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }
    await scheduleWorkoutReminder(next.wakeup_time);
  } else if (prefs.workout_reminder_enabled === false) {
    await cancelWorkoutReminder();
  } else if (
    next.workout_reminder_enabled &&
    prefs.wakeup_time !== undefined &&
    prefs.wakeup_time !== current.wakeup_time
  ) {
    await scheduleWorkoutReminder(next.wakeup_time);
  }

  const { error } = await supabase
    .from('profiles')
    .update({
      water_reminder_enabled: next.water_reminder_enabled,
      workout_reminder_enabled: next.workout_reminder_enabled,
      badge_notifications_enabled: next.badge_notifications_enabled,
      wakeup_time: next.wakeup_time,
    })
    .eq('id', userId);

  if (error) throw error;
  return next;
}

/**
 * Khôi phục lịch nhắc khi mở app (gọi từ App.tsx sau login + onboarding).
 * Đọc cờ server, đặt lại 8 mốc nước và nhắc tập nếu user đã bật trước đó.
 */
export async function syncAllRemindersOnLaunch(userId: string): Promise<void> {
  await syncWaterRemindersOnLaunch(userId);

  if (isExpoGo) return;

  const prefs = await getNotificationPreferences(userId);
  if (prefs.workout_reminder_enabled) {
    const granted = await requestPermissions();
    if (granted) {
      await scheduleWorkoutReminder(prefs.wakeup_time);
    }
  }
}

/** Local notification tức thời khi mở khóa huy hiệu mới (chưa tự xin quyền OS). */
export async function notifyBadgeEarned(title: string, body: string): Promise<void> {
  const Notifications = await getNotifications();
  if (!Notifications) return;

  await Notifications.scheduleNotificationAsync({
    content: { title, body, sound: true },
    trigger: null,
  });
}
