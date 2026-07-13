import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { spacing, radii } from '../../theme/layout';
import GlassCard from '../ui/GlassCard';
import type { Program, WorkoutCourse } from '../../types';
import type { ProgramOption } from '../../services/adminService';
import {
  BADGE_CRITERIA_HINTS,
  BADGE_CRITERIA_LABELS,
  BADGE_CRITERIA_TYPES,
  type BadgeCriteriaType,
} from '../../lib/badgeCriteria';

export const PROGRAM_LEVELS: Program['level'][] = ['Beginner', 'Intermediate', 'Advanced'];

export const LEVEL_LABELS: Record<Program['level'], string> = {
  Beginner: 'Cơ bản',
  Intermediate: 'Trung cấp',
  Advanced: 'Nâng cao',
};

export const COURSE_DIFFICULTIES: WorkoutCourse['difficulty'][] = ['beginner', 'intermediate', 'advanced'];

export const DIFFICULTY_LABELS: Record<WorkoutCourse['difficulty'], string> = {
  beginner: 'Cơ bản',
  intermediate: 'Trung cấp',
  advanced: 'Nâng cao',
};

export function AdminCrudLayout({
  loading,
  error,
  onRefresh,
  formTitle = 'Thêm mới',
  form,
  list,
}: {
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
  formTitle?: string;
  form: React.ReactNode;
  list: React.ReactNode;
}) {
  return (
    <ScrollView
      contentContainerStyle={adminStyles.scrollContent}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={onRefresh} tintColor={colors.primaryFixed} />}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={adminStyles.blockTitle}>{formTitle}</Text>
      <GlassCard style={adminStyles.formCard}>{form}</GlassCard>
      {error ? (
        <View style={adminStyles.errorBox}>
          <MaterialIcons name="error-outline" size={18} color={colors.danger} />
          <Text style={adminStyles.errorText}>{error}</Text>
        </View>
      ) : null}
      <Text style={adminStyles.listHeading}>Danh sách</Text>
      {loading && !error ? <ActivityIndicator color={colors.primaryFixed} style={{ marginVertical: 12 }} /> : null}
      <GlassCard padding={0} style={adminStyles.listCard}>
        {list}
      </GlassCard>
    </ScrollView>
  );
}

export function AdminField({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={adminStyles.fieldWrap}>
      <Text style={adminStyles.fieldLabel}>{label}</Text>
      {children}
      {hint ? <Text style={adminStyles.fieldHint}>{hint}</Text> : null}
    </View>
  );
}

export function AdminInput({
  placeholder,
  value,
  onChangeText,
  keyboardType,
  autoCapitalize,
  multiline,
}: {
  placeholder?: string;
  value: string;
  onChangeText: (value: string) => void;
  keyboardType?: 'default' | 'numeric' | 'decimal-pad';
  autoCapitalize?: 'none' | 'sentences';
  multiline?: boolean;
}) {
  return (
    <TextInput
      placeholder={placeholder}
      placeholderTextColor={colors.onSurfaceVariant}
      value={value}
      onChangeText={onChangeText}
      keyboardType={keyboardType}
      autoCapitalize={autoCapitalize}
      multiline={multiline}
      style={[adminStyles.input, multiline && adminStyles.textArea]}
    />
  );
}

