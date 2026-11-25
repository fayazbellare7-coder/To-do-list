import React, { useRef, useState } from 'react';
import {
  Bell,
  Check,
  Cloud,
  Copy,
  Database,
  Download,
  LogOut,
  RefreshCw,
  RotateCcw,
  Trash2,
  Upload,
} from 'lucide-react';
import { useDayflow } from '../../context/DayflowContext';
import {
  AccentColor,
  PriorityLevel,
  ThemePreference,
} from '../../types/dayflow';
import {
  DEFAULT_AVATAR_URL,
  exportTasksToCSV,
  validateImportedDataset,
} from '../../services/storageService';
import { ConfirmDialog } from '../common/ConfirmDialog';

const ACCENTS: Array<{ id: AccentColor; label: string; hex: string }> = [
  { id: 'violet', label: 'Violet', hex: '#7c3aed' },
  { id: 'indigo', label: 'Indigo', hex: '#4f46e5' },
  { id: 'blue', label: 'Blue', hex: '#2563eb' },
  { id: 'emerald', label: 'Emerald', hex: '#059669' },
  { id: 'rose', label: 'Rose', hex: '#e11d48' },
];

export function SettingsView() {
  const {
    dataset,
    updatePreferences,
    importDataset,
    resetDataset,
    pushToast,
    supabaseStatus,
    refreshSupabaseStatus,
    cloudUser,
    cloudSyncState,
    cloudSyncError,
    lastSyncedAt,
    signInCloud,
    signUpCloud,
    signOutCloud,
    syncNowToCloud,
    pullFromCloud,
  } = useDayflow();

  const prefs = dataset.preferences;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [importError, setImportError] = useState('');
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);
  const [confirmSampleOpen, setConfirmSampleOpen] = useState(false);

  // Supabase Auth form state
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authMessage, setAuthMessage] = useState('');
  const [authError, setAuthError] = useState('');
  const [showSchemaSql, setShowSchemaSql] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthMessage('');
    if (!authEmail.trim() || authPassword.length < 6) {
      setAuthError('Enter a valid email and a password of at least 6 characters.');
      return;
    }
    setAuthLoading(true);
    try {
      if (authMode === 'signin') {
        await signInCloud(authEmail.trim(), authPassword);
        setAuthPassword('');
      } else {
        const res = await signUpCloud(authEmail.trim(), authPassword);
        if (res.needsEmailConfirmation) {
          setAuthMessage('Account created. Check your inbox to confirm your email, then sign in.');
        } else {
          setAuthPassword('');
        }
      }
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Authentication failed.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleCopySql = async () => {
    if (!supabaseStatus?.sqlSchema) return;
    try {
      await navigator.clipboard.writeText(supabaseStatus.sqlSchema);
      setCopiedSql(true);
      setTimeout(() => setCopiedSql(false), 2000);
      pushToast({ message: 'Copied supabase/schema.sql to clipboard', tone: 'success' });
    } catch {
      pushToast({ message: 'Select and copy the SQL manually below' });
    }
  };

  const handleBrowserNotificationToggle = async () => {
    if (!prefs.browserNotifications) {
      if (typeof Notification === 'undefined') {
        pushToast({ message: 'Browser notifications are not supported here' });
        return;
      }
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        updatePreferences({ browserNotifications: true });
        pushToast({ message: 'Browser notifications enabled', tone: 'success' });
      } else {
        updatePreferences({ browserNotifications: false });
        pushToast({ message: 'Browser notification permission denied' });
      }
    } else {
      updatePreferences({ browserNotifications: false });
    }
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1_000_000) {
      pushToast({ message: 'Please choose an image smaller than 1 MB' });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        updatePreferences({ avatarUrl: reader.result });
        pushToast({ message: 'Profile picture updated', tone: 'success' });
      }
    };
    reader.readAsDataURL(file);
  };

  const downloadFile = (content: string, filename: string, mime: string) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportJSON = () => {
    downloadFile(
      JSON.stringify(dataset, null, 2),
      `dayflow-backup-${new Date().toISOString().slice(0, 10)}.json`,
      'application/json'
    );
    pushToast({ message: 'Exported Dayflow JSON backup', tone: 'success' });
  };

  const handleExportCSV = () => {
    const csv = exportTasksToCSV(dataset.tasks, dataset.categories, dataset.projects);
    downloadFile(
      csv,
      `dayflow-tasks-${new Date().toISOString().slice(0, 10)}.csv`,
      'text/csv;charset=utf-8;'
    );
    pushToast({ message: 'Exported tasks to CSV', tone: 'success' });
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImportError('');
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const raw = JSON.parse(String(reader.result || ''));
        const validated = validateImportedDataset(raw);
        if (!validated) {
          setImportError('Invalid Dayflow JSON backup format.');
          return;
        }
        importDataset(validated);
      } catch {
        setImportError('Could not parse JSON file.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h2 className="font-display text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          Settings
        </h2>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Customize your profile, cloud backend sync, appearance, timer defaults, and backups
        </p>
      </div>

      {/* Supabase Cloud Backend */}
      <section className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-[#17171b]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg df-accent-soft df-accent-text">
              <Database className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Supabase Cloud Backend
              </h3>
              <p className="mt-0.5 font-mono text-xs text-zinc-500 dark:text-zinc-400">
                Project: {supabaseStatus?.projectRef || 'xphkbboujffjcbdfantb'} ·{' '}
                {supabaseStatus?.url || 'https://xphkbboujffjcbdfantb.supabase.co'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={refreshSupabaseStatus}
            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Check Status</span>
          </button>
        </div>

        {/* Configuration / Schema readiness notices */}
        {supabaseStatus && !supabaseStatus.configured ? (
          <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs text-amber-800 dark:text-amber-300">
            <p className="font-semibold">Add SUPABASE_ANON_KEY in AI Studio Secrets</p>
            <p className="mt-1 leading-relaxed opacity-90">
              Open <strong>Settings &gt; Secrets</strong> in AI Studio and set{' '}
              <code className="font-mono">SUPABASE_ANON_KEY</code> from your Supabase project API settings (and optionally{' '}
              <code className="font-mono">SUPABASE_URL</code>). Then click <strong>Check Status</strong>.
            </p>
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            {supabaseStatus && !supabaseStatus.schemaReady && (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs text-amber-800 dark:text-amber-300">
                <p className="font-semibold">Database tables not initialized yet</p>
                <p className="mt-1 opacity-90">
                  Copy and execute the SQL schema in your Supabase Dashboard &rarr; SQL Editor once, then click Check Status.
                </p>
              </div>
            )}

            {/* Auth or Connected State */}
            {cloudUser ? (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <Cloud className="h-4 w-4 text-emerald-500" />
                    <div>
                      <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                        Signed in as {cloudUser.email}
                      </p>
                      <p className="font-mono text-[11px] text-zinc-500 dark:text-zinc-400">
                        Status:{' '}
                        {cloudSyncState === 'syncing'
                          ? 'Syncing...'
                          : cloudSyncState === 'error'
                          ? 'Sync error'
                          : 'Auto-sync active'}
                        {lastSyncedAt
                          ? ` · Last synced ${new Date(lastSyncedAt).toLocaleTimeString()}`
                          : ''}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={syncNowToCloud}
                      disabled={cloudSyncState === 'syncing'}
                      className="inline-flex items-center gap-1.5 rounded-lg df-accent-bg px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
                    >
                      <Upload className="h-3.5 w-3.5" />
                      <span>Push Now</span>
                    </button>
                    <button
                      type="button"
                      onClick={pullFromCloud}
                      disabled={cloudSyncState === 'syncing'}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>Pull</span>
                    </button>
                    <button
                      type="button"
                      onClick={signOutCloud}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                    >
                      <LogOut className="h-3.5 w-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>

                {cloudSyncError && (
                  <p className="mt-2.5 text-xs font-medium text-red-600 dark:text-red-400">
                    {cloudSyncError}
                  </p>
                )}
              </div>
            ) : (
              <form
                onSubmit={handleAuthSubmit}
                className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800"
              >
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                    {authMode === 'signin'
                      ? 'Sign in to sync with Supabase'
                      : 'Create Supabase account'}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode((m) => (m === 'signin' ? 'signup' : 'signin'));
                      setAuthError('');
                      setAuthMessage('');
                    }}
                    className="text-xs font-medium df-accent-text hover:underline"
                  >
                    {authMode === 'signin' ? 'Need an account? Sign up' : 'Already have an account? Sign in'}
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <input
                    type="email"
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    placeholder="Email address"
                    className="rounded-lg border border-zinc-200 bg-transparent px-3 py-2 text-xs text-zinc-900 dark:border-zinc-800 dark:text-zinc-100"
                  />
                  <input
                    type="password"
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    placeholder="Password (min 6 chars)"
                    className="rounded-lg border border-zinc-200 bg-transparent px-3 py-2 text-xs text-zinc-900 dark:border-zinc-800 dark:text-zinc-100"
                  />
                  <button
                    type="submit"
                    disabled={authLoading}
                    className="rounded-lg df-accent-bg px-4 py-2 text-xs font-medium text-white disabled:opacity-50"
                  >
                    {authLoading
                      ? 'Connecting...'
                      : authMode === 'signin'
                      ? 'Sign In & Sync'
                      : 'Create Account'}
                  </button>
                </div>

                {authError && (
                  <p className="mt-2 text-xs font-medium text-red-600 dark:text-red-400">
                    {authError}
                  </p>
                )}
                {authMessage && (
                  <p className="mt-2 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                    {authMessage}
                  </p>
                )}
              </form>
            )}
          </div>
        )}

        {/* SQL Schema Helper */}
        {supabaseStatus?.sqlSchema && (
          <div className="mt-4 border-t border-zinc-100 pt-3 dark:border-zinc-800">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setShowSchemaSql((p) => !p)}
                className="text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
              >
                {showSchemaSql ? 'Hide SQL Schema' : 'View Supabase SQL Schema (supabase/schema.sql)'}
              </button>
              <button
                type="button"
                onClick={handleCopySql}
                className="inline-flex items-center gap-1.5 rounded-md border border-zinc-200 px-2.5 py-1 text-[11px] font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                {copiedSql ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                <span>{copiedSql ? 'Copied' : 'Copy SQL Schema'}</span>
              </button>
            </div>
            {showSchemaSql && (
              <pre className="mt-3 max-h-60 overflow-auto rounded-lg border border-zinc-200 bg-zinc-50 p-3 font-mono text-[11px] leading-relaxed text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
                {supabaseStatus.sqlSchema}
              </pre>
            )}
          </div>
        )}
      </section>

      {/* Profile */}
      <section className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-[#17171b]">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          Profile Customization
        </h3>
        <div className="mt-4 flex flex-col gap-5 sm:flex-row sm:items-center">
          <div className="flex items-center gap-4">
            <img
              src={prefs.avatarUrl || DEFAULT_AVATAR_URL}
              alt={prefs.displayName}
              referrerPolicy="no-referrer"
              className="h-16 w-16 rounded-full object-cover ring-1 ring-zinc-200 dark:ring-zinc-700"
            />
            <div className="space-y-1.5">
              <label className="inline-block cursor-pointer rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800">
                Upload photo
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                />
              </label>
              <button
                type="button"
                onClick={() => updatePreferences({ avatarUrl: DEFAULT_AVATAR_URL })}
                className="block text-[11px] text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
              >
                Reset default portrait
              </button>
            </div>
          </div>

          <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-500">
                Display name
              </label>
              <input
                type="text"
                value={prefs.displayName}
                onChange={(e) => updatePreferences({ displayName: e.target.value })}
                className="w-full rounded-lg border border-zinc-200 bg-transparent px-3 py-2 text-sm text-zinc-900 dark:border-zinc-800 dark:text-zinc-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-500">
                Role / Tagline
              </label>
              <input
                type="text"
                value={prefs.roleTitle}
                onChange={(e) => updatePreferences({ roleTitle: e.target.value })}
                className="w-full rounded-lg border border-zinc-200 bg-transparent px-3 py-2 text-sm text-zinc-900 dark:border-zinc-800 dark:text-zinc-100"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Theme & Accent */}
      <section className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-[#17171b]">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          Appearance
        </h3>
        <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <p className="mb-2 text-xs font-medium text-zinc-500">Theme mode</p>
            <div className="inline-flex rounded-lg border border-zinc-200 bg-zinc-100/80 p-0.5 dark:border-zinc-800 dark:bg-zinc-900">
              {(['light', 'dark', 'system'] as ThemePreference[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => updatePreferences({ theme: mode })}
                  className={`rounded-md px-3.5 py-1.5 text-xs font-medium capitalize transition-colors ${
                    prefs.theme === mode
                      ? 'bg-white text-zinc-900 shadow-xs dark:bg-zinc-800 dark:text-zinc-100'
                      : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-medium text-zinc-500">Accent color</p>
            <div className="flex flex-wrap items-center gap-2.5">
              {ACCENTS.map((acc) => (
                <button
                  key={acc.id}
                  type="button"
                  onClick={() => updatePreferences({ accentColor: acc.id })}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${
                    prefs.accentColor === acc.id
                      ? 'border-zinc-900 bg-zinc-100 text-zinc-900 dark:border-zinc-100 dark:bg-zinc-800 dark:text-zinc-100'
                      : 'border-zinc-200 text-zinc-600 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-400'
                  }`}
                >
                  <span
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: acc.hex }}
                  />
                  <span>{acc.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Productivity & Notifications */}
      <section className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-[#17171b]">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          Tasks, Focus &amp; Notifications
        </h3>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-500">
              Default task priority
            </label>
            <select
              value={prefs.defaultPriority}
              onChange={(e) =>
                updatePreferences({ defaultPriority: e.target.value as PriorityLevel })
              }
              className="w-full rounded-lg border border-zinc-200 bg-white px-2.5 py-2 text-xs text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
            >
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-500">
              Focus (min)
            </label>
            <input
              type="number"
              min={5}
              max={120}
              value={prefs.focusMinutes}
              onChange={(e) =>
                updatePreferences({ focusMinutes: Math.max(5, Number(e.target.value) || 25) })
              }
              className="w-full rounded-lg border border-zinc-200 bg-transparent px-2.5 py-2 font-mono text-xs tabular-nums text-zinc-900 dark:border-zinc-800 dark:text-zinc-100"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-500">
              Short break (min)
            </label>
            <input
              type="number"
              min={1}
              max={30}
              value={prefs.shortBreakMinutes}
              onChange={(e) =>
                updatePreferences({
                  shortBreakMinutes: Math.max(1, Number(e.target.value) || 5),
                })
              }
              className="w-full rounded-lg border border-zinc-200 bg-transparent px-2.5 py-2 font-mono text-xs tabular-nums text-zinc-900 dark:border-zinc-800 dark:text-zinc-100"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-500">
              Long break (min)
            </label>
            <input
              type="number"
              min={5}
              max={60}
              value={prefs.longBreakMinutes}
              onChange={(e) =>
                updatePreferences({
                  longBreakMinutes: Math.max(5, Number(e.target.value) || 15),
                })
              }
              className="w-full rounded-lg border border-zinc-200 bg-transparent px-2.5 py-2 font-mono text-xs tabular-nums text-zinc-900 dark:border-zinc-800 dark:text-zinc-100"
            />
          </div>
        </div>

        <div className="mt-5 space-y-3 border-t border-zinc-100 pt-4 dark:border-zinc-800">
          <label className="flex items-center justify-between gap-4 text-xs">
            <div>
              <p className="font-medium text-zinc-900 dark:text-zinc-100">
                In-app deadline &amp; habit reminders
              </p>
              <p className="text-zinc-500">
                Display overdue tasks, upcoming deadlines, and daily summaries in the header bell
              </p>
            </div>
            <input
              type="checkbox"
              checked={prefs.inAppReminders}
              onChange={(e) => updatePreferences({ inAppReminders: e.target.checked })}
              className="h-4 w-4 accent-violet-600"
            />
          </label>

          <label className="flex items-center justify-between gap-4 text-xs">
            <div>
              <p className="font-medium text-zinc-900 dark:text-zinc-100">
                Sound alerts on completion
              </p>
              <p className="text-zinc-500">
                Play subtle chime when focus sessions finish or tasks are checked off
              </p>
            </div>
            <input
              type="checkbox"
              checked={prefs.soundEnabled}
              onChange={(e) => updatePreferences({ soundEnabled: e.target.checked })}
              className="h-4 w-4 accent-violet-600"
            />
          </label>

          <div className="flex items-center justify-between gap-4 text-xs">
            <div>
              <p className="font-medium text-zinc-900 dark:text-zinc-100">
                Browser push notifications (while Dayflow is open)
              </p>
              <p className="text-zinc-500">
                Requires browser permission; reminders notify while this tab stays open
              </p>
            </div>
            <button
              type="button"
              onClick={handleBrowserNotificationToggle}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium ${
                prefs.browserNotifications
                  ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                  : 'border-zinc-200 text-zinc-700 dark:border-zinc-700 dark:text-zinc-300'
              }`}
            >
              <Bell className="h-3.5 w-3.5" />
              <span>{prefs.browserNotifications ? 'Enabled' : 'Enable'}</span>
            </button>
          </div>
        </div>
      </section>

      {/* Data Management */}
      <section className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-[#17171b]">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          Data Backup &amp; Reset
        </h3>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          All data is persisted locally in your browser. Export backups anytime or import a previous snapshot.
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleExportJSON}
            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 px-3.5 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export JSON</span>
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 px-3.5 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export CSV</span>
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 px-3.5 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            <Upload className="h-3.5 w-3.5" />
            <span>Import JSON</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            onChange={handleImportJSON}
            className="hidden"
          />

          <button
            type="button"
            onClick={() => setConfirmSampleOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 px-3.5 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Restore Sample Workspace</span>
          </button>

          <button
            type="button"
            onClick={() => setConfirmClearOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-3.5 py-2 text-xs font-medium text-red-600 hover:bg-red-500/15 dark:text-red-400"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Reset All Data</span>
          </button>
        </div>

        {importError && (
          <p className="mt-2.5 text-xs font-medium text-red-600 dark:text-red-400">
            {importError}
          </p>
        )}
      </section>

      <ConfirmDialog
        open={confirmClearOpen}
        title="Clear all workspace data?"
        description="This permanently removes all tasks, projects, habits, and focus sessions stored in this browser."
        confirmLabel="Clear Everything"
        onConfirm={() => {
          resetDataset(false);
          setConfirmClearOpen(false);
        }}
        onCancel={() => setConfirmClearOpen(false)}
      />

      <ConfirmDialog
        open={confirmSampleOpen}
        title="Restore sample workspace?"
        description="Your current tasks and habits will be replaced with Dayflow's starter dataset."
        confirmLabel="Restore Sample Data"
        destructive={false}
        onConfirm={() => {
          resetDataset(true);
          setConfirmSampleOpen(false);
        }}
        onCancel={() => setConfirmSampleOpen(false)}
      />
    </div>
  );
}
