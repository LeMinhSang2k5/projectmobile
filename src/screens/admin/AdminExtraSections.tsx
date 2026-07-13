import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { spacing, radii } from '../../theme/layout';
import GlassCard from '../../components/ui/GlassCard';
import AdminEditSheet from '../../components/admin/AdminEditSheet';
import { useAdminDialog } from '../../components/admin/AdminDialogProvider';
import type { WorkoutCourse } from '../../types';
import {
  createWorkoutCourse,
  deleteMediaFile,
  deleteWorkoutCourse,
  importCsvRows,
  listMediaFiles,
  listWorkoutCourses,
  updateWorkoutCourse,
  uploadMediaFile,
  type ImportType,
  type MediaBucket,
  type MediaFileItem,
  type WorkoutCourseInput,
} from '../../services/adminService';
import {
  AdminCrudLayout,
  AdminField,
  AdminInput,
  AdminListRow,
  AdminSubmit,
  DIFFICULTY_LABELS,
  DifficultyPicker,
  adminStyles as styles,
} from '../../components/admin/adminUi';

const IMPORT_HINTS: Record<ImportType, string> = {
  foods: 'Header: name,serving_size,calories,protein_g,carbs_g,fat_g',
  programs: 'Header: title,description,level,thumbnail_url',
  exercises: 'Header: program_title,name,duration,met_value,media_url,sort_order',
};

const IMPORT_LABELS: Record<ImportType, string> = {
  foods: 'Món ăn',
  programs: 'Programs',
  exercises: 'Exercises',
};

const BUCKET_LABELS: Record<MediaBucket, string> = {
  'exercise-media': 'Bài tập',
  'program-thumbnails': 'Thumbnail program',
};

