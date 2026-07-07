/**
 * Service nhắc uống nước — 8 mốc/ngày: 7h, 9h, 11h, 13h, 15h, 17h, 19h, 21h.
 * Id lịch lưu AsyncStorage (water_reminder_ids); cờ bật/tắt lưu profiles.
 * @see docs/pdf/dac_ta_ky_thuat_de_hieu.pdf — mục 5.1, 5.3
 */
import { Alert, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { supabase } from '../../utils/supabase';

type NotificationsModule = typeof import('expo-notifications');
type PermResult = { granted?: boolean; status?: string };

const WATER_REMINDER_HOURS = [7, 9, 11, 13, 15, 17, 19, 21];
const WATER_REMINDER_IDS_KEY = 'water_reminder_ids';

const isExpoGo =
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

let notificationsModule: NotificationsModule | null | undefined;
let inAppInterval: ReturnType<typeof setInterval> | null = null;
let lastInAppReminderKey: string | null = null;
let inAppRemindersActive = false;

function isNotificationGranted(
  perm: Awaited<ReturnType<NotificationsModule['getPermissionsAsync']>>
): boolean {
  const p = perm as PermResult;
  return p.granted === true || p.status === 'granted';
}

export function isInAppWaterReminderMode(): boolean {
  return isExpoGo && inAppRemindersActive;
}

export function isExpoGoEnvironment(): boolean {
  return isExpoGo;
}

function getCurrentReminderKey(): string | null {
  const now = new Date();
  const hour = now.getHours();
  if (!WATER_REMINDER_HOURS.includes(hour)) return null;
  const date = now.toISOString().split('T')[0];
  return `${date}-${hour}`;
}

function showWaterReminderAlert(): void {
  Alert.alert(
    'Nhắc uống nước 💧',
    'Đã đến giờ uống nước! Hãy bổ sung nước để duy trì sức khỏe.',
  );
}

function checkInAppWaterReminder(): void {
  const key = getCurrentReminderKey();
  if (!key || key === lastInAppReminderKey) return;
  lastInAppReminderKey = key;
  showWaterReminderAlert();
}

function startInAppWaterReminders(): void {
  stopInAppWaterReminders();
  inAppRemindersActive = true;
  checkInAppWaterReminder();
  inAppInterval = setInterval(checkInAppWaterReminder, 60 * 1000);
}

function stopInAppWaterReminders(): void {
  inAppRemindersActive = false;
  lastInAppReminderKey = null;
  if (inAppInterval) {
    clearInterval(inAppInterval);
    inAppInterval = null;
  }
}

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
    ios: {
      allowAlert: true,
      allowBadge: true,
      allowSound: true,
    },
  });
  return isNotificationGranted(result);
}

async function cancelWaterNotifications(): Promise<void> {
  stopInAppWaterReminders();

  const Notifications = await getNotifications();
  if (!Notifications) return;

  const rawIds = await AsyncStorage.getItem(WATER_REMINDER_IDS_KEY);
  const ids = rawIds ? (JSON.parse(rawIds) as string[]) : [];
  if (ids.length > 0) {
    await Promise.all(ids.map((id) => Notifications.cancelScheduledNotificationAsync(id)));
  }
  await AsyncStorage.removeItem(WATER_REMINDER_IDS_KEY);
}

async function scheduleWaterNotifications(): Promise<void> {
  const Notifications = await getNotifications();
  if (!Notifications) return;

  await cancelWaterNotifications();
  const ids: string[] = [];

  for (const hour of WATER_REMINDER_HOURS) {
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Nhắc uống nước 💧',
        body: 'Đã đến giờ uống nước! Hãy bổ sung nước để duy trì sức khỏe.',
        sound: true,
        ...(Platform.OS === 'android' ? { channelId: 'water-reminders' } : {}),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
        hour,
        minute: 0,
        repeats: true,
      },
    });
    ids.push(id);
  }

  await AsyncStorage.setItem(WATER_REMINDER_IDS_KEY, JSON.stringify(ids));
}

/** Bật nhắc nước: xin quyền OS → lập 8 thông báo lặp ngày → ghi water_reminder_enabled = true. */
export async function enableWaterReminders(userId: string): Promise<void> {
  if (isExpoGo) {
    startInAppWaterReminders();
    const { error } = await supabase
      .from('profiles')
      .update({ water_reminder_enabled: true })
      .eq('id', userId);
    if (error) throw error;
    return;
  }

  const granted = await requestPermissions();
  if (!granted) {
    throw new Error('Cần quyền thông báo để bật nhắc uống nước');
  }

  const Notifications = await getNotifications();
  if (!Notifications) {
    throw new Error('Không thể khởi tạo thông báo trên thiết bị này');
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('water-reminders', {
      name: 'Nhắc uống nước',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  await scheduleWaterNotifications();

  const { error } = await supabase
    .from('profiles')
    .update({ water_reminder_enabled: true })
    .eq('id', userId);
  if (error) throw error;
}

/** Tắt nhắc nước: hủy tất cả id đã lưu → ghi water_reminder_enabled = false. */
export async function disableWaterReminders(userId: string): Promise<void> {
  await cancelWaterNotifications();

  const { error } = await supabase
    .from('profiles')
    .update({ water_reminder_enabled: false })
    .eq('id', userId);
  if (error) throw error;
}

/** Khôi phục 8 mốc nước khi mở app nếu profiles.water_reminder_enabled = true. */
export async function syncWaterRemindersOnLaunch(userId: string): Promise<void> {
  const { data } = await supabase
    .from('profiles')
    .select('water_reminder_enabled')
    .eq('id', userId)
    .single();

  if (!data?.water_reminder_enabled) return;

  if (isExpoGo) {
    startInAppWaterReminders();
    return;
  }

  const granted = await requestPermissions();
  if (granted) await scheduleWaterNotifications();
}
