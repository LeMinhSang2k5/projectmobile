import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  FlatList,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { spacing, radii } from '../../theme/layout';
import GlassCard from '../../components/ui/GlassCard';
import AdminEditSheet from '../../components/admin/AdminEditSheet';
import { AdminDialogProvider, useAdminDialog } from '../../components/admin/AdminDialogProvider';
import {
  AdminCrudLayout,
  AdminField,
  AdminInput,
  AdminListRow,
  AdminSubmit,
  LEVEL_LABELS,
  LevelPicker,
  ProgramPicker,
  adminStyles,
} from '../../components/admin/adminUi';
import type { Badge, Exercise, Food, Program } from '../../types';
import {
  createBadge,
  createExercise,
  createProgram,
  createSystemFood,
  deleteBadge,
  deleteExercise,
  deleteFood,
  deleteProgram,
  fetchCmsStatus,
  listBadges,
  listExercises,
  listProgramOptions,
  listPrograms,
  listSystemFoods,
  updateBadge,
  updateExercise,
  updateFood,
  updateProgram,
  type CmsStatus,
  type ProgramOption,
} from '../../services/adminService';
import {
  AdminCoursesSection,
  AdminImportSection,
  AdminMediaSection,
} from './AdminExtraSections';

export type AdminRoute =
  | 'hub'
  | 'status'
  | 'programs'
  | 'exercises'
  | 'courses'
  | 'foods'
  | 'badges'
  | 'media'
  | 'import';

type Props = {
  onClose: () => void;
  initialRoute?: AdminRoute;
};

const HUB_ITEMS: {
  route: AdminRoute;
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  sub: string;
}[] = [
  { route: 'status', icon: 'monitor-heart', label: 'Trạng thái CMS', sub: 'Health check backend' },
  { route: 'programs', icon: 'view-list', label: 'Programs', sub: 'Chương trình tập' },
  { route: 'exercises', icon: 'fitness-center', label: 'Exercises', sub: 'Bài tập & METs' },
  { route: 'courses', icon: 'school', label: 'Workout Courses', sub: 'Lộ trình dài hạn' },
  { route: 'foods', icon: 'restaurant', label: 'Món ăn', sub: 'Thư viện dinh dưỡng' },
  { route: 'badges', icon: 'emoji-events', label: 'Huy hiệu', sub: 'Badges & tiêu chí' },
  { route: 'media', icon: 'cloud-upload', label: 'Upload media', sub: 'Ảnh/GIF/MP4 lên Storage' },
  { route: 'import', icon: 'upload-file', label: 'Import CSV', sub: 'Nhập hàng loạt' },
];

export default function AdminScreen(props: Props) {
  return (
    <AdminDialogProvider>
      <AdminScreenContent {...props} />
    </AdminDialogProvider>
  );
}

function AdminScreenContent({ onClose, initialRoute = 'hub' }: Props) {
  const [route, setRoute] = useState<AdminRoute>(initialRoute);

  const goBack = () => {
    if (route === 'hub') onClose();
    else setRoute('hub');
  };

  const title =
    route === 'hub'
      ? 'Quản trị CMS'
      : HUB_ITEMS.find((item) => item.route === route)?.label ?? 'Admin';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={goBack} hitSlop={12}>
          <MaterialIcons
            name={route === 'hub' ? 'close' : 'arrow-back'}
            size={26}
            color={colors.onSurface}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{title}</Text>
        <View style={{ width: 26 }} />
      </View>

      {route === 'hub' ? <AdminHub onNavigate={setRoute} /> : null}
      {route === 'status' ? <AdminStatusSection /> : null}
      {route === 'programs' ? <AdminProgramsSection /> : null}
      {route === 'exercises' ? <AdminExercisesSection /> : null}
      {route === 'courses' ? <AdminCoursesSection /> : null}
      {route === 'foods' ? <AdminFoodsSection /> : null}
      {route === 'badges' ? <AdminBadgesSection /> : null}
      {route === 'media' ? <AdminMediaSection /> : null}
      {route === 'import' ? <AdminImportSection /> : null}
    </View>
  );
}

