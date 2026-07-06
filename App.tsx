import React, { useState, useEffect, memo, useCallback } from 'react';
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
import { colors } from './src/theme/colors';
import { supabase } from './utils/supabase';
import { syncAllRemindersOnLaunch } from './src/services/notificationService';
import { BottomNavContext } from './src/contexts/BottomNavContext';

const MemoLoginScreen = memo(LoginScreen);

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [selectedProgramId, setSelectedProgramId] = useState<string | null>(null);
  const [onboardingComplete, setOnboardingComplete] = useState<boolean | null>(null);
  const [dashboardRefreshKey, setDashboardRefreshKey] = useState(0);
  const [schemaIssue, setSchemaIssue] = useState<string | null>(null);
  const [accountStateVersion, setAccountStateVersion] = useState(0);
  const [menuVisible, setMenuVisible] = useState(false);
  const [notificationSettingsVisible, setNotificationSettingsVisible] = useState(false);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminVisible, setAdminVisible] = useState(false);
  const [isBottomNavHidden, setBottomNavHidden] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsReady(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') {
        setOnboardingComplete(null);
        setSchemaIssue(null);
      }
      if (!session) {
        setAvatarUrl(null);
        setActiveTab('home');
        setSelectedProgramId(null);
        setIsAdmin(false);
        setAdminVisible(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    let active = true;
    if (!session?.user.id) return () => { active = false; };

    const loadAccountState = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('avatar_url, onboarding_completed, display_name, role')
        .eq('id', session.user.id)
        .maybeSingle();
      if (!active) return;

      if (error) {
        const isMissingMigration = error.code === '42703';
        setSchemaIssue(
          isMissingMigration
            ? 'Supabase chưa có cột profiles.onboarding_completed. Hãy áp dụng migration mới rồi nhấn “Thử lại”.'
            : `Không thể kiểm tra hồ sơ: ${error.message}`,
        );
        setOnboardingComplete(false);
        return;
      }
      setSchemaIssue(null);
      setAvatarUrl(data?.avatar_url ?? null);
      setDisplayName(data?.display_name ?? null);
      setIsAdmin(data?.role === 'admin');
      setOnboardingComplete(data?.onboarding_completed === true);
      if (data?.onboarding_completed) {
        syncAllRemindersOnLaunch(session.user.id).catch(console.error);
      }
    };

    void loadAccountState();
    return () => { active = false; };
  }, [session?.user.id, accountStateVersion]);

  const handleAvatarUpdated = useCallback((url: string) => {
    setAvatarUrl(url);
  }, []);

  const handleNavigateToNutrition = useCallback(() => {
    setActiveTab('nutrition');
  }, []);

  const handleNavigateToTraining = useCallback(() => {
    setActiveTab('training');
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

    if (selectedProgramId) {
      return (
        <WorkoutDetailScreen
          programId={selectedProgramId}
          onClose={() => setSelectedProgramId(null)}
          userId={userId}
          onCompleted={() => setDashboardRefreshKey((value) => value + 1)}
        />
      );
    }

    if (adminVisible && isAdmin) {
      return <AdminScreen onClose={() => setAdminVisible(false)} />;
    }

    switch (activeTab) {
      case 'profile':
        return (
          <ProfileScreen
            userId={userId}
            isAdmin={isAdmin}
            onAvatarUpdated={handleAvatarUpdated}
            onNavigateToNutrition={handleNavigateToNutrition}
            onOpenAdmin={() => setAdminVisible(true)}
          />
        );
      case 'nutrition':
        return <NutritionScreen userId={userId} />;
      case 'training':
        return (
          <ProgramsScreen onSelectProgram={(id) => setSelectedProgramId(id)} />
        );
      default:
        return (
          <DashboardScreen
            userId={userId}
            refreshKey={dashboardRefreshKey}
            onNavigateToNutrition={handleNavigateToNutrition}
            onNavigateToTraining={handleNavigateToTraining}
          />
        );
    }
  };

  return (
    <SafeAreaProvider>
      {!fontsLoaded || !isReady || (session && onboardingComplete === null) ? (
        <View style={styles.loadingContainer}>
          <StatusBar barStyle="light-content" backgroundColor={colors.surface} />
          <ActivityIndicator size="large" color={colors.primaryFixed} />
        </View>
      ) : !session ? (
        <>
          <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
          <MemoLoginScreen />
        </>
      ) : schemaIssue ? (
        <SafeAreaView style={styles.schemaContainer} edges={['top', 'bottom']}>
          <StatusBar barStyle="light-content" backgroundColor={colors.surface} />
          <View style={styles.schemaIcon}>
            <Text style={styles.schemaIconText}>!</Text>
          </View>
          <Text style={styles.schemaTitle}>Cơ sở dữ liệu cần cập nhật</Text>
          <Text style={styles.schemaMessage} selectable>{schemaIssue}</Text>
          <TouchableOpacity
            style={styles.schemaRetryButton}
            onPress={() => {
              setSchemaIssue(null);
              setOnboardingComplete(null);
              setAccountStateVersion((value) => value + 1);
            }}
          >
            <Text style={styles.schemaRetryText}>Thử lại</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.schemaSignOutButton} onPress={() => supabase.auth.signOut()}>
            <Text style={styles.schemaSignOutText}>Đăng xuất</Text>
          </TouchableOpacity>
        </SafeAreaView>
      ) : !onboardingComplete ? (
        <OnboardingScreen
          userId={session.user.id}
          onCompleted={(profile) => {
            setAvatarUrl(profile.avatar_url);
            setOnboardingComplete(true);
          }}
        />
      ) : (
        <BottomNavContext.Provider value={{ isBottomNavHidden, setBottomNavHidden }}>
          <SafeAreaView style={styles.container} edges={[]}>
          <StatusBar barStyle="light-content" backgroundColor={colors.surface} translucent={false} />
          <Header
            avatarUrl={avatarUrl}
            onAvatarPress={() => {
              setMenuVisible(false);
              setActiveTab('profile');
            }}
            onMenuPress={() => setMenuVisible(true)}
          />
          <View style={styles.body}>
            {userId ? renderScreen() : null}
          </View>
          {!selectedProgramId && !adminVisible && (
            <BottomNav
              activeTab={activeTab}
              onTabChange={(tab) => {
                setMenuVisible(false);
                setActiveTab(tab);
              }}
            />
          )}
          {userId ? (
            <>
              <AppMenuDrawer
                visible={menuVisible}
                activeTab={activeTab}
                displayName={displayName}
                isAdmin={isAdmin}
                onClose={() => setMenuVisible(false)}
                onNavigate={setActiveTab}
                onOpenNotifications={() => setNotificationSettingsVisible(true)}
                onOpenAdmin={() => {
                  setMenuVisible(false);
                  setAdminVisible(true);
                }}
                onSignOut={() => void supabase.auth.signOut()}
              />
              <NotificationSettingsModal
                visible={notificationSettingsVisible}
                userId={userId}
                onClose={() => setNotificationSettingsVisible(false)}
              />
            </>
          ) : null}
        </SafeAreaView>
        </BottomNavContext.Provider>
      )}
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  schemaContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    backgroundColor: colors.surface,
  },
  schemaIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 107, 107, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.35)',
  },
  schemaIconText: {
    color: '#ff6b6b',
    fontFamily: 'Montserrat-Bold',
    fontSize: 34,
  },
  schemaTitle: {
    color: colors.onSurface,
    fontFamily: 'Montserrat-Bold',
    fontSize: 22,
    textAlign: 'center',
    marginTop: 20,
  },
  schemaMessage: {
    color: colors.onSurfaceVariant,
    fontFamily: 'Inter-Regular',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginTop: 10,
  },
  schemaRetryButton: {
    minWidth: 180,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: colors.primaryFixed,
    marginTop: 24,
  },
  schemaRetryText: {
    color: colors.onPrimaryFixed,
    fontFamily: 'Inter-Bold',
    fontSize: 16,
  },
  schemaSignOutButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginTop: 6,
  },
  schemaSignOutText: {
    color: colors.onSurfaceVariant,
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
  },
  body: {
    flex: 1,
  },
});
