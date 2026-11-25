import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type {
  Category,
  DayflowDataset,
  FocusSession,
  Habit,
  Project,
  Task,
  UserPreferences,
} from '../src/types/dayflow';

export const SUPABASE_PROJECT_REF = 'xphkbboujffjcbdfantb';
export const DEFAULT_SUPABASE_URL = `https://${SUPABASE_PROJECT_REF}.supabase.co`;

export function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL?.trim() || DEFAULT_SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY?.trim() || '';
  return {
    projectRef: SUPABASE_PROJECT_REF,
    url,
    anonKey,
    configured: Boolean(url && anonKey),
  };
}

export function createAnonSupabaseClient(): SupabaseClient | null {
  const { url, anonKey, configured } = getSupabaseConfig();
  if (!configured) return null;
  return createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export function createUserSupabaseClient(accessToken: string): SupabaseClient | null {
  const { url, anonKey, configured } = getSupabaseConfig();
  if (!configured || !accessToken) return null;
  return createClient(url, anonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export async function verifyUserFromToken(accessToken: string) {
  const client = createAnonSupabaseClient();
  if (!client || !accessToken) return null;
  const { data, error } = await client.auth.getUser(accessToken);
  if (error || !data?.user) return null;
  return data.user;
}

export async function checkSchemaReady(client: SupabaseClient): Promise<boolean> {
  const { error } = await client.from('dayflow_tasks').select('id').limit(1);
  if (!error) return true;
  if (error.code === '42P01' || error.message.includes('Could not find the table')) {
    return false;
  }
  // Empty table or RLS empty result returns no error
  return true;
}

export async function loadDatasetFromSupabase(
  client: SupabaseClient,
  userId: string
): Promise<{
  isEmpty: boolean;
  preferences?: Partial<UserPreferences>;
  categories: Category[];
  projects: Project[];
  tasks: Task[];
  habits: Habit[];
  focusSessions: FocusSession[];
}> {
  const [prefRes, catRes, projRes, taskRes, habitRes, focusRes] = await Promise.all([
    client.from('dayflow_preferences').select('*').eq('user_id', userId).maybeSingle(),
    client.from('dayflow_categories').select('*').eq('user_id', userId),
    client.from('dayflow_projects').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
    client.from('dayflow_tasks').select('*').eq('user_id', userId).order('sort_order', { ascending: true }),
    client.from('dayflow_habits').select('*').eq('user_id', userId).order('created_at', { ascending: true }),
    client.from('dayflow_focus_sessions').select('*').eq('user_id', userId).order('completed_at', { ascending: false }),
  ]);

  const firstError =
    prefRes.error ||
    catRes.error ||
    projRes.error ||
    taskRes.error ||
    habitRes.error ||
    focusRes.error;
  if (firstError) {
    throw new Error(firstError.message);
  }

  const isEmpty =
    !prefRes.data &&
    (catRes.data?.length ?? 0) === 0 &&
    (projRes.data?.length ?? 0) === 0 &&
    (taskRes.data?.length ?? 0) === 0 &&
    (habitRes.data?.length ?? 0) === 0 &&
    (focusRes.data?.length ?? 0) === 0;

  const preferences: Partial<UserPreferences> | undefined = prefRes.data
    ? {
        displayName: prefRes.data.display_name,
        roleTitle: prefRes.data.role_title,
        avatarUrl: prefRes.data.avatar_url || undefined,
        theme: prefRes.data.theme,
        accentColor: prefRes.data.accent_color,
        defaultPriority: prefRes.data.default_priority,
        focusMinutes: prefRes.data.focus_minutes,
        shortBreakMinutes: prefRes.data.short_break_minutes,
        longBreakMinutes: prefRes.data.long_break_minutes,
        soundEnabled: prefRes.data.sound_enabled,
        browserNotifications: prefRes.data.browser_notifications,
        inAppReminders: prefRes.data.in_app_reminders,
        reminderLeadMinutes: prefRes.data.reminder_lead_minutes,
      }
    : undefined;

  const categories: Category[] = (catRes.data || []).map((c) => ({
    id: c.id,
    name: c.name,
    color: c.color,
    iconName: c.icon_name,
    isDefault: Boolean(c.is_default),
  }));

  const projects: Project[] = (projRes.data || []).map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description || '',
    deadline: p.deadline || '',
    color: p.color,
    status: p.status,
    createdAt: p.created_at,
  }));

  const tasks: Task[] = (taskRes.data || []).map((t) => ({
    id: t.id,
    title: t.title,
    description: t.description || '',
    dueDate: t.due_date || '',
    dueTime: t.due_time || '',
    priority: t.priority,
    categoryId: t.category_id,
    projectId: t.project_id || undefined,
    status: t.status,
    subtasks: Array.isArray(t.subtasks) ? t.subtasks : [],
    tags: Array.isArray(t.tags) ? t.tags : [],
    estimatedMinutes: t.estimated_minutes ?? 30,
    recurring: t.recurring || 'none',
    notes: t.notes || '',
    order: t.sort_order ?? 0,
    createdAt: t.created_at,
    completedAt: t.completed_at || undefined,
  }));

  const habits: Habit[] = (habitRes.data || []).map((h) => ({
    id: h.id,
    title: h.title,
    description: h.description || '',
    schedule: h.schedule,
    customDays: Array.isArray(h.custom_days) ? h.custom_days : [],
    color: h.color,
    iconName: h.icon_name,
    completedDates: Array.isArray(h.completed_dates) ? h.completed_dates : [],
    createdAt: h.created_at,
  }));

  const focusSessions: FocusSession[] = (focusRes.data || []).map((f) => ({
    id: f.id,
    taskId: f.task_id || undefined,
    taskTitle: f.task_title || undefined,
    mode: f.mode,
    durationMinutes: f.duration_minutes,
    completedAt: f.completed_at,
  }));

  return {
    isEmpty,
    preferences,
    categories,
    projects,
    tasks,
    habits,
    focusSessions,
  };
}

