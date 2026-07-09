import React, { useState, useRef } from 'react';
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
  TextInput as TextInputType,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { supabase } from '../../utils/supabase';

type ResetPasswordScreenProps = {
  onClose: () => void;
};

export default function ResetPasswordScreen({ onClose }: ResetPasswordScreenProps) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [confirmPasswordFocused, setConfirmPasswordFocused] = useState(false);

  const confirmPasswordRef = useRef<TextInputType>(null);

  const handleUpdatePassword = async () => {
    if (password.length < 6) {
      Alert.alert('Lỗi', 'Mật khẩu phải có ít nhất 6 ký tự.');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Lỗi', 'Mật khẩu xác nhận không khớp.');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({
      password: password,
    });
    setLoading(false);

    if (error) {
      Alert.alert('Lỗi', error.message);
    } else {
      Alert.alert('Thành công', 'Đổi mật khẩu thành công!', [
        { text: 'OK', onPress: onClose }
      ]);
    }
  };

  return (
    <View style={styles.root}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.glassPanel}>
            <View style={styles.header}>
              <Text style={styles.title}>Đổi mật khẩu mới</Text>
              <Text style={styles.subtitle}>Vui lòng nhập mật khẩu mới của bạn</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Mật khẩu mới</Text>
              <View style={[styles.inputWrapper, passwordFocused && styles.inputWrapperFocused]}>
                <MaterialIcons
                  name="lock"
                  size={20}
                  color={passwordFocused ? colors.primaryFixed : colors.onSurfaceVariant}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="••••••••"
                  placeholderTextColor="rgba(196, 201, 174, 0.5)"
                  value={password}
                  onChangeText={setPassword}
                  onFocus={() => setPasswordFocused(true)}
                  onBlur={() => setPasswordFocused(false)}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  returnKeyType="next"
                  onSubmitEditing={() => confirmPasswordRef.current?.focus()}
                />
                <TouchableOpacity
                  style={styles.eyeIcon}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <MaterialIcons
                    name={showPassword ? 'visibility' : 'visibility-off'}
                    size={20}
                    color={colors.onSurfaceVariant}
                  />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Xác nhận mật khẩu</Text>
              <View style={[styles.inputWrapper, confirmPasswordFocused && styles.inputWrapperFocused]}>
                <MaterialIcons
                  name="lock"
                  size={20}
                  color={confirmPasswordFocused ? colors.primaryFixed : colors.onSurfaceVariant}
                  style={styles.inputIcon}
                />
                <TextInput
                  ref={confirmPasswordRef}
                  style={styles.input}
                  placeholder="••••••••"
                  placeholderTextColor="rgba(196, 201, 174, 0.5)"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  onFocus={() => setConfirmPasswordFocused(true)}
                  onBlur={() => setConfirmPasswordFocused(false)}
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                  returnKeyType="done"
                  onSubmitEditing={handleUpdatePassword}
                />
                <TouchableOpacity
                  style={styles.eyeIcon}
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  <MaterialIcons
                    name={showConfirmPassword ? 'visibility' : 'visibility-off'}
                    size={20}
                    color={colors.onSurfaceVariant}
                  />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={styles.updateBtn}
              activeOpacity={0.8}
              onPress={handleUpdatePassword}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={colors.onPrimaryFixed} />
              ) : (
                <Text style={styles.updateBtnText}>CẬP NHẬT MẬT KHẨU</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.cancelBtn} 
              onPress={async () => {
                await supabase.auth.signOut();
                onClose();
              }}
            >
              <Text style={styles.cancelBtnText}>Quay lại Đăng nhập</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000', // Fully opaque black
    justifyContent: 'center',
    zIndex: 9999, // Ensure it's on top of everything
  },
  keyboardAvoid: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  glassPanel: {
    backgroundColor: 'rgba(30,32,32,0.95)',
    borderColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderRadius: 20,
    padding: 24,
  },
  header: { marginBottom: 24 },
  title: {
    fontFamily: 'Montserrat-Bold',
    fontSize: 22,
    color: colors.onSurface,
    marginBottom: 6,
  },
  subtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: colors.onSurfaceVariant,
  },
  inputGroup: { marginBottom: 16 },
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
  eyeIcon: { padding: 12 },
  updateBtn: {
    backgroundColor: colors.primaryFixed,
    borderRadius: 12,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
  },
  updateBtnText: {
    fontFamily: 'Inter-Bold',
    fontSize: 14,
    color: colors.onPrimaryFixed,
  },
  cancelBtn: {
    marginTop: 16,
    alignItems: 'center',
  },
  cancelBtnText: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: colors.onSurfaceVariant,
  },
});
