import React, { useState, memo, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  Platform,
  Alert,
  ActivityIndicator,
  ScrollView,
  StatusBar,
  KeyboardAvoidingView,
  TextInput as TextInputType,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import Svg, { Path } from 'react-native-svg';
import { colors } from '../theme/colors';
import { supabase } from '../../utils/supabase';
import ForgotPasswordScreen from './ForgotPasswordScreen';

// ─────────────────────────────────────────────
// Background tĩnh - KHÔNG BAO GIỜ re-render
// ─────────────────────────────────────────────
const StaticBackground = memo(() => (
  <>
    <Image
      source={require('../../public/backgorund_login.jpg')}
      style={StyleSheet.absoluteFillObject}
      resizeMode="cover"
    />
    <View style={styles.overlay} />
    <View style={styles.neonGlowTopRight} pointerEvents="none" />
    <View style={styles.neonGlowBottomLeft} pointerEvents="none" />
  </>
));

// ─────────────────────────────────────────────
// EmailInput
// ─────────────────────────────────────────────
type EmailInputProps = {
  value: string;
  onChangeText: (v: string) => void;
  onSubmitEditing: () => void;
  focused: boolean;
  onFocus: () => void;
  onBlur: () => void;
};
const EmailInput = memo(({ value, onChangeText, onSubmitEditing, focused, onFocus, onBlur }: EmailInputProps) => (
  <View style={styles.inputGroup}>
    <Text style={styles.inputLabel}>Email</Text>
    <View style={[styles.inputWrapper, focused && styles.inputWrapperFocused]}>
      <MaterialIcons
        name="mail" size={20}
        color={focused ? colors.primaryFixed : colors.onSurfaceVariant}
        style={styles.inputIcon}
      />
      <TextInput
        style={styles.input}
        placeholder="nhutdeptrai@gmail.com"
        placeholderTextColor="rgba(196, 201, 174, 0.5)"
        value={value}
        onChangeText={onChangeText}
        onFocus={onFocus}
        onBlur={onBlur}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="next"
        onSubmitEditing={onSubmitEditing}
        blurOnSubmit={false}
        underlineColorAndroid="transparent"
      />
    </View>
  </View>
));

// ─────────────────────────────────────────────
// PasswordInput
// ─────────────────────────────────────────────
type PasswordInputProps = {
  label?: string;
  value: string;
  onChangeText: (v: string) => void;
  onSubmitEditing: () => void;
  inputRef: React.RefObject<TextInputType | null>;
  focused: boolean;
  onFocus: () => void;
  onBlur: () => void;
};
const PasswordInput = memo(({ label = 'Mật khẩu', value, onChangeText, onSubmitEditing, inputRef, focused, onFocus, onBlur }: PasswordInputProps) => {
  const [show, setShow] = useState(false);
  return (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>{label}</Text>
      <View style={[styles.inputWrapper, focused && styles.inputWrapperFocused]}>
        <MaterialIcons
          name="lock" size={20}
          color={focused ? colors.primaryFixed : colors.onSurfaceVariant}
          style={styles.inputIcon}
        />
        <TextInput
          ref={inputRef}
          style={styles.input}
          placeholder="••••••••"
          placeholderTextColor="rgba(196, 201, 174, 0.5)"
          value={value}
          onChangeText={onChangeText}
          onFocus={onFocus}
          onBlur={onBlur}
          secureTextEntry={!show}
          autoCorrect={false}
          autoCapitalize="none"
          textContentType="password"
          returnKeyType="done"
          onSubmitEditing={onSubmitEditing}
          underlineColorAndroid="transparent"
        />
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => {
            setShow(prev => !prev);
            setTimeout(() => { inputRef.current?.focus(); }, 50);
          }}
          style={styles.eyeIcon}
        >
          <MaterialIcons
            name={show ? 'visibility' : 'visibility-off'}
            size={20}
            color={colors.onSurfaceVariant}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
});

// ─────────────────────────────────────────────
// Main LoginScreen
// ─────────────────────────────────────────────
export default function LoginScreen() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [confirmPasswordFocused, setConfirmPasswordFocused] = useState(false);
  const passwordInputRef = useRef<TextInputType>(null);
  const confirmPasswordInputRef = useRef<TextInputType>(null);

  const handleAuth = useCallback(async () => {
    const finalEmail = email.trim();
    const finalPassword = password;

    if (!finalEmail || !finalPassword) {
      Alert.alert('Lỗi', 'Vui lòng nhập đầy đủ Email và Mật khẩu.');
      return;
    }
    if (!/\S+@\S+\.\S+/.test(finalEmail)) {
      Alert.alert('Lỗi', 'Địa chỉ email không hợp lệ.');
      return;
    }
    if (!isSignUp && finalPassword.length < 6) {
      Alert.alert('Lỗi', 'Mật khẩu không hợp lệ.');
      return;
    }
    if (isSignUp) {
      const strongPassword =
        finalPassword.length >= 8 &&
        /[A-Z]/.test(finalPassword) &&
        /[0-9]/.test(finalPassword) &&
        /[^A-Za-z0-9]/.test(finalPassword);
      if (!strongPassword) {
        Alert.alert('Mật khẩu chưa đủ mạnh', 'Cần ít nhất 8 ký tự, gồm chữ hoa, số và ký tự đặc biệt.');
        return;
      }
      if (finalPassword !== confirmPassword) {
        Alert.alert('Lỗi', 'Mật khẩu xác nhận chưa khớp.');
        return;
      }
    }

    setLoading(true);
    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email: finalEmail, password: finalPassword });
        if (error) {
          const message =
            error.message === 'Invalid API key'
              ? 'API key Supabase không hợp lệ. Vào Dashboard > Project Settings > API, copy lại key đúng project rồi cập nhật file .env và chạy: npm run check:supabase'
              : error.message;
          Alert.alert('Đăng ký thất bại', message);
        }
        else Alert.alert('Thành công', 'Kiểm tra email để xác nhận tài khoản.', [
          { text: 'OK', onPress: () => setIsSignUp(false) },
        ]);
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: finalEmail, password: finalPassword });
        if (error) Alert.alert('Đăng nhập thất bại', error.message);
      }
    } catch {
      Alert.alert('Lỗi kết nối', 'Không thể kết nối máy chủ. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  }, [isSignUp, email, password, confirmPassword]);

  const focusPassword = useCallback(() => {
    passwordInputRef.current?.focus();
  }, []);

  const focusConfirmPassword = useCallback(() => {
    confirmPasswordInputRef.current?.focus();
  }, []);

  const handleForgotPassword = useCallback(async () => {
    const finalEmail = email.trim();
    if (!/\S+@\S+\.\S+/.test(finalEmail)) {
      Alert.alert('Nhập email', 'Hãy nhập email tài khoản trước khi đặt lại mật khẩu.');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(finalEmail);
    setLoading(false);
    if (error) Alert.alert('Không thể gửi email', error.message);
    else Alert.alert('Đã gửi email', 'Hãy mở email để tiếp tục đặt lại mật khẩu.');
  }, [email]);

  const handleEmailChange = useCallback((v: string) => setEmail(v), []);
  const handlePasswordChange = useCallback((v: string) => setPassword(v), []);
  const handleConfirmPasswordChange = useCallback((v: string) => setConfirmPassword(v), []);

  const handleEmailFocus = useCallback(() => setEmailFocused(true), []);
  const handleEmailBlur = useCallback(() => setEmailFocused(false), []);
  const handlePasswordFocus = useCallback(() => setPasswordFocused(true), []);
  const handlePasswordBlur = useCallback(() => setPasswordFocused(false), []);
  const handleConfirmPasswordFocus = useCallback(() => setConfirmPasswordFocused(true), []);
  const handleConfirmPasswordBlur = useCallback(() => setConfirmPasswordFocused(false), []);

  if (isForgotPassword) {
    return <ForgotPasswordScreen onBackToLogin={() => setIsForgotPassword(false)} />;
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Background tĩnh, không bao giờ re-render */}
      <StaticBackground />

      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="none"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo */}
          <View style={styles.header}>
            <Text style={styles.logoText}>ELITE FIT</Text>
            <Text style={styles.subtitle}>Khai Phá Tiềm Năng</Text>
          </View>

          {/* Card */}
          <View style={styles.glassPanel}>
            <View style={styles.welcomeContainer}>
              <Text style={styles.welcomeTitle}>
                {isSignUp ? 'Tạo Tài Khoản' : 'Chào mừng trở lại'}
              </Text>
              <Text style={styles.welcomeSub}>
                {isSignUp
                  ? 'Bắt đầu hành trình của bạn ngay hôm nay.'
                  : 'Nhập thông tin đăng nhập để tiếp tục hành trình.'}
              </Text>
            </View>

            {/* Inputs - mỗi cái là component riêng, tự quản lý focus */}
            <EmailInput
              value={email}
              onChangeText={handleEmailChange}
              onSubmitEditing={focusPassword}
              focused={emailFocused}
              onFocus={handleEmailFocus}
              onBlur={handleEmailBlur}
            />
            <PasswordInput
              value={password}
              onChangeText={handlePasswordChange}
              onSubmitEditing={isSignUp ? focusConfirmPassword : handleAuth}
              inputRef={passwordInputRef}
              focused={passwordFocused}
              onFocus={handlePasswordFocus}
              onBlur={handlePasswordBlur}
            />
            {isSignUp && (
              <PasswordInput
                label="Xác nhận mật khẩu"
                value={confirmPassword}
                onChangeText={handleConfirmPasswordChange}
                onSubmitEditing={handleAuth}
                inputRef={confirmPasswordInputRef}
                focused={confirmPasswordFocused}
                onFocus={handleConfirmPasswordFocus}
                onBlur={handleConfirmPasswordBlur}
              />
            )}

            {!isSignUp && (
              <TouchableOpacity style={styles.forgotPassword} onPress={() => setIsForgotPassword(true)} disabled={loading}>
                <Text style={styles.forgotPasswordText}>Quên mật khẩu?</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.loginBtn, isSignUp && { marginTop: 16 }]}
              activeOpacity={0.8}
              onPress={handleAuth}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator color={colors.onPrimaryFixed} />
                : <Text style={styles.loginBtnText}>{isSignUp ? 'ĐĂNG KÝ NGAY' : 'ĐĂNG NHẬP NGAY'}</Text>
              }
            </TouchableOpacity>

            <View style={styles.dividerContainer}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>HOẶC KẾT NỐI VỚI</Text>
              <View style={styles.dividerLine} />
            </View>

            <View style={styles.socialContainer}>
              <TouchableOpacity style={styles.socialBtn} activeOpacity={0.7}
                onPress={() => Alert.alert('Thông báo', 'Tính năng đang phát triển')}>
                <Svg width={20} height={20} viewBox="0 0 24 24">
                  <Path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill={colors.onSurface} />
                  <Path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill={colors.onSurface} />
                  <Path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill={colors.onSurface} />
                  <Path d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 12-4.53z" fill={colors.onSurface} />
                </Svg>
                <Text style={styles.socialBtnText}>Google</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.socialBtn} activeOpacity={0.7}
                onPress={() => Alert.alert('Thông báo', 'Tính năng đang phát triển')}>
                <Svg width={20} height={20} viewBox="0 0 24 24" fill={colors.onSurface}>
                  <Path d="M17.05 20.28c-.96.95-2.01 1.94-3.26 1.96-1.25.03-1.63-.73-3.08-.73-1.45 0-1.89.71-3.08.76-1.22.05-2.43-1.12-3.39-2.06-1.98-1.93-3.49-5.46-1.43-9.03 1.02-1.78 2.85-2.91 4.84-2.93 1.51-.02 2.94 1.03 3.86 1.03.92 0 2.65-1.27 4.45-1.08 1.4.06 2.65.65 3.51 1.74-.11.07-2.11 1.23-2.09 3.65.03 2.85 2.45 3.82 2.48 3.84-.02.05-.39 1.34-1.31 2.27zM14.28 4.3c-.8-.97-1.35-2.32-1.2-3.66 1.15.05 2.54.77 3.37 1.74.74.87 1.39 2.25 1.21 3.55-1.28.1-2.58-.66-3.38-1.63z" />
                </Svg>
                <Text style={styles.socialBtnText}>Apple</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              {isSignUp ? 'Đã có tài khoản? ' : 'Chưa có tài khoản? '}
            </Text>
            <TouchableOpacity onPress={() => setIsSignUp(s => !s)}>
              <Text style={styles.footerLink}>{isSignUp ? 'Đăng Nhập' : 'Đăng Ký'}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