export function AdminSubmit({ label, loading, onPress }: { label: string; loading: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      style={[adminStyles.submitBtn, loading && adminStyles.submitBtnDisabled]}
      onPress={onPress}
      disabled={loading}
      activeOpacity={0.85}
    >
      {loading ? (
        <ActivityIndicator size="small" color={colors.onPrimaryFixed} />
      ) : (
        <>
          <MaterialIcons name="add-circle-outline" size={18} color={colors.onPrimaryFixed} />
          <Text style={adminStyles.submitText}>{label}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

export function LevelPicker({ value, onChange }: { value: Program['level']; onChange: (level: Program['level']) => void }) {
  return (
    <View style={adminStyles.chipRow}>
      {PROGRAM_LEVELS.map((level) => {
        const active = value === level;
        return (
          <TouchableOpacity
            key={level}
            style={[adminStyles.chip, active && adminStyles.chipActive]}
            onPress={() => onChange(level)}
            activeOpacity={0.85}
          >
            <Text style={[adminStyles.chipText, active && adminStyles.chipTextActive]}>
              {LEVEL_LABELS[level]}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export function DifficultyPicker({
  value,
  onChange,
}: {
  value: WorkoutCourse['difficulty'];
  onChange: (v: WorkoutCourse['difficulty']) => void;
}) {
  return (
    <View style={adminStyles.chipRow}>
      {COURSE_DIFFICULTIES.map((d) => {
        const active = value === d;
        return (
          <TouchableOpacity
            key={d}
            style={[adminStyles.chip, active && adminStyles.chipActive]}
            onPress={() => onChange(d)}
            activeOpacity={0.85}
          >
            <Text style={[adminStyles.chipText, active && adminStyles.chipTextActive]}>
              {DIFFICULTY_LABELS[d]}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export function ProgramPicker({
  programs,
  value,
  onChange,
}: {
  programs: ProgramOption[];
  value: string;
  onChange: (id: string) => void;
}) {
  if (!programs.length) {
    return <Text style={adminStyles.emptyText}>Chưa có program. Thêm program trước.</Text>;
  }
  return (
    <View style={adminStyles.chipRow}>
      {programs.map((program) => {
        const active = value === program.id;
        return (
          <TouchableOpacity
            key={program.id}
            style={[adminStyles.chip, active && adminStyles.chipActive]}
            onPress={() => onChange(program.id)}
            activeOpacity={0.85}
          >
            <Text style={[adminStyles.chipText, active && adminStyles.chipTextActive]} numberOfLines={1}>
              {program.title}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function isMaterialIconName(name: string): name is keyof typeof MaterialIcons.glyphMap {
  return name in MaterialIcons.glyphMap;
}

export function BadgeIconPicker({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string;
  onChange: (icon: string) => void;
}) {
  const validOptions = options.filter(isMaterialIconName);
  if (!validOptions.length) {
    return <Text style={adminStyles.emptyText}>Chưa có icon trong hệ thống.</Text>;
  }

  return (
    <View style={adminStyles.iconGrid}>
      {validOptions.map((iconName) => {
        const active = value === iconName;
        return (
          <TouchableOpacity
            key={iconName}
            style={[adminStyles.iconCell, active && adminStyles.iconCellActive]}
            onPress={() => onChange(iconName)}
            activeOpacity={0.85}
            accessibilityLabel={iconName}
          >
            <MaterialIcons
              name={iconName}
              size={24}
              color={active ? colors.onPrimaryFixed : colors.onSurfaceVariant}
            />
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export function BadgeCriteriaPicker({
  value,
  onChange,
}: {
  value: BadgeCriteriaType;
  onChange: (type: BadgeCriteriaType) => void;
}) {
  return (
    <View style={adminStyles.chipRow}>
      {BADGE_CRITERIA_TYPES.map((type) => {
        const active = value === type;
        return (
          <TouchableOpacity
            key={type}
            style={[adminStyles.chip, active && adminStyles.chipActive]}
            onPress={() => onChange(type)}
            activeOpacity={0.85}
          >
            <Text style={[adminStyles.chipText, active && adminStyles.chipTextActive]}>
              {BADGE_CRITERIA_LABELS[type]}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export function getBadgeCriteriaValueHint(type: BadgeCriteriaType): string {
  return BADGE_CRITERIA_HINTS[type];
}

export function AdminListRow({
  title,
  subtitle,
  onEdit,
  onDelete,
  isLast = false,
  leadingIcon,
}: {
  title: string;
  subtitle: string;
  onEdit?: () => void;
  onDelete: () => void;
  isLast?: boolean;
  leadingIcon?: keyof typeof MaterialIcons.glyphMap;
}) {
  const rowIcon =
    leadingIcon && leadingIcon in MaterialIcons.glyphMap ? leadingIcon : 'article';

  return (
    <View style={[adminStyles.listRow, isLast && adminStyles.listRowLast]}>
      <View style={adminStyles.listIconWrap}>
        <MaterialIcons name={rowIcon} size={18} color={colors.primaryFixed} />
      </View>
      <View style={adminStyles.listTextWrap}>
        <Text style={adminStyles.listTitle}>{title}</Text>
        <Text style={adminStyles.listSub}>{subtitle}</Text>
      </View>
      <View style={adminStyles.listActions}>
        {onEdit ? (
          <TouchableOpacity style={adminStyles.iconBtn} onPress={onEdit} hitSlop={8}>
            <MaterialIcons name="edit" size={18} color={colors.primaryFixed} />
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity style={[adminStyles.iconBtn, adminStyles.iconBtnDanger]} onPress={onDelete} hitSlop={8}>
          <MaterialIcons name="delete-outline" size={18} color={colors.danger} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

export const adminStyles = StyleSheet.create({
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.section,
  },
  blockTitle: {
    fontFamily: 'Montserrat-Bold',
    fontSize: 15,
    color: colors.onSurface,
    marginBottom: spacing.sm,
  },
  formCard: {
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  fieldWrap: {
    gap: spacing.sm,
  },
  fieldLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    color: colors.onSurfaceVariant,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  fieldHint: {
    fontFamily: 'Inter-Regular',
    fontSize: 11,
    color: colors.onSurfaceVariant,
    lineHeight: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.glassBorder,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    color: colors.onSurface,
    fontFamily: 'Inter-Regular',
    fontSize: 15,
    backgroundColor: 'rgba(30, 32, 32, 0.85)',
  },
  textArea: {
    minHeight: 96,
    textAlignVertical: 'top',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    borderWidth: 1,
    borderColor: colors.glassBorder,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    backgroundColor: 'rgba(30, 32, 32, 0.85)',
  },
  chipActive: {
    borderColor: colors.primaryFixed,
    backgroundColor: colors.accentMuted,
  },
  chipText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
    color: colors.onSurfaceVariant,
  },
  chipTextActive: {
    color: colors.primaryFixed,
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  iconCell: {
    width: 48,
    height: 48,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    backgroundColor: 'rgba(30, 32, 32, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCellActive: {
    borderColor: colors.primaryFixed,
    backgroundColor: colors.primaryFixed,
  },
  submitBtn: {
    marginTop: spacing.sm,
    backgroundColor: colors.primaryFixed,
    borderRadius: radii.md,
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitText: {
    fontFamily: 'Inter-Bold',
    fontSize: 15,
    color: colors.onPrimaryFixed,
  },
  listHeading: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    color: colors.onSurfaceVariant,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
  },
  listCard: {
    overflow: 'hidden',
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.glassBorder,
    gap: spacing.md,
  },
  listRowLast: {
    borderBottomWidth: 0,
  },
  listIconWrap: {
    width: 36,
    height: 36,
    borderRadius: radii.sm,
    backgroundColor: colors.accentMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listTextWrap: {
    flex: 1,
  },
  listTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: colors.onSurface,
  },
  listSub: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  listActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    backgroundColor: colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnDanger: {
    borderColor: 'rgba(255, 107, 107, 0.25)',
    backgroundColor: 'rgba(255, 107, 107, 0.08)',
  },
  emptyText: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    color: colors.onSurfaceVariant,
    padding: spacing.lg,
    textAlign: 'center',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.25)',
    backgroundColor: 'rgba(255, 107, 107, 0.08)',
  },
  errorText: {
    flex: 1,
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    color: colors.danger,
  },
  sectionHint: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    color: colors.onSurfaceVariant,
    lineHeight: 18,
  },
  formatHint: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
    color: colors.primaryFixed,
    marginBottom: spacing.sm,
  },
  successTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: colors.primaryFixed,
    marginBottom: spacing.sm,
  },
  urlText: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: colors.onSurface,
    lineHeight: 18,
  },
});