function AdminHub({ onNavigate }: { onNavigate: (route: AdminRoute) => void }) {
  return (
    <ScrollView contentContainerStyle={adminStyles.scrollContent}>
      <Text style={styles.hubIntro}>
        Quản lý nội dung hiển thị trên app. Chỉ tài khoản admin mới thấy mục này.
      </Text>
      {HUB_ITEMS.map((item) => (
        <TouchableOpacity key={item.route} activeOpacity={0.85} onPress={() => onNavigate(item.route)}>
          <GlassCard style={styles.hubCard}>
            <View style={styles.hubRow}>
              <View style={styles.hubIconWrap}>
                <MaterialIcons name={item.icon} size={22} color={colors.primaryFixed} />
              </View>
              <View style={styles.hubTextWrap}>
                <Text style={styles.hubLabel}>{item.label}</Text>
                <Text style={styles.hubSub}>{item.sub}</Text>
              </View>
              <MaterialIcons name="chevron-right" size={22} color={colors.onSurfaceVariant} />
            </View>
          </GlassCard>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

function AdminStatusSection() {
  const [status, setStatus] = useState<CmsStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setStatus(await fetchCmsStatus());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tải trạng thái');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading && !status) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primaryFixed} />
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={adminStyles.scrollContent}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.primaryFixed} />}
    >
      {error ? <Text style={adminStyles.errorText}>{error}</Text> : null}
      {status ? (
        <>
          <GlassCard variant="accent" style={styles.statGrid}>
            <Stat label="Trạng thái" value={status.status} />
            <Stat label="Schema" value={status.schema_version} />
            <Stat label="Programs" value={String(status.counts.programs)} />
            <Stat label="Exercises" value={String(status.counts.exercises)} />
            <Stat label="Foods" value={String(status.counts.system_foods)} />
            <Stat label="Badges" value={String(status.counts.badges)} />
          </GlassCard>
          <GlassCard>
            <Text style={styles.metaLine}>Service: {status.service}</Text>
            <Text style={styles.metaLine}>Buckets: {status.storage_buckets.join(', ') || 'none'}</Text>
            <Text style={styles.metaLine}>
              Checks:{' '}
              {Object.entries(status.checks)
                .map(([k, v]) => `${k}=${v ? 'ok' : 'fail'}`)
                .join(', ')}
            </Text>
            {status.errors.length ? (
              <Text style={adminStyles.errorText}>Errors: {status.errors.join('; ')}</Text>
            ) : null}
          </GlassCard>
        </>
      ) : null}
    </ScrollView>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statItem}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

function AdminProgramsSection() {
  const { confirm, alert } = useAdminDialog();
  const [rows, setRows] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Program | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [level, setLevel] = useState<Program['level']>('Beginner');
  const [thumbnailUrl, setThumbnailUrl] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRows(await listPrograms());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tải programs');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setLevel('Beginner');
    setThumbnailUrl('');
  };

  const openEdit = (item: Program) => {
    setEditing(item);
    setTitle(item.title);
    setDescription(item.description ?? '');
    setLevel(item.level);
    setThumbnailUrl(item.thumbnail_url ?? '');
  };

  const buildInput = () => ({
    title: title.trim(),
    description: description.trim() || null,
    level,
    thumbnail_url: thumbnailUrl.trim() || null,
  });

  const handleCreate = async () => {
    if (!title.trim()) {
      await alert({ title: 'Lỗi', message: 'Tiêu đề không được để trống.' });
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await createProgram(buildInput());
      resetForm();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể thêm program');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!editing || !title.trim()) return;
    setSaving(true);
    try {
      await updateProgram(editing.id, buildInput());
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
      title: 'Xóa program',
      message: `Bạn có chắc muốn xóa "${name}"? Hành động này không thể hoàn tác.`,
      confirmLabel: 'Xóa',
      destructive: true,
    });
    if (!ok) return;
    try {
      await deleteProgram(id);
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
              <AdminInput placeholder="VD: Yoga & Linh Hoạt" value={title} onChangeText={setTitle} />
            </AdminField>
            <AdminField label="Mô tả">
              <AdminInput
                placeholder="Mô tả ngắn cho chương trình"
                value={description}
                onChangeText={setDescription}
                multiline
              />
            </AdminField>
            <AdminField label="Cấp độ">
              <LevelPicker value={level} onChange={setLevel} />
            </AdminField>
            <AdminField label="Ảnh thumbnail" hint="Dán URL hoặc upload tại mục Upload media">
              <AdminInput
                placeholder="https://..."
                value={thumbnailUrl}
                onChangeText={setThumbnailUrl}
                autoCapitalize="none"
              />
            </AdminField>
            <AdminSubmit label="Thêm program" loading={saving} onPress={handleCreate} />
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
                subtitle={`${LEVEL_LABELS[item.level]}${item.thumbnail_url ? ' · có ảnh' : ''}`}
                onEdit={() => openEdit(item)}
                onDelete={() => void handleDelete(item.id, item.title)}
                isLast={index === rows.length - 1}
              />
            )}
            ListEmptyComponent={<Text style={adminStyles.emptyText}>Chưa có program.</Text>}
          />
        }
      />
      <AdminEditSheet
        visible={!!editing}
        title="Sửa program"
        loading={saving}
        onClose={() => { setEditing(null); resetForm(); }}
        onSave={handleUpdate}
      >
        <AdminField label="Tiêu đề">
          <AdminInput placeholder="Tiêu đề chương trình" value={title} onChangeText={setTitle} />
        </AdminField>
        <AdminField label="Mô tả">
          <AdminInput placeholder="Mô tả" value={description} onChangeText={setDescription} multiline />
        </AdminField>
        <AdminField label="Cấp độ">
          <LevelPicker value={level} onChange={setLevel} />
        </AdminField>
        <AdminField label="Ảnh thumbnail">
          <AdminInput placeholder="URL ảnh" value={thumbnailUrl} onChangeText={setThumbnailUrl} autoCapitalize="none" />
        </AdminField>
      </AdminEditSheet>
    </>
  );
}

