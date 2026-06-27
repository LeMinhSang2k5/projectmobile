import React, { useState, useEffect, memo, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, StatusBar } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { Montserrat_700Bold, Montserrat_800ExtraBold } from '@expo-google-fonts/montserrat';
import type { Session } from '@supabase/supabase-js';

import Header from './src/components/Header';
import WorkoutCard from './src/components/WorkoutCard';
import StatsGrid from './src/components/StatsGrid';
import BottomNav, { type Tab } from './src/components/BottomNav';
import LoginScreen from './src/screens/LoginScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import NutritionScreen from './src/screens/NutritionScreen';
import { colors } from './src/theme/colors';
import { supabase } from './utils/supabase';
import { syncWaterRemindersOnLaunch } from './src/services/waterReminderService';

const MemoLoginScreen = memo(LoginScreen);

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsReady(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (!session) setAvatarUrl(null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session?.user.id) {
      supabase
        .from('profiles')
        .select('avatar_url')
        .eq('id', session.user.id)
        .single()
        .then(({ data }) => {
          if (data?.avatar_url) setAvatarUrl(data.avatar_url);
        });
      syncWaterRemindersOnLaunch(session.user.id).catch(console.error);
    }
  }, [session?.user.id]);

  const handleAvatarUpdated = useCallback((url: string) => {
    setAvatarUrl(url);
  }, []);

  const handleNavigateToNutrition = useCallback(() => {
    setActiveTab('nutrition');
  }, []);

  const [fontsLoaded] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-Medium': Inter_500Medium,
    'Inter-SemiBold': Inter_600SemiBold,
    'Inter-Bold': Inter_700Bold,
    'Montserrat-Bold': Montserrat_700Bold,
    'Montserrat-ExtraBold': Montserrat_800ExtraBold,
  });

  const userId = session?.user?.id ?? null;

  const renderScreen = () => {
    if (!userId) return null;
    switch (activeTab) {
      case 'profile':
        return (
          <ProfileScreen
            userId={userId}
            onAvatarUpdated={handleAvatarUpdated}
            onNavigateToNutrition={handleNavigateToNutrition}
          />
        );
      case 'nutrition':
        return <NutritionScreen userId={userId} />;
      case 'training':
        return (
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <View style={styles.welcomeSection}>
              <Text style={styles.welcomeTitle}>Phòng Tập</Text>
              <Text style={styles.welcomeSub}>Thư viện bài tập sẽ được cập nhật sớm.</Text>
            </View>
            <WorkoutCard />
          </ScrollView>
        );
      default:
        return (
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <View style={styles.welcomeSection}>
              <Text style={styles.welcomeTitle}>Chào bạn! 👋</Text>
              <Text style={styles.welcomeSub}>Sẵn sàng để vượt qua giới hạn hôm nay chứ?</Text>
            </View>
            <WorkoutCard />
            <StatsGrid userId={userId} onNavigateToNutrition={handleNavigateToNutrition} />
          </ScrollView>
        );
    }
  };

  return (
    <SafeAreaProvider>
      {!fontsLoaded || !isReady ? null : !session ? (
        <>
          <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
          <MemoLoginScreen />
        </>
      ) : (
        <SafeAreaView style={styles.container} edges={['top']}>
          <StatusBar barStyle="light-content" backgroundColor={colors.surface} translucent={false} />
          <Header
            avatarUrl={avatarUrl}
            onAvatarPress={() => setActiveTab('profile')}
          />
          <View style={styles.body}>
            {userId ? renderScreen() : null}
          </View>
          <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
        </SafeAreaView>
      )}
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  body: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 100,
  },
  welcomeSection: {
    marginBottom: 24,
  },
  welcomeTitle: {
    fontFamily: 'Montserrat-Bold',
    fontSize: 28,
    color: colors.onSurface,
    marginBottom: 4,
  },
  welcomeSub: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: colors.onSurfaceVariant,
  },
});
