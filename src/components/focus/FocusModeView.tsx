import { useMemo, useState } from 'react';
import {
  Maximize2,
  Minimize2,
  Pause,
  Play,
  RotateCcw,
  Trash2,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useDayflow } from '../../context/DayflowContext';
import { FocusModeType } from '../../types/dayflow';

export function FocusModeView() {
  const {
    dataset,
    timer,
    startTimer,
    pauseTimer,
    resetTimer,
    switchTimerMode,
    setCustomTimerMinutes,
    setTimerLinkedTask,
    deleteFocusSession,
    updatePreferences,
  } = useDayflow();

  const [fullscreenActive, setFullscreenActive] = useState(false);
  const [customInput, setCustomInput] = useState('45');

  const pendingTasks = useMemo(
    () => dataset.tasks.filter((t) => t.status !== 'completed'),
    [dataset.tasks]
  );

  const totalFocusMinutes = useMemo(
    () =>
      dataset.focusSessions
        .filter((s) => s.mode === 'focus')
        .reduce((sum, s) => sum + s.durationMinutes, 0),
    [dataset.focusSessions]
  );

  const minutes = Math.floor(timer.remainingSeconds / 60);
  const seconds = timer.remainingSeconds % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  const progress =
    timer.totalSeconds > 0
      ? ((timer.totalSeconds - timer.remainingSeconds) / timer.totalSeconds) * 100
      : 0;
  const radius = 112;
  const circumference = 2 * Math.PI * radius;
  const strokeOffset = circumference - (progress / 100) * circumference;

  const toggleFullscreen = async () => {
    if (!fullscreenActive) {
      setFullscreenActive(true);
      try {
        if (document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen();
        }
      } catch {
        // Overlay fullscreen fallback works cleanly even inside sandboxed iframes
      }
    } else {
      setFullscreenActive(false);
      try {
        if (document.fullscreenElement && document.exitFullscreen) {
          await document.exitFullscreen();
        }
      } catch {
        // Ignore
      }
    }
  };

  const applyCustomMinutes = () => {
    const val = Number(customInput);
    if (!Number.isNaN(val) && val >= 1 && val <= 180) {
      setCustomTimerMinutes(val);
    }
  };

  const modeTabs: Array<{ id: FocusModeType; label: string; mins: number }> = [
    { id: 'focus', label: 'Focus', mins: dataset.preferences.focusMinutes },
    { id: 'short_break', label: 'Short Break', mins: dataset.preferences.shortBreakMinutes },
    { id: 'long_break', label: 'Long Break', mins: dataset.preferences.longBreakMinutes },
  ];

  const timerPanel = (
    <div
      className={`flex flex-col items-center justify-center rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-[#17171b] ${
        fullscreenActive
          ? 'fixed inset-0 z-50 rounded-none border-none bg-white dark:bg-[#0f0f12]'
          : ''
      }`}
    >
      {/* Top Bar inside Focus Panel */}
      <div className="flex w-full max-w-xl items-center justify-between">
        <div className="inline-flex rounded-lg border border-zinc-200 bg-zinc-100/80 p-0.5 dark:border-zinc-800 dark:bg-zinc-900">
          {modeTabs.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => switchTimerMode(m.id)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                timer.mode === m.id && timer.customMinutes === null
                  ? 'bg-white text-zinc-900 shadow-xs dark:bg-zinc-800 dark:text-zinc-100'
                  : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200'
              }`}
            >
              {m.label} ({m.mins}m)
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() =>
              updatePreferences({ soundEnabled: !dataset.preferences.soundEnabled })
            }
            className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
            title={
              dataset.preferences.soundEnabled
                ? 'Mute completion sound'
                : 'Enable completion sound'
            }
            aria-label="Toggle timer sound"
          >
            {dataset.preferences.soundEnabled ? (
              <Volume2 className="h-4 w-4" />
            ) : (
              <VolumeX className="h-4 w-4" />
            )}
          </button>
          <button
            type="button"
            onClick={toggleFullscreen}
            className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
            title={fullscreenActive ? 'Exit distraction-free mode' : 'Fullscreen focus mode'}
            aria-label="Toggle fullscreen focus mode"
          >
            {fullscreenActive ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      {/* Circular Countdown */}
      <div className="relative my-8 flex h-64 w-64 items-center justify-center">
        <svg className="h-64 w-64 -rotate-90" viewBox="0 0 256 256">
          <circle
            cx="128"
            cy="128"
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            className="text-zinc-100 dark:text-zinc-800"
          />
          <circle
            cx="128"
            cy="128"
            r={radius}
            fill="none"
            stroke="var(--df-accent)"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeOffset}
            className="transition-[stroke-dashoffset] duration-500 ease-linear"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="font-mono text-5xl font-semibold tracking-tight tabular-nums text-zinc-900 dark:text-zinc-50">
            {formattedTime}
          </span>
          <span className="mt-2 text-xs font-medium capitalize text-zinc-500 dark:text-zinc-400">
            {timer.mode.replace('_', ' ')}
            {timer.isRunning ? ' · Active' : ' · Ready'}
          </span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3">
        {timer.isRunning ? (
          <button
            type="button"
            onClick={pauseTimer}
            className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-100 px-6 py-2.5 text-sm font-semibold text-zinc-900 transition-colors hover:bg-zinc-200 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
          >
            <Pause className="h-4 w-4" />
            <span>Pause</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={startTimer}
            className="inline-flex items-center gap-2 rounded-xl df-accent-bg px-7 py-2.5 text-sm font-semibold text-white shadow-sm transition-transform active:scale-[0.98]"
          >
            <Play className="h-4 w-4" />
            <span>Start Session</span>
          </button>
        )}

        <button
          type="button"
          onClick={resetTimer}
          className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 px-4 py-2.5 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          <RotateCcw className="h-4 w-4" />
          <span>Reset</span>
        </button>
      </div>

      {/* Task Binding & Custom Duration */}
      <div className="mt-8 grid w-full max-w-lg grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="sm:col-span-2">
          <label className="mb-1 block text-[11px] font-medium text-zinc-500">
            Working on task
          </label>
          <select
            value={timer.linkedTaskId}
            onChange={(e) => setTimerLinkedTask(e.target.value)}
            className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
          >
            <option value="">General deep work (no task linked)</option>
            {pendingTasks.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-[11px] font-medium text-zinc-500">
            Custom minutes
          </label>
          <div className="flex items-center gap-1.5">
            <input
              type="number"
              min={1}
              max={180}
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              className="w-full rounded-lg border border-zinc-200 bg-transparent px-2.5 py-2 font-mono text-xs tabular-nums text-zinc-900 dark:border-zinc-800 dark:text-zinc-100"
            />
            <button
              type="button"
              onClick={applyCustomMinutes}
              className="shrink-0 rounded-lg border border-zinc-200 px-2.5 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Set
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">{timerPanel}</div>

        {/* Session History & Total Focus */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-[#17171b]">
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Total Focus Time</p>
            <p className="mt-1 font-mono text-3xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
              {Math.floor(totalFocusMinutes / 60)}h {totalFocusMinutes % 60}m
            </p>
            <p className="mt-1 font-mono text-xs tabular-nums text-zinc-500">
              {dataset.focusSessions.filter((s) => s.mode === 'focus').length} completed focus sessions
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-[#17171b]">
            <h3 className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Session History
            </h3>

            {dataset.focusSessions.length === 0 ? (
              <p className="py-6 text-center text-xs text-zinc-500">
                Complete a focus timer session to see your history here.
              </p>
            ) : (
              <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
                {dataset.focusSessions.map((session) => (
                  <div
                    key={session.id}
                    className="flex items-start justify-between gap-2 rounded-lg border border-zinc-100 p-2.5 dark:border-zinc-800/80"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-zinc-900 dark:text-zinc-100">
                        {session.taskTitle || 'Deep Work Session'}
                      </p>
                      <p className="mt-0.5 font-mono text-[11px] tabular-nums text-zinc-500">
                        {session.durationMinutes}m ·{' '}
                        {new Date(session.completedAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => deleteFocusSession(session.id)}
                      className="rounded p-1 text-zinc-400 hover:text-red-500"
                      aria-label="Delete session record"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
