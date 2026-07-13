import React, { useState, useEffect, memo, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { Montserrat_700Bold, Montserrat_800ExtraBold } from '@expo-google-fonts/montserrat';
import type { Session } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';

import Header from './src/components/Header';
import AppMenuDrawer from './src/components/AppMenuDrawer';
import NotificationSettingsModal from './src/components/NotificationSettingsModal';
import BottomNav, { type Tab } from './src/components/BottomNav';
import LoginScreen from './src/screens/LoginScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import NutritionScreen from './src/screens/NutritionScreen';
import ProgramsScreen from './src/screens/ProgramsScreen';
import WorkoutDetailScreen from './src/screens/WorkoutDetailScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import AdminScreen from './src/screens/admin/AdminScreen';
import ResetPasswordScreen from './src/screens/ResetPasswordScreen';
import { colors } from './src/theme/colors';
import { supabase } from './utils/supabase';
import { syncAllRemindersOnLaunch } from './src/services/notificationService';
import { BottomNavContext } from './src/contexts/BottomNavContext';

const MemoLoginScreen = memo(LoginScreen);

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [isReady, setIsReady] = useState(false);
  /** Tab mac dinh khi dang nhap; 'home' = DashboardScreen */
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [selectedProgramId, setSelectedProgramId] = useState<string | null>(null);
  const [selectedWorkoutDate, setSelectedWorkoutDate] = useState<Date | undefined>(undefined);
  const [onboardingComplete, setOnboardingComplete] = useState<boolean | null>(null);
  /** Tang sau khi hoan thanh buoi tap -> DashboardScreen reload du lieu */
  const [dashboardRefreshKey, setDashboardRefreshKey] = useState(0);
  const [schemaIssue, setSchemaIssue] = useState<string | null>(null);
  const [accountStateVersion, setAccountStateVersion] = useState(0);
  const [menuVisible, setMenuVisible] = useState(false);
  const [notificationSettingsVisible, setNotificationSettingsVisible] = useState(false);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminVisible, setAdminVisible] = useState(false);
  const [isBottomNavHidden, setBottomNavHidden] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsReady(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      if (event === 'PASSWORD_RECOVERY') setShowResetPassword(true);
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') {
        setOnboardingComplete(null);
        setSchemaIssue(null);
        setAccountStateVersion(v => v + 1);
      }
      if (!session) {
        setAvatarUrl(null);
        setActiveTab('home');
        setSelectedProgramId(null);
        setIsAdmin(false);
        setAdminVisible(false);
      }
    });

    const handleDeepLink = async (event: { url: string | null }) => {
      if (!event.url) return;
      if (event.url.includes('type=recovery')) {
        const params = event.url.split('#')[1] || event.url.split('?')[1];
        if (params) {
          const urlParams = new URLSearchParams(params);
          const accessToken = urlParams.get('access_token');
          const refreshToken = urlParams.get('refresh_token');
          if (accessToken && refreshToken) {
            await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
            setShowResetPassword(true);
          }
        }
      }
    };

    const linkingSub = Linking.addEventListener('url', handleDeepLink);
    Linking.getInitialURL().then(url => handleDeepLink({ url }));

    return () => {
      subscription.unsubscribe();
      linkingSub.remove();
    };
  }, []);

  useEffect(() => {
    let active = true;
    if (!session?.user.id) return () => { active = false; };
    const loadAccountState = async () => {
      const { data, error } = await supabase.from('profiles').select('avatar_url, onboarding_completed, display_name, role').eq('id', session.user.id).maybeSingle();
      if (!active) return;
      if (error) { setSchemaIssue(`Lỗi: ${error.message}`); setOnboardingComplete(false); return; }
      setSchemaIssue(null);
      setAvatarUrl(data?.avatar_url ?? null);
      setDisplayName(data?.display_name ?? null);
      setIsAdmin(data?.role === 'admin');
      setOnboardingComplete(data?.onboarding_completed === true);
      if (data?.onboarding_completed) syncAllRemindersOnLaunch(session.user.id).catch(console.error);
    };
    void loadAccountState();
    return () => { active = false; };
  }, [session?.user.id, accountStateVersion]);

  /** Goi tu WorkoutDetailScreen; trigger refresh tab Home */
  const handleWorkoutCompleted = useCallback(() => {
    setDashboardRefreshKey(prev => prev + 1);
  }, []);

  const handleSelectProgram = useCallback((id: string, date: Date) => {
    setSelectedProgramId(id);
    setSelectedWorkoutDate(date);
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

  const workoutDetail = useMemo(() => {
    if (!userId || !selectedProgramId) return null;
    return (
      <WorkoutDetailScreen
        programId={selectedProgramId}
        onClose={() => { setSelectedProgramId(null); setSelectedWorkoutDate(undefined); }}
        userId={userId}
        onCompleted={handleWorkoutCompleted}
        workoutDate={selectedWorkoutDate}
      />
    );
  }, [selectedProgramId, userId, handleWorkoutCompleted, selectedWorkoutDate]);

  /** Chon man hinh theo tab; default 'home' -> DashboardScreen */
  const renderScreen = () => {
    if (!userId) return null;
    if (selectedProgramId) return workoutDetail;
    if (adminVisible && isAdmin) return <AdminScreen onClose={() => setAdminVisible(false)} />;

    switch (activeTab) {
      case 'profile':
        return <ProfileScreen userId={userId} isAdmin={isAdmin} onAvatarUpdated={(url) => setAvatarUrl(url)} onNavigateToNutrition={() => setActiveTab('nutrition')} onOpenAdmin={() => setAdminVisible(true)} />;
      case 'nutrition':
        return <NutritionScreen userId={userId} />;
      case 'training':
        return <ProgramsScreen onSelectProgram={handleSelectProgram} refreshKey={dashboardRefreshKey} />;
      default:
        // Tab Home: tong quan, chi so, buoi tap, suc khoe, huy hieu
        return <DashboardScreen userId={userId} refreshKey={dashboardRefreshKey} onNavigateToNutrition={() => setActiveTab('nutrition')} onNavigateToTraining={() => setActiveTab('training')} />;
    }
  };

  return (
    <SafeAreaProvider>
      {!fontsLoaded || !isReady || (session && onboardingComplete === null) ? (
        <View style={styles.loadingContainer}><ActivityIndicator size="large" color={colors.primaryFixed} /></View>
      ) : !session ? (
        <MemoLoginScreen />
      ) : schemaIssue ? (
        <SafeAreaView style={styles.schemaContainer}>
          <Text style={styles.schemaTitle}>Lỗi hệ thống</Text>
          <Text style={styles.schemaMessage}>{schemaIssue}</Text>
          <TouchableOpacity style={styles.schemaRetryButton} onPress={() => setAccountStateVersion(v => v + 1)}><Text style={styles.schemaRetryText}>Thử lại</Text></TouchableOpacity>
        </SafeAreaView>
      ) : !onboardingComplete ? (
        <OnboardingScreen userId={session.user.id} onCompleted={(profile) => { setAvatarUrl(profile.avatar_url); setOnboardingComplete(true); }} />
      ) : (
        <BottomNavContext.Provider value={{ isBottomNavHidden, setBottomNavHidden }}>
          <SafeAreaView style={styles.container} edges={!!selectedProgramId ? [] : ['top']}>
            <StatusBar barStyle="light-content" backgroundColor={!!selectedProgramId ? '#000' : colors.surface} translucent={!!selectedProgramId} />
            {!selectedProgramId && !adminVisible && (
              <Header avatarUrl={avatarUrl} onAvatarPress={() => setActiveTab('profile')} onMenuPress={() => setMenuVisible(true)} />
            )}
            <View style={styles.body}>{renderScreen()}</View>
            {!selectedProgramId && !adminVisible && (
              <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
            )}
            {userId && (
              <AppMenuDrawer visible={menuVisible} activeTab={activeTab} displayName={displayName} isAdmin={isAdmin} onClose={() => setMenuVisible(false)} onNavigate={(tab) => { setMenuVisible(false); setActiveTab(tab); }} onOpenNotifications={() => { setMenuVisible(false); setNotificationSettingsVisible(true); }} onOpenAdmin={() => { setMenuVisible(false); setAdminVisible(true); }} onSignOut={() => void supabase.auth.signOut()} />
            )}
          </SafeAreaView>
        </BottomNavContext.Provider>
      )}
      {showResetPassword && <ResetPasswordScreen onClose={() => setShowResetPassword(false)} />}
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
  schemaContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20, backgroundColor: colors.surface },
  schemaTitle: { color: colors.onSurface, fontFamily: 'Montserrat-Bold', fontSize: 20 },
  schemaMessage: { color: colors.onSurfaceVariant, textAlign: 'center', marginTop: 10 },
  schemaRetryButton: { backgroundColor: colors.primaryFixed, padding: 15, borderRadius: 10, marginTop: 20 },
  schemaRetryText: { color: colors.onPrimaryFixed, fontFamily: 'Inter-Bold' },
  body: { flex: 1 },
});