function AdminExercisesSection() {
  const { confirm, alert } = useAdminDialog();
  const [programs, setPrograms] = useState<ProgramOption[]>([]);
  const [rows, setRows] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Exercise | null>(null);
  const [programId, setProgramId] = useState('');
  const [name, setName] = useState('');
  const [duration, setDuration] = useState('45');
  const [metValue, setMetValue] = useState('5');
  const [mediaUrl, setMediaUrl] = useState('');
  const [sortOrder, setSortOrder] = useState('0');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [programRows, exerciseRows] = await Promise.all([listProgramOptions(), listExercises()]);
      setPrograms(programRows);
      setRows(exerciseRows);
      setProgramId((current) => current || programRows[0]?.id || '');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tải exercises');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const resetForm = () => {
    setName('');
    setDuration('45');
    setMetValue('5');
    setMediaUrl('');
    setSortOrder('0');
  };

  const openEdit = (item: Exercise) => {
    setEditing(item);
    setProgramId(item.program_id);
    setName(item.name);
    setDuration(String(item.duration));
    setMetValue(String(item.met_value));
    setMediaUrl(item.media_url ?? '');
    setSortOrder(String(item.sort_order ?? 0));
  };

  const buildInput = () => ({
    program_id: programId,
    name: name.trim(),
    duration: Number(duration) || 0,
    met_value: Number(metValue) || 0,
    media_url: mediaUrl.trim() || null,
    sort_order: Number(sortOrder) || 0,
  });

  const handleCreate = async () => {
    if (!programId || !name.trim()) {
      await alert({ title: 'Lỗi', message: 'Chọn program và nhập tên bài tập.' });
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await createExercise(buildInput());
      resetForm();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể thêm exercise');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!editing || !programId || !name.trim()) return;
    setSaving(true);
    try {
      await updateExercise(editing.id, buildInput());
      setEditing(null);
      resetForm();
      await load();
    } catch (err) {
      await alert({ title: 'Lỗi', message: err instanceof Error ? err.message : 'Không thể cập nhật' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, exerciseName: string) => {
    const ok = await confirm({
      title: 'Xóa exercise',
      message: `Bạn có chắc muốn xóa "${exerciseName}"?`,
      confirmLabel: 'Xóa',
      destructive: true,
    });
    if (!ok) return;
    try {
      await deleteExercise(id);
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
            <AdminField label="Program">
              <ProgramPicker programs={programs} value={programId} onChange={setProgramId} />
            </AdminField>
            <AdminField label="Tên bài tập" hint="Bắt buộc">
              <AdminInput placeholder="VD: Burpee" value={name} onChangeText={setName} />
            </AdminField>
            <AdminField label="Thời lượng (giây)">
              <AdminInput placeholder="45" value={duration} onChangeText={setDuration} keyboardType="numeric" />
            </AdminField>
            <AdminField label="MET value">
              <AdminInput placeholder="5" value={metValue} onChangeText={setMetValue} keyboardType="decimal-pad" />
            </AdminField>
            <AdminField label="Media URL" hint="Ảnh/GIF/MP4 từ Upload media">
              <AdminInput placeholder="https://..." value={mediaUrl} onChangeText={setMediaUrl} autoCapitalize="none" />
            </AdminField>
            <AdminField label="Thứ tự hiển thị">
              <AdminInput placeholder="0" value={sortOrder} onChangeText={setSortOrder} keyboardType="numeric" />
            </AdminField>
            <AdminSubmit label="Thêm exercise" loading={saving} onPress={handleCreate} />
          </>
        }
        list={
          <FlatList
            data={rows}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            renderItem={({ item, index }) => (
              <AdminListRow
                title={item.name}
                subtitle={`MET ${item.met_value} · ${item.duration}s`}
                onEdit={() => openEdit(item)}
                onDelete={() => void handleDelete(item.id, item.name)}
                isLast={index === rows.length - 1}
              />
            )}
            ListEmptyComponent={<Text style={adminStyles.emptyText}>Chưa có exercise.</Text>}
          />
        }
      />
      <AdminEditSheet
        visible={!!editing}
        title="Sửa exercise"
        loading={saving}
        onClose={() => { setEditing(null); resetForm(); }}
        onSave={handleUpdate}
      >
        <AdminField label="Program">
          <ProgramPicker programs={programs} value={programId} onChange={setProgramId} />
        </AdminField>
        <AdminField label="Tên bài tập">
          <AdminInput placeholder="Tên bài tập" value={name} onChangeText={setName} />
        </AdminField>
        <AdminField label="Thời lượng (giây)">
          <AdminInput placeholder="45" value={duration} onChangeText={setDuration} keyboardType="numeric" />
        </AdminField>
        <AdminField label="MET value">
          <AdminInput placeholder="5" value={metValue} onChangeText={setMetValue} keyboardType="decimal-pad" />
        </AdminField>
        <AdminField label="Media URL">
          <AdminInput placeholder="URL media" value={mediaUrl} onChangeText={setMediaUrl} autoCapitalize="none" />
        </AdminField>
        <AdminField label="Thứ tự hiển thị">
          <AdminInput placeholder="0" value={sortOrder} onChangeText={setSortOrder} keyboardType="numeric" />
        </AdminField>
      </AdminEditSheet>
    </>
  );
}

function AdminFoodsSection() {
  const { confirm, alert } = useAdminDialog();
  const [rows, setRows] = useState<Food[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Food | null>(null);
  const [name, setName] = useState('');
  const [servingSize, setServingSize] = useState('1 phần');
  const [calories, setCalories] = useState('200');
  const [protein, setProtein] = useState('10');
  const [carbs, setCarbs] = useState('20');
  const [fat, setFat] = useState('5');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRows(await listSystemFoods());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tải món ăn');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const resetForm = () => {
    setName('');
    setServingSize('1 phần');
    setCalories('200');
    setProtein('10');
    setCarbs('20');
    setFat('5');
  };

  const openEdit = (item: Food) => {
    setEditing(item);
    setName(item.name);
    setServingSize(item.serving_size);
    setCalories(String(item.calories));
    setProtein(String(item.protein_g));
    setCarbs(String(item.carbs_g));
    setFat(String(item.fat_g));
  };

  const buildInput = () => ({
    name: name.trim(),
    serving_size: servingSize.trim() || '1 phần',
    calories: Number(calories) || 0,
    protein_g: Number(protein) || 0,
    carbs_g: Number(carbs) || 0,
    fat_g: Number(fat) || 0,
  });

  const handleCreate = async () => {
    if (!name.trim()) {
      await alert({ title: 'Lỗi', message: 'Tên món không được để trống.' });
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await createSystemFood(buildInput());
      resetForm();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể thêm món ăn');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!editing || !name.trim()) return;
    setSaving(true);
    try {
      await updateFood(editing.id, buildInput());
      setEditing(null);
      resetForm();
      await load();
    } catch (err) {
      await alert({ title: 'Lỗi', message: err instanceof Error ? err.message : 'Không thể cập nhật' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, foodName: string) => {
    const ok = await confirm({
      title: 'Xóa món ăn',
      message: `Bạn có chắc muốn xóa "${foodName}"?`,
      confirmLabel: 'Xóa',
      destructive: true,
    });
    if (!ok) return;
    try {
      await deleteFood(id);
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
            <AdminField label="Tên món" hint="Bắt buộc">
              <AdminInput placeholder="VD: Gà luộc" value={name} onChangeText={setName} />
            </AdminField>
            <AdminField label="Khẩu phần">
              <AdminInput placeholder="1 phần" value={servingSize} onChangeText={setServingSize} />
            </AdminField>
            <AdminField label="Calories (kcal)">
              <AdminInput placeholder="200" value={calories} onChangeText={setCalories} keyboardType="numeric" />
            </AdminField>
            <AdminField label="Protein (g)">
              <AdminInput placeholder="10" value={protein} onChangeText={setProtein} keyboardType="numeric" />
            </AdminField>
            <AdminField label="Carbs (g)">
              <AdminInput placeholder="20" value={carbs} onChangeText={setCarbs} keyboardType="numeric" />
            </AdminField>
            <AdminField label="Fat (g)">
              <AdminInput placeholder="5" value={fat} onChangeText={setFat} keyboardType="numeric" />
            </AdminField>
            <AdminSubmit label="Thêm món ăn" loading={saving} onPress={handleCreate} />
          </>
        }
        list={
          <FlatList
            data={rows}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            renderItem={({ item, index }) => (
              <AdminListRow
                title={item.name}
                subtitle={`${item.calories} kcal · P${item.protein_g}/C${item.carbs_g}/F${item.fat_g}`}
                onEdit={() => openEdit(item)}
                onDelete={() => void handleDelete(item.id, item.name)}
                isLast={index === rows.length - 1}
              />
            )}
            ListEmptyComponent={<Text style={adminStyles.emptyText}>Chưa có món ăn hệ thống.</Text>}
          />
        }
      />
      <AdminEditSheet
        visible={!!editing}
        title="Sửa món ăn"
        loading={saving}
        onClose={() => { setEditing(null); resetForm(); }}
        onSave={handleUpdate}
      >
        <AdminField label="Tên món">
          <AdminInput placeholder="Tên món" value={name} onChangeText={setName} />
        </AdminField>
        <AdminField label="Khẩu phần">
          <AdminInput placeholder="Khẩu phần" value={servingSize} onChangeText={setServingSize} />
        </AdminField>
        <AdminField label="Calories (kcal)">
          <AdminInput placeholder="200" value={calories} onChangeText={setCalories} keyboardType="numeric" />
        </AdminField>
        <AdminField label="Protein (g)">
          <AdminInput placeholder="10" value={protein} onChangeText={setProtein} keyboardType="numeric" />
        </AdminField>
        <AdminField label="Carbs (g)">
          <AdminInput placeholder="20" value={carbs} onChangeText={setCarbs} keyboardType="numeric" />
        </AdminField>
        <AdminField label="Fat (g)">
          <AdminInput placeholder="5" value={fat} onChangeText={setFat} keyboardType="numeric" />
        </AdminField>
      </AdminEditSheet>
    </>
  );
}

function AdminBadgesSection() {
  const { confirm, alert } = useAdminDialog();
  const [rows, setRows] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Badge | null>(null);
  const [code, setCode] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('emoji-events');
  const [criteriaType, setCriteriaType] = useState('manual');
  const [criteriaValue, setCriteriaValue] = useState('1');
  const [sortOrder, setSortOrder] = useState('0');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRows(await listBadges());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tải badges');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const resetForm = () => {
    setCode('');
    setTitle('');
    setDescription('');
    setIcon('emoji-events');
    setCriteriaType('manual');
    setCriteriaValue('1');
    setSortOrder('0');
  };

  const openEdit = (item: Badge) => {
    setEditing(item);
    setCode(item.code);
    setTitle(item.title);
    setDescription(item.description);
    setIcon(item.icon);
    setCriteriaType(item.criteria_type);
    setCriteriaValue(String(item.criteria_value));
    setSortOrder(String(item.sort_order));
  };

  const buildInput = () => ({
    code: code.trim(),
    title: title.trim(),
    description: description.trim(),
    icon: icon.trim() || 'emoji-events',
    criteria_type: criteriaType.trim() || 'manual',
    criteria_value: Number(criteriaValue) || 0,
    sort_order: Number(sortOrder) || 0,
  });

  const handleCreate = async () => {
    if (!code.trim() || !title.trim()) {
      await alert({ title: 'Lỗi', message: 'Code và tiêu đề không được để trống.' });
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await createBadge(buildInput());
      resetForm();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể thêm badge');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!editing || !code.trim() || !title.trim()) return;
    setSaving(true);
    try {
      await updateBadge(editing.id, buildInput());
      setEditing(null);
      resetForm();
      await load();
    } catch (err) {
      await alert({ title: 'Lỗi', message: err instanceof Error ? err.message : 'Không thể cập nhật' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, badgeTitle: string) => {
    const ok = await confirm({
      title: 'Xóa badge',
      message: `Bạn có chắc muốn xóa "${badgeTitle}"?`,
      confirmLabel: 'Xóa',
      destructive: true,
    });
    if (!ok) return;
    try {
      await deleteBadge(id);
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
            <AdminField label="Code" hint="Bắt buộc, không dấu cách">
              <AdminInput placeholder="first_workout" value={code} onChangeText={setCode} autoCapitalize="none" />
            </AdminField>
            <AdminField label="Tiêu đề" hint="Bắt buộc">
              <AdminInput placeholder="Buổi tập đầu tiên" value={title} onChangeText={setTitle} />
            </AdminField>
            <AdminField label="Mô tả">
              <AdminInput placeholder="Mô tả huy hiệu" value={description} onChangeText={setDescription} multiline />
            </AdminField>
            <AdminField label="Icon">
              <AdminInput placeholder="emoji-events" value={icon} onChangeText={setIcon} autoCapitalize="none" />
            </AdminField>
            <AdminField label="Loại tiêu chí">
              <AdminInput placeholder="manual" value={criteriaType} onChangeText={setCriteriaType} autoCapitalize="none" />
            </AdminField>
            <AdminField label="Giá trị tiêu chí">
              <AdminInput placeholder="1" value={criteriaValue} onChangeText={setCriteriaValue} keyboardType="numeric" />
            </AdminField>
            <AdminField label="Thứ tự hiển thị">
              <AdminInput placeholder="0" value={sortOrder} onChangeText={setSortOrder} keyboardType="numeric" />
            </AdminField>
            <AdminSubmit label="Thêm badge" loading={saving} onPress={handleCreate} />
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
                subtitle={`${item.code} · ${item.criteria_type}/${item.criteria_value}`}
                onEdit={() => openEdit(item)}
                onDelete={() => void handleDelete(item.id, item.title)}
                isLast={index === rows.length - 1}
              />
            )}
            ListEmptyComponent={<Text style={adminStyles.emptyText}>Chưa có badge.</Text>}
          />
        }
      />
      <AdminEditSheet
        visible={!!editing}
        title="Sửa badge"
        loading={saving}
        onClose={() => { setEditing(null); resetForm(); }}
        onSave={handleUpdate}
      >
        <AdminField label="Code">
          <AdminInput placeholder="Code" value={code} onChangeText={setCode} autoCapitalize="none" />
        </AdminField>
        <AdminField label="Tiêu đề">
          <AdminInput placeholder="Tiêu đề" value={title} onChangeText={setTitle} />
        </AdminField>
        <AdminField label="Mô tả">
          <AdminInput placeholder="Mô tả" value={description} onChangeText={setDescription} multiline />
        </AdminField>
        <AdminField label="Icon">
          <AdminInput placeholder="Icon" value={icon} onChangeText={setIcon} autoCapitalize="none" />
        </AdminField>
        <AdminField label="Loại tiêu chí">
          <AdminInput placeholder="Criteria type" value={criteriaType} onChangeText={setCriteriaType} autoCapitalize="none" />
        </AdminField>
        <AdminField label="Giá trị tiêu chí">
          <AdminInput placeholder="1" value={criteriaValue} onChangeText={setCriteriaValue} keyboardType="numeric" />
        </AdminField>
        <AdminField label="Thứ tự hiển thị">
          <AdminInput placeholder="0" value={sortOrder} onChangeText={setSortOrder} keyboardType="numeric" />
        </AdminField>
      </AdminEditSheet>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.glassBorder,
  },
  headerTitle: {
    fontFamily: 'Montserrat-Bold',
    fontSize: 18,
    color: colors.onSurface,
  },
  hubIntro: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: colors.onSurfaceVariant,
    lineHeight: 20,
    marginBottom: spacing.lg,
  },
  hubCard: {
    marginBottom: spacing.md,
  },
  hubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  hubIconWrap: {
    width: 42,
    height: 42,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hubTextWrap: {
    flex: 1,
  },
  hubLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 15,
    color: colors.onSurface,
  },
  hubSub: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  statItem: {
    width: '46%',
  },
  statLabel: {
    fontFamily: 'Inter-Medium',
    fontSize: 11,
    color: colors.onSurfaceVariant,
    textTransform: 'uppercase',
  },
  statValue: {
    fontFamily: 'Montserrat-Bold',
    fontSize: 18,
    color: colors.primaryFixed,
    marginTop: 4,
  },
  metaLine: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    color: colors.onSurfaceVariant,
    lineHeight: 20,
    marginBottom: 6,
  },
});