async function syncEntityTable(
  client: SupabaseClient,
  table: string,
  userId: string,
  rows: Array<Record<string, unknown>>
) {
  const ids = rows.map((r) => String(r.id));
  const existingRes = await client.from(table).select('id').eq('user_id', userId);
  if (existingRes.error) throw new Error(existingRes.error.message);

  const existingIds = (existingRes.data || []).map((r) => String(r.id));
  const toDelete = existingIds.filter((id) => !ids.includes(id));

  if (toDelete.length > 0) {
    const delRes = await client
      .from(table)
      .delete()
      .eq('user_id', userId)
      .in('id', toDelete);
    if (delRes.error) throw new Error(delRes.error.message);
  }

  if (rows.length > 0) {
    const upRes = await client.from(table).upsert(rows, { onConflict: 'user_id,id' });
    if (upRes.error) throw new Error(upRes.error.message);
  }
}

export async function saveDatasetToSupabase(
  client: SupabaseClient,
  userId: string,
  dataset: DayflowDataset
): Promise<void> {
  const prefPayload = {
    user_id: userId,
    display_name: dataset.preferences.displayName,
    role_title: dataset.preferences.roleTitle,
    avatar_url: dataset.preferences.avatarUrl,
    theme: dataset.preferences.theme,
    accent_color: dataset.preferences.accentColor,
    default_priority: dataset.preferences.defaultPriority,
    focus_minutes: dataset.preferences.focusMinutes,
    short_break_minutes: dataset.preferences.shortBreakMinutes,
    long_break_minutes: dataset.preferences.longBreakMinutes,
    sound_enabled: dataset.preferences.soundEnabled,
    browser_notifications: dataset.preferences.browserNotifications,
    in_app_reminders: dataset.preferences.inAppReminders,
    reminder_lead_minutes: dataset.preferences.reminderLeadMinutes,
    updated_at: new Date().toISOString(),
  };

  const prefRes = await client
    .from('dayflow_preferences')
    .upsert(prefPayload, { onConflict: 'user_id' });
  if (prefRes.error) throw new Error(prefRes.error.message);

  await Promise.all([
    syncEntityTable(
      client,
      'dayflow_categories',
      userId,
      dataset.categories.map((c) => ({
        user_id: userId,
        id: c.id,
        name: c.name,
        color: c.color,
        icon_name: c.iconName,
        is_default: Boolean(c.isDefault),
      }))
    ),
    syncEntityTable(
      client,
      'dayflow_projects',
      userId,
      dataset.projects.map((p) => ({
        user_id: userId,
        id: p.id,
        name: p.name,
        description: p.description,
        deadline: p.deadline,
        color: p.color,
        status: p.status,
        created_at: p.createdAt,
      }))
    ),
    syncEntityTable(
      client,
      'dayflow_tasks',
      userId,
      dataset.tasks.map((t) => ({
        user_id: userId,
        id: t.id,
        title: t.title,
        description: t.description,
        due_date: t.dueDate,
        due_time: t.dueTime,
        priority: t.priority,
        category_id: t.categoryId,
        project_id: t.projectId || null,
        status: t.status,
        subtasks: t.subtasks,
        tags: t.tags,
        estimated_minutes: t.estimatedMinutes,
        recurring: t.recurring,
        notes: t.notes,
        sort_order: t.order,
        created_at: t.createdAt,
        completed_at: t.completedAt || null,
      }))
    ),
    syncEntityTable(
      client,
      'dayflow_habits',
      userId,
      dataset.habits.map((h) => ({
        user_id: userId,
        id: h.id,
        title: h.title,
        description: h.description,
        schedule: h.schedule,
        custom_days: h.customDays,
        color: h.color,
        icon_name: h.iconName,
        completed_dates: h.completedDates,
        created_at: h.createdAt,
      }))
    ),
    syncEntityTable(
      client,
      'dayflow_focus_sessions',
      userId,
      dataset.focusSessions.map((f) => ({
        user_id: userId,
        id: f.id,
        task_id: f.taskId || null,
        task_title: f.taskTitle || null,
        mode: f.mode,
        duration_minutes: f.durationMinutes,
        completed_at: f.completedAt,
      }))
    ),
  ]);
}
