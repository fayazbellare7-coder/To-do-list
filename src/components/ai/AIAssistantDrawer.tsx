import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  AlertCircle,
  BarChart3,
  CalendarClock,
  Check,
  Loader2,
  Wand2,
  X,
} from 'lucide-react';
import { useDayflow } from '../../context/DayflowContext';
import {
  fetchAiStatus,
  generateAiSchedule,
  generateAiTaskPlan,
  generateAiWeeklySummary,
} from '../../services/aiService';
import {
  AIPlanResponse,
  AIScheduleResponse,
  AIWeeklySummaryResponse,
  PriorityLevel,
} from '../../types/dayflow';
import { addDaysStr, getTodayStr, PRIORITY_META } from '../../utils/dateUtils';

type AssistantTab = 'planner' | 'schedule' | 'summary';

export function AIAssistantDrawer() {
  const {
    dataset,
    aiAssistantOpen,
    setAiAssistantOpen,
    addMultipleTasks,
    pushToast,
  } = useDayflow();

  const [tab, setTab] = useState<AssistantTab>('planner');
  const [aiAvailable, setAiAvailable] = useState<boolean | null>(null);

  // Planner state
  const [prompt, setPrompt] = useState('');
  const [planLoading, setPlanLoading] = useState(false);
  const [planError, setPlanError] = useState('');
  const [planResult, setPlanResult] = useState<AIPlanResponse | null>(null);
  const [selectedDraftIndices, setSelectedDraftIndices] = useState<number[]>([]);

  // Schedule state
  const [schedLoading, setSchedLoading] = useState(false);
  const [schedError, setSchedError] = useState('');
  const [schedResult, setSchedResult] = useState<AIScheduleResponse | null>(null);

  // Summary state
  const [sumLoading, setSumLoading] = useState(false);
  const [sumError, setSumError] = useState('');
  const [sumResult, setSumResult] = useState<AIWeeklySummaryResponse | null>(null);

  useEffect(() => {
    if (aiAssistantOpen) {
      fetchAiStatus().then((s) => setAiAvailable(s.available));
    }
  }, [aiAssistantOpen]);

  const weeklyMetrics = useMemo(() => {
    const today = getTodayStr();
    const weekAgo = addDaysStr(today, -6);
    const recentHistory = dataset.productivityHistory.filter((d) => d.date >= weekAgo);
    const completedThisWeek = recentHistory.reduce((s, d) => s + d.tasksCompleted, 0);
    const focusMinThisWeek = recentHistory.reduce((s, d) => s + d.focusMinutes, 0);
    const habitsCompletedThisWeek = recentHistory.reduce((s, d) => s + d.habitsCompleted, 0);
    const pendingCount = dataset.tasks.filter((t) => t.status !== 'completed').length;
    const overdueCount = dataset.tasks.filter(
      (t) => t.status !== 'completed' && t.dueDate && t.dueDate < today
    ).length;

    return {
      period: `${weekAgo} to ${today}`,
      tasksCompleted: completedThisWeek,
      pendingTasks: pendingCount,
      overdueTasks: overdueCount,
      focusMinutes: focusMinThisWeek,
      habitCheckIns: habitsCompletedThisWeek,
      totalHabits: dataset.habits.length,
      dailyBreakdown: recentHistory,
    };
  }, [dataset]);

  const handleGeneratePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) {
      setPlanError('Describe your goal or assignment first.');
      return;
    }
    setPlanLoading(true);
    setPlanError('');
    setPlanResult(null);
    try {
      const result = await generateAiTaskPlan(
        prompt,
        dataset.categories.map((c) => c.name)
      );
      setPlanResult(result);
      setSelectedDraftIndices(result.tasks.map((_, i) => i));
    } catch (err) {
      setPlanError(err instanceof Error ? err.message : 'Failed to generate plan.');
    } finally {
      setPlanLoading(false);
    }
  };

  const handleApprovePlan = () => {
    if (!planResult) return;
    const chosen = planResult.tasks.filter((_, idx) => selectedDraftIndices.includes(idx));
    if (chosen.length === 0) return;

    const mapped = chosen.map((draft) => {
      const cat = dataset.categories.find(
        (c) => c.name.toLowerCase() === (draft.categoryName || '').toLowerCase()
      );
      const validPriority: PriorityLevel = ['urgent', 'high', 'medium', 'low'].includes(
        draft.priority
      )
        ? draft.priority
        : dataset.preferences.defaultPriority;
      return {
        title: draft.title,
        description: draft.description || '',
        dueDate: /^\d{4}-\d{2}-\d{2}$/.test(draft.dueDate) ? draft.dueDate : getTodayStr(),
        dueTime: /^\d{2}:\d{2}$/.test(draft.dueTime || '') ? draft.dueTime : '',
        priority: validPriority,
        categoryId: cat?.id || dataset.categories[0]?.id || 'cat-personal',
        estimatedMinutes: Number(draft.estimatedMinutes) || 30,
        tags: Array.isArray(draft.tags) ? draft.tags : [],
        subtasks: Array.isArray(draft.subtasks)
          ? draft.subtasks.map((st, idx) => ({
              id: `st-plan-${Date.now().toString(36)}-${idx}`,
              title: st,
              completed: false,
            }))
          : [],
      };
    });

    addMultipleTasks(mapped);
    pushToast({
      message: `Added ${mapped.length} AI-planned task${mapped.length > 1 ? 's' : ''}`,
      tone: 'success',
    });
    setPlanResult(null);
    setPrompt('');
    setAiAssistantOpen(false);
  };

  const handleGenerateSchedule = async () => {
    setSchedLoading(true);
    setSchedError('');
    try {
      const res = await generateAiSchedule(dataset.tasks);
      setSchedResult(res);
    } catch (err) {
      setSchedError(err instanceof Error ? err.message : 'Failed to build schedule.');
    } finally {
      setSchedLoading(false);
    }
  };

  const handleGenerateSummary = async () => {
    setSumLoading(true);
    setSumError('');
    try {
      const res = await generateAiWeeklySummary(weeklyMetrics);
      setSumResult(res);
    } catch (err) {
      setSumError(err instanceof Error ? err.message : 'Failed to summarize productivity.');
    } finally {
      setSumLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {aiAssistantOpen && (
        <div
          className="fixed inset-0 z-50 flex justify-end"
          role="dialog"
          aria-modal="true"
          aria-label="AI Productivity Assistant"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setAiAssistantOpen(false)}
            className="fixed inset-0 bg-black/50 backdrop-blur-[2px]"
          />

          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 flex h-full w-full max-w-xl flex-col border-l border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-[#16161a]"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-3.5 dark:border-zinc-800">
              <div className="flex items-center gap-2.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg df-accent-soft df-accent-text">
                  <Wand2 className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    AI Productivity Assistant
                  </h2>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    Review and approve suggestions before adding to your workspace
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAiAssistantOpen(false)}
                className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                aria-label="Close AI assistant"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Unavailable Notice */}
            {aiAvailable === false && (
              <div className="mx-5 mt-4 flex items-start gap-2.5 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-300">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <p className="font-semibold">AI key not configured in Secrets</p>
                  <p className="mt-0.5 opacity-90">
                    Set <code className="font-mono">GEMINI_API_KEY</code> in AI Studio Secrets to enable AI planning. All core task, habit, calendar, and analytics features continue working normally.
                  </p>
                </div>
              </div>
            )}

            {/* Tabs */}
            <div className="border-b border-zinc-200 px-5 pt-3 dark:border-zinc-800">
              <div className="flex items-center gap-1 rounded-lg bg-zinc-100 p-1 dark:bg-zinc-900">
                <button
                  type="button"
                  onClick={() => setTab('planner')}
                  className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                    tab === 'planner'
                      ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-100'
                      : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200'
                  }`}
                >
                  Goal to Tasks
                </button>
                <button
                  type="button"
                  onClick={() => setTab('schedule')}
                  className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                    tab === 'schedule'
                      ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-100'
                      : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200'
                  }`}
                >
                  Daily Schedule
                </button>
                <button
                  type="button"
                  onClick={() => setTab('summary')}
                  className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                    tab === 'summary'
                      ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-100'
                      : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200'
                  }`}
                >
                  Weekly Brief
                </button>
              </div>
              <div className="h-3" />
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto p-5">
              {tab === 'planner' && (
                <div className="space-y-4">
                  <form onSubmit={handleGeneratePlan} className="space-y-3">
                    <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-300">
                      Describe a goal, exam, or project in plain English
                    </label>
                    <textarea
                      rows={3}
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder='e.g. "I have a DBMS exam on Friday and need to complete three chapters."'
                      className="w-full rounded-lg border border-zinc-200 bg-transparent p-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-violet-500 focus:outline-none dark:border-zinc-800 dark:text-zinc-100"
                    />
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setPrompt(
                            'I have a DBMS exam on Friday and need to complete three chapters.'
                          )
                        }
                        className="text-xs text-zinc-500 underline-offset-2 hover:text-zinc-900 hover:underline dark:text-zinc-400 dark:hover:text-zinc-200"
                      >
                        Try DBMS exam example
                      </button>
                      <button
                        type="submit"
                        disabled={planLoading}
                        className="inline-flex items-center gap-1.5 rounded-lg df-accent-bg px-4 py-2 text-xs font-medium text-white disabled:opacity-50"
                      >
                        {planLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                        <span>{planLoading ? 'Generating Plan...' : 'Generate Task Plan'}</span>
                      </button>
                    </div>
                  </form>

                  {planError && (
                    <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-600 dark:text-red-400">
                      {planError}
                    </div>
                  )}

                  {planResult && (
                    <div className="space-y-3 border-t border-zinc-200 pt-4 dark:border-zinc-800">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                          Proposed Plan ({selectedDraftIndices.length}/{planResult.tasks.length} selected)
                        </p>
                      </div>
                      <p className="text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
                        {planResult.summary}
                      </p>

                      <div className="space-y-2">
                        {planResult.tasks.map((draft, idx) => {
                          const selected = selectedDraftIndices.includes(idx);
                          const pKey: PriorityLevel = ['urgent', 'high', 'medium', 'low'].includes(
                            draft.priority
                          )
                            ? draft.priority
                            : 'medium';
                          return (
                            <div
                              key={idx}
                              onClick={() =>
                                setSelectedDraftIndices((prev) =>
                                  prev.includes(idx)
                                    ? prev.filter((i) => i !== idx)
                                    : [...prev, idx]
                                )
                              }
                              className={`cursor-pointer rounded-xl border p-3 transition-colors ${
                                selected
                                  ? 'df-accent-border df-accent-soft'
                                  : 'border-zinc-200 opacity-60 dark:border-zinc-800'
                              }`}
                            >
                              <div className="flex items-start gap-2.5">
                                <div
                                  className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                                    selected
                                      ? 'df-accent-bg border-transparent text-white'
                                      : 'border-zinc-300 dark:border-zinc-600'
                                  }`}
                                >
                                  {selected && <Check className="h-3 w-3" />}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                                    {draft.title}
                                  </p>
                                  {draft.description && (
                                    <p className="mt-0.5 text-xs text-zinc-600 dark:text-zinc-400">
                                      {draft.description}
                                    </p>
                                  )}
                                  <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] text-zinc-500 dark:text-zinc-400">
                                    <span className="font-mono">{draft.dueDate}</span>
                                    <span>·</span>
                                    <span className={PRIORITY_META[pKey].textClass}>
                                      {PRIORITY_META[pKey].label}
                                    </span>
                                    <span>·</span>
                                    <span>{draft.categoryName}</span>
                                    <span>·</span>
                                    <span className="font-mono">{draft.estimatedMinutes}m</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => setPlanResult(null)}
                          className="rounded-lg border border-zinc-200 px-3.5 py-2 text-xs font-medium text-zinc-600 dark:border-zinc-700 dark:text-zinc-300"
                        >
                          Clear
                        </button>
                        <button
                          type="button"
                          onClick={handleApprovePlan}
                          disabled={selectedDraftIndices.length === 0}
                          className="rounded-lg df-accent-bg px-4 py-2 text-xs font-medium text-white disabled:opacity-50"
                        >
                          Approve &amp; Add {selectedDraftIndices.length} Task
                          {selectedDraftIndices.length === 1 ? '' : 's'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {tab === 'schedule' && (
                <div className="space-y-4">
                  <div className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                          Personalized Daily Schedule &amp; Load Check
                        </h3>
                        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                          Analyzes your {dataset.tasks.filter((t) => t.status !== 'completed').length} pending tasks to recommend realistic time blocks and flag overloaded days.
                        </p>
                      </div>
                      <CalendarClock className="h-5 w-5 shrink-0 df-accent-text" />
                    </div>
                    <button
                      type="button"
                      onClick={handleGenerateSchedule}
                      disabled={schedLoading}
                      className="mt-3 inline-flex items-center gap-1.5 rounded-lg df-accent-bg px-4 py-2 text-xs font-medium text-white disabled:opacity-50"
                    >
                      {schedLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                      <span>{schedLoading ? 'Analyzing Workload...' : 'Build Today’s Schedule'}</span>
                    </button>
                  </div>

                  {schedError && (
                    <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-600 dark:text-red-400">
                      {schedError}
                    </div>
                  )}

                  {schedResult && (
                    <div className="space-y-4">
                      <p className="text-xs leading-relaxed text-zinc-600 dark:text-zinc-300">
                        {schedResult.overview}
                      </p>

                      {schedResult.overloadedDays.length > 0 && (
                        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5">
                          <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">
                            Overloaded Days Detected
                          </p>
                          <div className="mt-2 space-y-2">
                            {schedResult.overloadedDays.map((ov, i) => (
                              <div key={i} className="text-xs text-amber-900/90 dark:text-amber-200/90">
                                <span className="font-mono font-semibold">{ov.date}</span> ·{' '}
                                <span className="tabular-nums">
                                  {ov.taskCount} tasks ({ov.totalMinutes}m)
                                </span>{' '}
                                — {ov.recommendation}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                          Recommended Time Blocks
                        </p>
                        {schedResult.scheduleBlocks.map((b, i) => (
                          <div
                            key={i}
                            className="flex items-start gap-3 rounded-xl border border-zinc-200 p-3 dark:border-zinc-800"
                          >
                            <span className="shrink-0 font-mono text-xs font-medium df-accent-text tabular-nums">
                              {b.timeSlot}
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                                {b.taskTitle}
                              </p>
                              <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                                {b.reason}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {tab === 'summary' && (
                <div className="space-y-4">
                  <div className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                          Weekly Productivity Summary
                        </h3>
                        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                          Grounded in your real activity: {weeklyMetrics.tasksCompleted} tasks completed,{' '}
                          {Math.round((weeklyMetrics.focusMinutes / 60) * 10) / 10}h focus,{' '}
                          {weeklyMetrics.habitCheckIns} habit check-ins over the past 7 days.
                        </p>
                      </div>
                      <BarChart3 className="h-5 w-5 shrink-0 df-accent-text" />
                    </div>
                    <button
                      type="button"
                      onClick={handleGenerateSummary}
                      disabled={sumLoading}
                      className="mt-3 inline-flex items-center gap-1.5 rounded-lg df-accent-bg px-4 py-2 text-xs font-medium text-white disabled:opacity-50"
                    >
                      {sumLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                      <span>{sumLoading ? 'Summarizing...' : 'Generate Weekly Briefing'}</span>
                    </button>
                  </div>

                  {sumError && (
                    <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-600 dark:text-red-400">
                      {sumError}
                    </div>
                  )}

                  {sumResult && (
                    <div className="space-y-4 rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
                      <div>
                        <h4 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                          {sumResult.headline}
                        </h4>
                        <p className="mt-1.5 text-xs leading-relaxed text-zinc-600 dark:text-zinc-300">
                          {sumResult.summary}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                          Key Wins
                        </p>
                        <ul className="mt-1.5 space-y-1 text-xs text-zinc-600 dark:text-zinc-300">
                          {sumResult.wins.map((w, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                              <span>{w}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                          Recommendations for Next Week
                        </p>
                        <ul className="mt-1.5 space-y-1 text-xs text-zinc-600 dark:text-zinc-300">
                          {sumResult.recommendations.map((r, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full df-accent-bg" />
                              <span>{r}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}
