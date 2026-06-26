import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';
import { colors } from '../theme/colors';

const CircularProgress = ({ value, maxValue, label, sublabel }: any) => {
  const radius = 48;
  const strokeWidth = 8;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (value / maxValue) * circumference;

  return (
    <View style={styles.circularContainer}>
      <Svg width={120} height={120}>
        <Circle
          cx="60"
          cy="60"
          r={radius}
          stroke={colors.surfaceVariant}
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        <Circle
          cx="60"
          cy="60"
          r={radius}
          stroke={colors.primaryFixed}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="transparent"
          rotation="-90"
          origin="60, 60"
        />
      </Svg>
      <View style={styles.circularTextContainer}>
        <Text style={styles.circularValue}>{value}</Text>
        <Text style={styles.circularLabel}>{sublabel}</Text>
      </View>
    </View>
  );
};

export default function StatsGrid() {
  const [waterCups, setWaterCups] = useState(5);

  const addWater = () => {
    if (waterCups < 8) setWaterCups(waterCups + 1);
  };

  return (
    <View style={styles.container}>
      {/* Alarm Widget */}
      <View style={[styles.card, styles.alarmCard]}>
        <View style={styles.iconCircle}>
          <MaterialIcons name="alarm" size={28} color={colors.primaryFixed} />
        </View>
        <View style={styles.alarmTextContainer}>
          <Text style={styles.alarmLabel}>BÁO THỨC TẬP LUYỆN</Text>
          <Text style={styles.alarmTime}>06:30 AM</Text>
          <Text style={styles.alarmSub}>Sau 8 giờ nữa</Text>
        </View>
        <TouchableOpacity style={styles.btnSecondary} activeOpacity={0.7}>
          <Text style={styles.btnSecondaryText}>Cài đặt lại</Text>
        </TouchableOpacity>
      </View>

      {/* Food Tracking */}
      <View style={[styles.card, styles.foodCard]}>
        <CircularProgress value={1420} maxValue={2100} label="1,420" sublabel="kcal" />
        <View style={styles.foodDetails}>
          <Text style={styles.foodTitle}>DINH DƯỠNG</Text>
          
          <View style={styles.foodRow}>
            <Text style={styles.foodRowLabel}>Mục tiêu</Text>
            <Text style={styles.foodRowValue}>2,100</Text>
          </View>
          <View style={styles.foodRow}>
            <Text style={styles.foodRowLabel}>Đã nạp</Text>
            <Text style={[styles.foodRowValue, { color: colors.primaryFixed }]}>1,420</Text>
          </View>
          <View style={styles.foodRow}>
            <Text style={styles.foodRowLabel}>Còn lại</Text>
            <Text style={styles.foodRowValue}>680</Text>
          </View>
        </View>
      </View>

      {/* Water Intake */}
      <View style={[styles.card, styles.waterCard]}>
        <View style={styles.waterHeader}>
          <View>
            <Text style={styles.waterTitle}>LƯỢNG NƯỚC</Text>
            <Text style={styles.waterCount}><Text style={{color: colors.primaryFixed}}>{waterCups}</Text>/8 cốc</Text>
          </View>
          <MaterialIcons name="water-drop" size={32} color={colors.primaryFixed} />
        </View>
        
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.waterCupsContainer}>
          {Array.from({ length: 8 }).map((_, i) => (
            <View key={i} style={[styles.cup, i < waterCups ? styles.cupFilled : null]}>
              <View style={[styles.cupInner, i < waterCups ? styles.cupInnerFilled : null]} />
            </View>
          ))}
        </ScrollView>

        <TouchableOpacity style={styles.btnPrimary} activeOpacity={0.8} onPress={addWater}>
          <MaterialIcons name="add" size={20} color={colors.onPrimaryFixed} />
          <Text style={styles.btnPrimaryText}>Thêm một cốc</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
    paddingBottom: 20,
  },
  card: {
    backgroundColor: colors.glass,
    borderColor: colors.glassBorder,
    borderWidth: 1,
    borderRadius: 16,
    padding: 24,
  },
  alarmCard: {
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  alarmTextContainer: {
    alignItems: 'center',
  },
  alarmLabel: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
    color: colors.onSurfaceVariant,
    letterSpacing: 1,
    marginBottom: 4,
  },
  alarmTime: {
    fontFamily: 'Montserrat-Bold',
    fontSize: 24,
    color: colors.onSurface,
  },
  alarmSub: {
    fontFamily: 'Inter-Medium',
    fontSize: 16,
    color: colors.primaryFixed,
    marginTop: 4,
  },
  btnSecondary: {
    backgroundColor: colors.surfaceVariant,
    width: '100%',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  btnSecondaryText: {
    color: colors.onSurface,
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
  },
  foodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  circularContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  circularTextContainer: {
    position: 'absolute',
    alignItems: 'center',
  },
  circularValue: {
    fontFamily: 'Montserrat-Bold',
    fontSize: 24,
    color: colors.onSurface,
  },
  circularLabel: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
    color: colors.onSurfaceVariant,
  },
  foodDetails: {
    flex: 1,
  },
  foodTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: colors.onSurfaceVariant,
    letterSpacing: 1,
    marginBottom: 12,
  },
  foodRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  foodRowLabel: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: colors.onSurface,
  },
  foodRowValue: {
    fontFamily: 'Inter-Bold',
    fontSize: 16,
    color: colors.onSurface,
  },
  waterCard: {
  },
  waterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  waterTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: colors.onSurfaceVariant,
    letterSpacing: 1,
    marginBottom: 4,
  },
  waterCount: {
    fontFamily: 'Montserrat-Bold',
    fontSize: 24,
    color: colors.onSurface,
  },
  waterCupsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 24,
    marginBottom: 24,
  },
  cup: {
    width: 32,
    height: 40,
    borderWidth: 2,
    borderColor: colors.outlineVariant,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    justifyContent: 'flex-end',
    paddingBottom: 4,
    alignItems: 'center',
  },
  cupFilled: {
    borderColor: colors.primaryFixed,
    backgroundColor: 'rgba(198, 243, 51, 0.1)',
  },
  cupInner: {
    width: '100%',
    height: '50%',
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
  },
  cupInnerFilled: {
    backgroundColor: 'rgba(198, 243, 51, 0.5)',
  },
  btnPrimary: {
    backgroundColor: colors.primaryFixed,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  btnPrimaryText: {
    color: colors.onPrimaryFixed,
    fontFamily: 'Inter-Bold',
    fontSize: 16,
  }
});