// ─────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.55)' },
  scrollView: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) + 24 : 60,
    paddingBottom: 40,
  },
  header: { alignItems: 'center', marginBottom: 40 },
  logoText: {
    fontFamily: 'Montserrat-ExtraBold', fontSize: 48,
    color: colors.primaryFixed, letterSpacing: -1,
    textShadowColor: 'rgba(0,0,0,0.75)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 10,
  },
  subtitle: {
    fontFamily: 'Inter-SemiBold', fontSize: 14,
    color: colors.onSurfaceVariant, textTransform: 'uppercase',
    letterSpacing: 3, marginTop: 4,
  },
  glassPanel: {
    backgroundColor: 'rgba(30,32,32,0.78)',
    borderColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1, borderRadius: 20, padding: 24,
  },
  welcomeContainer: { marginBottom: 20 },
  welcomeTitle: { fontFamily: 'Montserrat-Bold', fontSize: 24, color: colors.onSurface, marginBottom: 4 },
  welcomeSub: { fontFamily: 'Inter-Regular', fontSize: 14, color: colors.onSurfaceVariant },
  inputGroup: { marginBottom: 14 },
  inputLabel: {
    fontFamily: 'Inter-Medium', fontSize: 12,
    color: colors.onSurfaceVariant, marginLeft: 4, marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(51,53,53,0.5)',
    borderWidth: 1, borderColor: 'rgba(68,73,52,0.4)',
    borderRadius: 12, height: 50,
    overflow: 'hidden',
  },
  inputWrapperFocused: {
    // Chỉ đổi màu border, KHÔNG dùng elevation/shadow để tránh dismiss keyboard trên Android
    borderColor: colors.primaryFixed,
  },
  keyboardAvoid: { flex: 1 },
  inputIcon: { marginLeft: 14, marginRight: 8 },
  input: {
    flex: 1, fontFamily: 'Inter-Regular', fontSize: 16,
    color: colors.onSurface, height: '100%', paddingVertical: 0,
  },
  eyeIcon: { padding: 12 },
  forgotPassword: { alignSelf: 'flex-end', marginBottom: 16, marginTop: 4 },
  forgotPasswordText: { fontFamily: 'Inter-Medium', fontSize: 12, color: colors.primaryFixed },
  loginBtn: {
    backgroundColor: colors.primaryFixed, borderRadius: 12,
    height: 54, justifyContent: 'center', alignItems: 'center',
    shadowColor: colors.primaryFixed,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35, shadowRadius: 20, elevation: 6, marginTop: 8,
  },
  loginBtnText: {
    fontFamily: 'Inter-Bold', fontSize: 14, color: colors.onPrimaryFixed,
    textTransform: 'uppercase', letterSpacing: 1.5,
  },
  dividerContainer: {
    flexDirection: 'row', alignItems: 'center', marginTop: 24, marginBottom: 20,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: 'rgba(68,73,52,0.3)' },
  dividerText: {
    fontFamily: 'Inter-Medium', fontSize: 11,
    color: colors.onSurfaceVariant, marginHorizontal: 10,
  },
  socialContainer: { flexDirection: 'row', gap: 12 },
  socialBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(40,42,43,0.8)',
    borderColor: 'rgba(68,73,52,0.3)', borderWidth: 1,
    borderRadius: 12, height: 48, gap: 8,
  },
  socialBtnText: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: colors.onSurface },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 32, paddingBottom: 8 },
  footerText: { fontFamily: 'Inter-Regular', fontSize: 15, color: colors.onSurfaceVariant },
  footerLink: { fontFamily: 'Inter-Bold', fontSize: 15, color: colors.primaryFixed },
  neonGlowTopRight: {
    position: 'absolute', top: -60, right: -60,
    width: 220, height: 220, borderRadius: 110,
    backgroundColor: 'rgba(198,243,51,0.08)',
  },
  neonGlowBottomLeft: {
    position: 'absolute', bottom: -60, left: -60,
    width: 220, height: 220, borderRadius: 110,
    backgroundColor: 'rgba(198,243,51,0.04)',
  },
});
