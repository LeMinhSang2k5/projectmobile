import React from 'react';
import { View, Text, StyleSheet, ImageBackground } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../theme/colors';

export default function WorkoutCard() {
  return (
    <View style={styles.container}>
      <ImageBackground 
        source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAmaPwkrbC-08dreODBP8rkWKHwDL0ZFk0MrYB7kTi_5V5lEwTgCWX3JGMD9W2CdYdpeXNYec48P8lNIEBMZeOpX-uodL6-6jhm61C3RIzKs_mSQu8ac9Ujt2BMfSLtjM9HhiH1qrLVpwOpTEm0f0Lqe1OWJ3ykvid8oJBk_5oNa34MQYaezooERr6IHkXUhYikvYKEChc6djgEf_eAylrOIsOiLiPqhFUy65erKdWFWbBwMDBQ7KmwT3wwdQKHRL_v8_RS82dMnZ8' }}
        style={styles.imageBackground}
        imageStyle={{ opacity: 0.5 }}
      >
        <LinearGradient
          colors={['rgba(26,28,28,0.2)', 'rgba(18,20,20,0.8)']}
          style={styles.gradient}
        >
          <View style={styles.topSection}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>KHÓA TẬP HIỆN TẠI</Text>
            </View>
            <Text style={styles.title}>Power Strength II</Text>
            <Text style={styles.subtitle}>Buổi 12 / 24 • Thân trên</Text>
          </View>
          
          <View style={styles.bottomSection}>
            <View style={styles.progressTextRow}>
              <Text style={styles.progressTextHighlight}>50% Hoàn thành</Text>
              <Text style={styles.progressTextSub}>12 ngày còn lại</Text>
            </View>
            <View style={styles.progressBarBg}>
              <View style={styles.progressBarFill} />
            </View>
          </View>
        </LinearGradient>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 220,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: colors.glass,
    borderColor: colors.glassBorder,
    borderWidth: 1,
    marginVertical: 12,
  },
  imageBackground: {
    width: '100%',
    height: '100%',
  },
  gradient: {
    flex: 1,
    padding: 24,
    justifyContent: 'space-between',
  },
  topSection: {
  },
  badge: {
    backgroundColor: colors.primaryContainer,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  badgeText: {
    color: colors.onPrimaryContainer,
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  title: {
    fontFamily: 'Montserrat-Bold',
    fontSize: 24,
    color: colors.onSurface,
    marginBottom: 4,
  },
  subtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: colors.onSurfaceVariant,
  },
  bottomSection: {
  },
  progressTextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 8,
  },
  progressTextHighlight: {
    fontFamily: 'Inter-Bold',
    fontSize: 14,
    color: colors.primaryFixed,
  },
  progressTextSub: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
    color: colors.onSurfaceVariant,
  },
  progressBarBg: {
    height: 12,
    backgroundColor: colors.surfaceVariant,
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.primaryFixed,
    width: '50%',
    borderRadius: 999,
    shadowColor: colors.primaryFixed,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 5,
  }
});
