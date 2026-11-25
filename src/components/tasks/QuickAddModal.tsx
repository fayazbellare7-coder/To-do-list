import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Calendar, Clock, CornerDownLeft, Flag, Folder, Repeat, Wand2, X } from 'lucide-react';
import { useDayflow } from '../../context/DayflowContext';
import { parseQuickTaskInput } from '../../utils/nlpParser';
import { formatDisplayDate, formatTime12h, PRIORITY_META } from '../../utils/dateUtils';
import { PriorityLevel, RecurringRule } from '../../types/dayflow';

const EXAMPLE_PROMPTS = [
  'Complete assignment tomorrow at 5 PM #academics',
  'Go to the gym every Monday #fitness',
  'Submit project on Friday, high priority 60m',
];

export function QuickAddModal() {
  const {
    dataset,
    quickAddOpen,
    quickAddDefaults,
    closeQuickAdd,
    addTask,
    setEditingTask,
    setAiAssistantOpen,
    pushToast,
  } = useDayflow();

  const [input, setInput] = useState('');
  const [useAdvanced, setUseAdvanced] = useState(false);
  const [manualPriority, setManualPriority] = useState<PriorityLevel | ''>('');
  const [manualCategory, setManualCategory] = useState('');
  const [manualDate, setManualDate] = useState('');
  const [manualTime, setManualTime] = useState('');
  const [manualRecurring, setManualRecurring] = useState<RecurringRule | ''>('');
  const [errorMsg, setErrorMsg] = useState('');

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (quickAddOpen) {
      setInput('');
      setUseAdvanced(false);
      setManualPriority('');
      setManualCategory('');
      setManualDate(quickAddDefaults.dueDate || '');
      setManualTime(quickAddDefaults.dueTime || '');
      setManualRecurring('');
      setErrorMsg('');
      setTimeout(() => inputRef.current?.focus(), 40);
    }
  }, [quickAddOpen, quickAddDefaults]);

  const parsed = useMemo(
    () =>
      parseQuickTaskInput(
        input,
        dataset.categories,
        dataset.preferences.defaultPriority
      ),
    [input, dataset.categories, dataset.preferences.defaultPriority]
  );

  const effectivePriority = (manualPriority || parsed.priority || dataset.preferences.defaultPriority) as PriorityLevel;
  const effectiveCategoryId = manualCategory || parsed.categoryId || dataset.categories[0]?.id || 'cat-personal';
  const effectiveDate = manualDate || parsed.dueDate;
  const effectiveTime = manualTime || parsed.dueTime;
  const effectiveRecurring = (manualRecurring || parsed.recurring) as RecurringRule;

  const matchedCat = dataset.categories.find((c) => c.id === effectiveCategoryId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) {
      setErrorMsg('Please enter a task title.');
      return;
    }

    const created = addTask({
      title: parsed.title,
      dueDate: effectiveDate,
      dueTime: effectiveTime,
      priority: effectivePriority,
      categoryId: effectiveCategoryId,
      projectId: quickAddDefaults.projectId,
      recurring: effectiveRecurring,
      tags: parsed.tags,
      estimatedMinutes: parsed.estimatedMinutes ?? 30,
    });

    pushToast({ message: `Added "${created.title}"`, tone: 'success' });
    closeQuickAdd();
  };

  return (
    <AnimatePresence>
      {quickAddOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[12vh]"
          role="dialog"
          aria-modal="true"
          aria-label="Quick Add Task"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.14 }}
            onClick={closeQuickAdd}
            className="fixed inset-0 bg-black/50 backdrop-blur-[2px]"
          />

          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 w-full max-w-xl rounded-xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-[#19191d]"
          >
            <form onSubmit={handleSubmit}>
              <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3 dark:border-zinc-800">
                <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                  Quick Add Task
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      closeQuickAdd();
                      setAiAssistantOpen(true);
                    }}
                    className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium df-accent-text hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  >
                    <Wand2 className="h-3.5 w-3.5" />
                    <span>AI Plan</span>
                  </button>
                  <button
                    type="button"
                    onClick={closeQuickAdd}
                    className="rounded-md p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                    aria-label="Close modal"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="p-4">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => {
                    setInput(e.target.value);
                    if (errorMsg) setErrorMsg('');
                  }}
                  placeholder="e.g. Submit project on Friday at 5 PM, high priority #work"
                  className="w-full bg-transparent text-base font-medium text-zinc-900 placeholder:text-zinc-400 focus:outline-none dark:text-zinc-100 dark:placeholder:text-zinc-500"
                />
                {errorMsg && (
                  <p className="mt-1.5 text-xs font-medium text-red-600 dark:text-red-400">
                    {errorMsg}
                  </p>
                )}

                {/* Natural-language live preview line (clean unboxed metadata) */}
                {input.trim() ? (
                  <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500 dark:text-zinc-400">
                    <span className="inline-flex items-center gap-1 text-zinc-800 dark:text-zinc-200">
                      <Calendar className="h-3.5 w-3.5 text-zinc-400" />
                      {formatDisplayDate(effectiveDate)}
                    </span>
                    {effectiveTime && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="inline-flex items-center gap-1 font-mono tabular-nums">
                          <Clock className="h-3.5 w-3.5 text-zinc-400" />
                          {formatTime12h(effectiveTime)}
                        </span>
                      </>
                    )}
                    <span aria-hidden="true">·</span>
                    <span className={`inline-flex items-center gap-1 font-medium ${PRIORITY_META[effectivePriority].textClass}`}>
                      <Flag className="h-3.5 w-3.5" />
                      {PRIORITY_META[effectivePriority].label}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="inline-flex items-center gap-1">
                      <Folder className="h-3.5 w-3.5" style={{ color: matchedCat?.color }} />
                      {matchedCat?.name || 'Personal'}
                    </span>
                    {effectiveRecurring !== 'none' && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="inline-flex items-center gap-1 capitalize">
                          <Repeat className="h-3.5 w-3.5 text-zinc-400" />
                          {effectiveRecurring}
                        </span>
                      </>
                    )}
                    {parsed.estimatedMinutes && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono tabular-nums">{parsed.estimatedMinutes}m</span>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className="text-[11px] text-zinc-400">Try:</span>
                    {EXAMPLE_PROMPTS.map((ex) => (
                      <button
                        key={ex}
                        type="button"
                        onClick={() => setInput(ex)}
                        className="rounded-md bg-zinc-100 px-2 py-1 text-[11px] text-zinc-600 transition-colors hover:bg-zinc-200 dark:bg-zinc-800/80 dark:text-zinc-400 dark:hover:bg-zinc-800"
                      >
                        {ex}
                      </button>
                    ))}
                  </div>
                )}

                {useAdvanced && (
                  <div className="mt-4 grid grid-cols-2 gap-3 border-t border-zinc-100 pt-4 dark:border-zinc-800 sm:grid-cols-4">
                    <div>
                      <label className="mb-1 block text-[11px] font-medium text-zinc-500">
                        Due date
                      </label>
                      <input
                        type="date"
                        value={effectiveDate}
                        onChange={(e) => setManualDate(e.target.value)}
                        className="w-full rounded-lg border border-zinc-200 bg-transparent px-2.5 py-1.5 text-xs text-zinc-900 dark:border-zinc-700 dark:text-zinc-100"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] font-medium text-zinc-500">
                        Time
                      </label>
                      <input
                        type="time"
                        value={effectiveTime}
                        onChange={(e) => setManualTime(e.target.value)}
                        className="w-full rounded-lg border border-zinc-200 bg-transparent px-2.5 py-1.5 text-xs text-zinc-900 dark:border-zinc-700 dark:text-zinc-100"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] font-medium text-zinc-500">
                        Priority
                      </label>
                      <select
                        value={effectivePriority}
                        onChange={(e) => setManualPriority(e.target.value as PriorityLevel)}
                        className="w-full rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                      >
                        <option value="urgent">Urgent</option>
                        <option value="high">High</option>
                        <option value="medium">Medium</option>
                        <option value="low">Low</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] font-medium text-zinc-500">
                        Category
                      </label>
                      <select
                        value={effectiveCategoryId}
                        onChange={(e) => setManualCategory(e.target.value)}
                        className="w-full rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                      >
                        {dataset.categories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between border-t border-zinc-100 px-4 py-2.5 dark:border-zinc-800">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setUseAdvanced((p) => !p)}
                    className="text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                  >
                    {useAdvanced ? 'Hide options' : 'More options'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const draftTitle = parsed.title || input.trim() || 'Untitled Task';
                      const created = addTask({
                        title: draftTitle,
                        dueDate: effectiveDate,
                        dueTime: effectiveTime,
                        priority: effectivePriority,
                        categoryId: effectiveCategoryId,
                        projectId: quickAddDefaults.projectId,
                        recurring: effectiveRecurring,
                        tags: parsed.tags,
                      });
                      closeQuickAdd();
                      setEditingTask(created);
                    }}
                    className="text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                  >
                    Open full editor
                  </button>
                </div>

                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 rounded-lg df-accent-bg px-3.5 py-1.5 text-xs font-medium text-white shadow-sm"
                >
                  <span>Add Task</span>
                  <CornerDownLeft className="h-3.5 w-3.5" />
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