export function AdminCoursesSection() {
  const { confirm, alert } = useAdminDialog();
  const [rows, setRows] = useState<WorkoutCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<WorkoutCourse | null>(null);
  const [title, setTitle] = useState('');
  const [totalSessions, setTotalSessions] = useState('30');
  const [targetMuscle, setTargetMuscle] = useState('full_body');
  const [difficulty, setDifficulty] = useState<WorkoutCourse['difficulty']>('beginner');
  const [description, setDescription] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRows(await listWorkoutCourses());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tải courses');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const buildInput = (): WorkoutCourseInput => ({
    title: title.trim(),
    total_sessions: Number(totalSessions) || 1,
    target_muscle: targetMuscle.trim() || null,
    difficulty,
    description: description.trim() || null,
  });

  const resetForm = () => {
    setTitle('');
    setTotalSessions('30');
    setTargetMuscle('full_body');
    setDifficulty('beginner');
    setDescription('');
  };

  const openEdit = (course: WorkoutCourse) => {
    setEditing(course);
    setTitle(course.title);
    setTotalSessions(String(course.total_sessions));
    setTargetMuscle(course.target_muscle ?? '');
    setDifficulty(course.difficulty);
    setDescription(course.description ?? '');
  };

  const handleCreate = async () => {
    if (!title.trim()) {
      await alert({ title: 'Lỗi', message: 'Tiêu đề không được để trống.' });
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await createWorkoutCourse(buildInput());
      resetForm();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể thêm course');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!editing || !title.trim()) return;
    setSaving(true);
    try {
      await updateWorkoutCourse(editing.id, buildInput());
      setEditing(null);
      resetForm();
      await load();
    } catch (err) {
      await alert({ title: 'Lỗi', message: err instanceof Error ? err.message : 'Không thể cập nhật' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    const ok = await confirm({
      title: 'Xóa course',
      message: `Bạn có chắc muốn xóa "${name}"?`,
      confirmLabel: 'Xóa',
      destructive: true,
    });
    if (!ok) return;
    try {
      await deleteWorkoutCourse(id);
      await load();
    } catch (err) {
      await alert({ title: 'Lỗi', message: err instanceof Error ? err.message : 'Không thể xóa' });
    }
  };

  return (
    <>
      <AdminCrudLayout
        loading={loading}
        error={error}
        onRefresh={load}
        form={
          <>
            <AdminField label="Tiêu đề" hint="Bắt buộc">
              <AdminInput placeholder="VD: 30 ngày sau mùi" value={title} onChangeText={setTitle} />
            </AdminField>
            <AdminField label="Tổng buổi">
              <AdminInput placeholder="30" value={totalSessions} onChangeText={setTotalSessions} keyboardType="numeric" />
            </AdminField>
            <AdminField label="Nhóm cơ">
              <AdminInput placeholder="full_body, upper_body..." value={targetMuscle} onChangeText={setTargetMuscle} autoCapitalize="none" />
            </AdminField>
            <AdminField label="Độ khó">
              <DifficultyPicker value={difficulty} onChange={setDifficulty} />
            </AdminField>
            <AdminField label="Mô tả">
              <AdminInput placeholder="Mô tả lộ trình" value={description} onChangeText={setDescription} multiline />
            </AdminField>
            <AdminSubmit label="Thêm course" loading={saving} onPress={handleCreate} />
          </>
        }
        list={
          <FlatList
            data={rows}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            renderItem={({ item, index }) => (
              <AdminListRow
                title={item.title}
                subtitle={`${item.total_sessions} buổi · ${DIFFICULTY_LABELS[item.difficulty]}`}
                onEdit={() => openEdit(item)}
                onDelete={() => void handleDelete(item.id, item.title)}
                isLast={index === rows.length - 1}
              />
            )}
            ListEmptyComponent={<Text style={styles.emptyText}>Chưa có course.</Text>}
          />
        }
      />
      <AdminEditSheet
        visible={!!editing}
        title="Sửa course"
        loading={saving}
        onClose={() => { setEditing(null); resetForm(); }}
        onSave={handleUpdate}
      >
        <AdminField label="Tiêu đề">
          <AdminInput placeholder="Tiêu đề" value={title} onChangeText={setTitle} />
        </AdminField>
        <AdminField label="Tổng buổi">
          <AdminInput placeholder="30" value={totalSessions} onChangeText={setTotalSessions} keyboardType="numeric" />
        </AdminField>
        <AdminField label="Nhóm cơ">
          <AdminInput placeholder="Nhóm cơ" value={targetMuscle} onChangeText={setTargetMuscle} autoCapitalize="none" />
        </AdminField>
        <AdminField label="Độ khó">
          <DifficultyPicker value={difficulty} onChange={setDifficulty} />
        </AdminField>
        <AdminField label="Mô tả">
          <AdminInput placeholder="Mô tả" value={description} onChangeText={setDescription} multiline />
        </AdminField>
      </AdminEditSheet>
    </>
  );
}

export function AdminMediaSection() {
  const { alert, confirm } = useAdminDialog();
  const [bucket, setBucket] = useState<MediaBucket>('exercise-media');
  const [path, setPath] = useState('');
  const [loading, setLoading] = useState(false);
  const [listLoading, setListLoading] = useState(true);
  const [deletingPath, setDeletingPath] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [publicUrl, setPublicUrl] = useState<string | null>(null);
  const [mediaFiles, setMediaFiles] = useState<MediaFileItem[]>([]);

  const loadMediaFiles = useCallback(async () => {
    setListLoading(true);
    try {
      setMediaFiles(await listMediaFiles(bucket));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tải danh sách media');
    } finally {
      setListLoading(false);
    }
  }, [bucket]);

  useEffect(() => {
    void loadMediaFiles();
  }, [loadMediaFiles]);

  const formatUploadError = (message: string): string => {
    const lower = message.toLowerCase();
    if (lower.includes('resource already exists') || lower.includes('already exists')) {
      return 'File đã tồn tại tại đường dẫn này. Hãy đổi path hoặc deploy lại Edge Function media-upload (đã bật ghi đè).';
    }
    return message;
  };

  const buildUploadPath = (rawPath: string, ext: string, fileName?: string | null): string => {
    const trimmed = rawPath.trim();
    if (!trimmed) {
      const safeName = (fileName ?? `media-${Date.now()}.${ext}`).replace(/[^a-zA-Z0-9._-]/g, '_');
      return safeName.includes('/') ? safeName : `uploads/${safeName}`;
    }
    return trimmed.includes('.') ? trimmed : `${trimmed}.${ext}`;
  };

  const pickAndUpload = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      await alert({
        title: 'Cần quyền truy cập',
        message: 'Hãy cho phép truy cập thư viện ảnh/video trong Cài đặt.',
      });
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      quality: 0.9,
    });
    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    const ext = asset.uri.split('.').pop()?.toLowerCase() ?? 'jpg';
    const allowed = ['gif', 'mp4', 'jpg', 'jpeg', 'png', 'webp'];
    if (!allowed.includes(ext)) {
      await alert({ title: 'Lỗi', message: 'Chỉ hỗ trợ gif, mp4, jpg, png, webp' });
      return;
    }

    const uploadPath = buildUploadPath(path, ext, asset.fileName);
    const contentType =
      asset.mimeType ??
      (ext === 'mp4' ? 'video/mp4' : ext === 'gif' ? 'image/gif' : `image/${ext === 'jpg' ? 'jpeg' : ext}`);

    setLoading(true);
    setError(null);
    setPublicUrl(null);
    try {
      const { publicUrl: url } = await uploadMediaFile({
        bucket,
        path: uploadPath,
        localUri: asset.uri,
        contentType,
      });
      setPublicUrl(url);
      setPath(uploadPath);
      await loadMediaFiles();
    } catch (err) {
      setError(formatUploadError(err instanceof Error ? err.message : 'Upload thất bại'));
    } finally {
      setLoading(false);
    }
  };

  const handleSelectUrl = async (url: string) => {
    setPublicUrl(url);
    await alert({
      title: 'Đã chọn URL',
      message: 'Giữ để copy URL bên trên, rồi dán vào Ảnh thumbnail (Programs) hoặc Media URL (Exercises).',
    });
  };

  const handleDelete = async (item: MediaFileItem) => {
    const ok = await confirm({
      title: 'Xóa file',
      message: `Xóa "${item.name}" khỏi Storage? Hành động không thể hoàn tác.`,
      confirmLabel: 'Xóa',
      destructive: true,
    });
    if (!ok) return;

    setDeletingPath(item.path);
    setError(null);
    try {
      await deleteMediaFile(bucket, item.path);
      if (publicUrl === item.publicUrl) setPublicUrl(null);
      await loadMediaFiles();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể xóa file');
    } finally {
      setDeletingPath(null);
    }
  };

  return (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        <RefreshControl refreshing={listLoading} onRefresh={loadMediaFiles} tintColor={colors.primaryFixed} />
      }
    >
      <Text style={styles.blockTitle}>Upload media</Text>
      <GlassCard style={styles.formCard}>
        <Text style={styles.sectionHint}>Chọn ảnh/GIF/MP4 từ thiết bị, upload qua Edge Function media-upload.</Text>
        <AdminField label="Bucket lưu trữ">
          <View style={styles.chipRow}>
            {(['exercise-media', 'program-thumbnails'] as MediaBucket[]).map((b) => (
              <TouchableOpacity
                key={b}
                style={[styles.chip, bucket === b && styles.chipActive]}
                onPress={() => {
                  setBucket(b);
                  setPublicUrl(null);
                }}
                activeOpacity={0.85}
              >
                <Text style={[styles.chipText, bucket === b && styles.chipTextActive]}>{BUCKET_LABELS[b]}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </AdminField>
        <AdminField
          label="Đường dẫn (path)"
          hint="Để trống sẽ tự đặt tên theo file. Cùng path sẽ ghi đè file cũ."
        >
          <AdminInput placeholder="uploads/burpee.mp4" value={path} onChangeText={setPath} autoCapitalize="none" />
        </AdminField>
        <AdminSubmit label={loading ? 'Đang upload...' : 'Chọn file & upload'} loading={loading} onPress={pickAndUpload} />
      </GlassCard>
      {publicUrl ? (
        <GlassCard variant="accent" style={mediaStyles.selectedCard}>
          <Text style={styles.successTitle}>URL đang dùng</Text>
          <Text style={styles.urlText} selectable>{publicUrl}</Text>
          <Text style={styles.sectionHint}>Dán vào Ảnh thumbnail (Programs) hoặc Media URL (Exercises).</Text>
        </GlassCard>
      ) : null}
      {error ? (
        <View style={styles.errorBox}>
          <MaterialIcons name="error-outline" size={18} color={colors.danger} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <Text style={[styles.blockTitle, mediaStyles.libraryTitle]}>Kho media đã upload</Text>
      <Text style={styles.sectionHint}>
        Bucket: {BUCKET_LABELS[bucket]}. Chọn URL để dùng lại hoặc xóa file không cần.
      </Text>
      {listLoading && mediaFiles.length === 0 ? (
        <ActivityIndicator color={colors.primaryFixed} style={{ marginVertical: spacing.lg }} />
      ) : null}
      <GlassCard padding={0} style={mediaStyles.libraryCard}>
        {mediaFiles.length === 0 && !listLoading ? (
          <Text style={styles.emptyText}>Chưa có file trong bucket này.</Text>
        ) : (
          mediaFiles.map((item, index) => (
            <View
              key={item.path}
              style={[mediaStyles.mediaRow, index === mediaFiles.length - 1 && mediaStyles.mediaRowLast]}
            >
              <View style={mediaStyles.mediaPreview}>
                {item.kind === 'image' || item.kind === 'gif' ? (
                  <Image source={{ uri: item.publicUrl }} style={mediaStyles.mediaThumb} resizeMode="cover" />
                ) : (
                  <View style={mediaStyles.mediaThumbFallback}>
                    <MaterialIcons
                      name={item.kind === 'video' ? 'videocam' : 'insert-drive-file'}
                      size={22}
                      color={colors.primaryFixed}
                    />
                  </View>
                )}
              </View>
              <View style={mediaStyles.mediaInfo}>
                <Text style={mediaStyles.mediaName} numberOfLines={1}>{item.name}</Text>
                <Text style={mediaStyles.mediaPath} numberOfLines={1}>{item.path}</Text>
                <Text style={mediaStyles.mediaUrl} selectable numberOfLines={2}>{item.publicUrl}</Text>
              </View>
              <View style={mediaStyles.mediaActions}>
                <TouchableOpacity
                  style={[
                    mediaStyles.mediaActionBtn,
                    publicUrl === item.publicUrl && mediaStyles.mediaActionBtnActive,
                  ]}
                  onPress={() => void handleSelectUrl(item.publicUrl)}
                  hitSlop={6}
                >
                  <MaterialIcons name="link" size={18} color={colors.primaryFixed} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[mediaStyles.mediaActionBtn, mediaStyles.mediaActionBtnDanger]}
                  onPress={() => void handleDelete(item)}
                  disabled={deletingPath === item.path}
                  hitSlop={6}
                >
                  {deletingPath === item.path ? (
                    <ActivityIndicator size="small" color={colors.danger} />
                  ) : (
                    <MaterialIcons name="delete-outline" size={18} color={colors.danger} />
                  )}
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </GlassCard>
    </ScrollView>
  );
}

const mediaStyles = StyleSheet.create({
  selectedCard: {
    marginBottom: spacing.md,
  },
  libraryTitle: {
    marginTop: spacing.sm,
  },
  libraryCard: {
    marginTop: spacing.sm,
    overflow: 'hidden',
  },
  mediaRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.glassBorder,
  },
  mediaRowLast: {
    borderBottomWidth: 0,
  },
  mediaPreview: {
    width: 56,
    height: 56,
    borderRadius: radii.sm,
    overflow: 'hidden',
    backgroundColor: colors.surfaceContainerHigh,
  },
  mediaThumb: {
    width: '100%',
    height: '100%',
  },
  mediaThumbFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaInfo: {
    flex: 1,
    gap: 2,
  },
  mediaName: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: colors.onSurface,
  },
  mediaPath: {
    fontFamily: 'Inter-Regular',
    fontSize: 11,
    color: colors.onSurfaceVariant,
  },
  mediaUrl: {
    fontFamily: 'Inter-Regular',
    fontSize: 11,
    color: colors.primaryFixed,
    lineHeight: 16,
    marginTop: 2,
  },
  mediaActions: {
    gap: spacing.sm,
  },
  mediaActionBtn: {
    width: 34,
    height: 34,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    backgroundColor: colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaActionBtnActive: {
    borderColor: colors.primaryFixed,
    backgroundColor: colors.accentMuted,
  },
  mediaActionBtnDanger: {
    borderColor: 'rgba(255, 107, 107, 0.25)',
    backgroundColor: 'rgba(255, 107, 107, 0.08)',
  },
});

export function AdminImportSection() {
  const { alert } = useAdminDialog();
  const [importType, setImportType] = useState<ImportType>('foods');
  const [csvText, setCsvText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  const handleImport = async () => {
    if (!csvText.trim()) {
      await alert({ title: 'Lỗi', message: 'Dán nội dung CSV vào ô bên dưới.' });
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const count = await importCsvRows(importType, csvText);
      setResult(`Đã import ${count} dòng (${IMPORT_LABELS[importType]}).`);
      setCsvText('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
      <Text style={styles.blockTitle}>Import CSV</Text>
      <GlassCard style={styles.formCard}>
        <Text style={styles.sectionHint}>Dán CSV (có header). Format:</Text>
        <Text style={styles.formatHint}>{IMPORT_HINTS[importType]}</Text>
        <AdminField label="Loại dữ liệu">
          <View style={styles.chipRow}>
            {(['foods', 'programs', 'exercises'] as ImportType[]).map((t) => (
              <TouchableOpacity
                key={t}
                style={[styles.chip, importType === t && styles.chipActive]}
                onPress={() => setImportType(t)}
                activeOpacity={0.85}
              >
                <Text style={[styles.chipText, importType === t && styles.chipTextActive]}>{IMPORT_LABELS[t]}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </AdminField>
        <AdminField label="Nội dung CSV">
          <TextInput
            placeholder="Dán CSV tại đây..."
            placeholderTextColor={colors.onSurfaceVariant}
            value={csvText}
            onChangeText={setCsvText}
            multiline
            style={[styles.input, styles.textArea]}
          />
        </AdminField>
        <AdminSubmit label="Import CSV" loading={loading} onPress={handleImport} />
      </GlassCard>
      {result ? (
        <GlassCard variant="accent">
          <Text style={styles.successTitle}>{result}</Text>
        </GlassCard>
      ) : null}
      {error ? (
        <View style={styles.errorBox}>
          <MaterialIcons name="error-outline" size={18} color={colors.danger} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}
    </ScrollView>
  );
}
