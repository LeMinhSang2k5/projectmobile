import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  Image,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { colors } from '../theme/colors';
import { supabase } from '../../utils/supabase';

type ForgotPasswordScreenProps = {
  onBackToLogin: () => void;
};

export default function ForgotPasswordScreen({ onBackToLogin }: ForgotPasswordScreenProps) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);

  const handleSendResetEmail = async () => {
    const finalEmail = email.trim();
    if (!/\S+@\S+\.\S+/.test(finalEmail)) {
      Alert.alert('Nhập email', 'Hãy nhập địa chỉ email hợp lệ.');
      return;
    }
    setLoading(true);
    
    // Sử dụng Linking.createURL để tự động tạo đúng URL cho cả Expo Go (exp://...) và App đã build (fitnow://...)
    const redirectUrl = Linking.createURL('reset-password');
    console.log('Redirect URL:', redirectUrl); // Để debug xem URL là gì

    const { error } = await supabase.auth.resetPasswordForEmail(finalEmail, {
      redirectTo: redirectUrl,
    });
    setLoading(false);

    if (error) {
      Alert.alert('Không thể gửi email', error.message);
    } else {
      Alert.alert('Đã gửi email', 'Hãy kiểm tra hộp thư của bạn để tiếp tục đặt lại mật khẩu.', [
        { text: 'OK', onPress: onBackToLogin }
      ]);
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      {/* Background tĩnh */}
      <Image
        source={require('../../public/backgorund_login.jpg')}
        style={StyleSheet.absoluteFillObject}
        resizeMode="cover"
      />
      <View style={styles.overlay} />

      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <TouchableOpacity style={styles.backButton} onPress={onBackToLogin}>
            <MaterialIcons name="arrow-back" size={24} color={colors.onSurface} />
            <Text style={styles.backButtonText}>Quay lại</Text>
          </TouchableOpacity>

          <View style={styles.glassPanel}>
            <View style={styles.header}>
              <Text style={styles.title}>Quên mật khẩu</Text>
              <Text style={styles.subtitle}>Nhập email của bạn, chúng tôi sẽ gửi liên kết để đặt lại mật khẩu.</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email</Text>
              <View style={[styles.inputWrapper, focused && styles.inputWrapperFocused]}>
                <MaterialIcons
                  name="mail"
                  size={20}
                  color={focused ? colors.primaryFixed : colors.onSurfaceVariant}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="nhutdeptrai@gmail.com"
                  placeholderTextColor="rgba(196, 201, 174, 0.5)"
                  value={email}
                  onChangeText={setEmail}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  returnKeyType="send"
                  onSubmitEditing={handleSendResetEmail}
                />
              </View>
            </View>

            <TouchableOpacity
              style={styles.sendBtn}
              activeOpacity={0.8}
              onPress={handleSendResetEmail}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={colors.onPrimaryFixed} />
              ) : (
                <Text style={styles.sendBtnText}>GỬI EMAIL</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.55)' },
  keyboardAvoid: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  backButtonText: {
    fontFamily: 'Inter-Medium',
    fontSize: 16,
    color: colors.onSurface,
    marginLeft: 8,
  },
  glassPanel: {
    backgroundColor: 'rgba(30,32,32,0.78)',
    borderColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderRadius: 20,
    padding: 24,
  },
  header: { marginBottom: 24 },
  title: {
    fontFamily: 'Montserrat-Bold',
    fontSize: 24,
    color: colors.onSurface,
    marginBottom: 6,
  },
  subtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: colors.onSurfaceVariant,
    lineHeight: 20,
  },
  inputGroup: { marginBottom: 20 },
  inputLabel: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
    color: colors.onSurfaceVariant,
    marginLeft: 4,
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(51,53,53,0.5)',
    borderWidth: 1,
    borderColor: 'rgba(68,73,52,0.4)',
    borderRadius: 12,
    height: 50,
  },
  inputWrapperFocused: {
    borderColor: colors.primaryFixed,
  },
  inputIcon: { marginLeft: 14, marginRight: 8 },
  input: {
    flex: 1,
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: colors.onSurface,
    height: '100%',
    paddingVertical: 0,
  },
  sendBtn: {
    backgroundColor: colors.primaryFixed,
    borderRadius: 12,
    height: 54,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.primaryFixed,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 6,
  },
  sendBtnText: {
    fontFamily: 'Inter-Bold',
    fontSize: 14,
    color: colors.onPrimaryFixed,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
});
