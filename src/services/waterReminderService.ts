import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../utils/supabase';

type PermResult = { granted?: boolean; status?: string };

function isNotificationGranted(perm: Notifications.NotificationPermissionsStatus): boolean {
  const p = perm as PermResult;
  return p.granted === true || p.status === 'granted';
}

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const WATER_REMINDER_HOURS = [7, 9, 11, 13, 15, 17, 19, 21];
const WATER_REMINDER_IDS_KEY = 'water_reminder_ids';

async function requestPermissions(): Promise<boolean> {
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
  const rawIds = await AsyncStorage.getItem(WATER_REMINDER_IDS_KEY);
  const ids = rawIds ? (JSON.parse(rawIds) as string[]) : [];
  if (ids.length > 0) {
    await Promise.all(ids.map((id) => Notifications.cancelScheduledNotificationAsync(id)));
  }
  await AsyncStorage.removeItem(WATER_REMINDER_IDS_KEY);
}

async function scheduleWaterNotifications(): Promise<void> {
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

export async function enableWaterReminders(userId: string): Promise<void> {
  const granted = await requestPermissions();
  if (!granted) {
    throw new Error('Cần quyền thông báo để bật nhắc uống nước');
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

export async function disableWaterReminders(userId: string): Promise<void> {
  await cancelWaterNotifications();

  const { error } = await supabase
    .from('profiles')
    .update({ water_reminder_enabled: false })
    .eq('id', userId);
  if (error) throw error;
}

export async function syncWaterRemindersOnLaunch(userId: string): Promise<void> {
  const { data } = await supabase
    .from('profiles')
    .select('water_reminder_enabled')
    .eq('id', userId)
    .single();

  if (data?.water_reminder_enabled) {
    const granted = await requestPermissions();
    if (granted) await scheduleWaterNotifications();
  }
}
