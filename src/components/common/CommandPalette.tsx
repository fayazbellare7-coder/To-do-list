import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowRight,
  BarChart3,
  Calendar,
  CheckCircle2,
  Flame,
  FolderKanban,
  LayoutDashboard,
  ListTodo,
  Plus,
  Search,
  Settings,
  Sun,
  Timer,
  Wand2,
} from 'lucide-react';
import { useDayflow } from '../../context/DayflowContext';
import { NavSection } from '../../types/dayflow';

export function CommandPalette() {
  const {
    dataset,
    commandPaletteOpen,
    setCommandPaletteOpen,
    setActiveSection,
    setSelectedProjectId,
    openQuickAdd,
    setEditingTask,
    setAiAssistantOpen,
    updatePreferences,
  } = useDayflow();

  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (commandPaletteOpen) {
      setQuery('');
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [commandPaletteOpen]);

  const navActions: Array<{
    id: string;
    label: string;
    hint: string;
    icon: typeof LayoutDashboard;
    run: () => void;
  }> = useMemo(
    () => [
      {
        id: 'act-new',
        label: 'Quick Add Task',
        hint: 'Shortcut N',
        icon: Plus,
        run: () => {
          setCommandPaletteOpen(false);
          openQuickAdd();
        },
      },
      {
        id: 'act-ai',
        label: 'Open AI Productivity Assistant',
        hint: 'AI Plan & Schedule',
        icon: Wand2,
        run: () => {
          setCommandPaletteOpen(false);
          setAiAssistantOpen(true);
        },
      },
      {
        id: 'act-theme',
        label: 'Toggle Light / Dark Mode',
        hint: 'Appearance',
        icon: Sun,
        run: () => {
          updatePreferences({
            theme: dataset.preferences.theme === 'dark' ? 'light' : 'dark',
          });
          setCommandPaletteOpen(false);
        },
      },
      ...(
        [
          ['dashboard', 'Go to Dashboard', LayoutDashboard],
          ['today', 'Go to Today', Sun],
          ['upcoming', 'Go to Upcoming', Calendar],
          ['all-tasks', 'Go to All Tasks', ListTodo],
          ['calendar', 'Go to Calendar', Calendar],
          ['projects', 'Go to Projects', FolderKanban],
          ['habits', 'Go to Habit Tracker', Flame],
          ['focus', 'Go to Focus Mode', Timer],
          ['analytics', 'Go to Analytics', BarChart3],
          ['completed', 'Go to Completed Tasks', CheckCircle2],
          ['settings', 'Go to Settings', Settings],
        ] as Array<[NavSection, string, typeof LayoutDashboard]>
      ).map(([sec, label, icon]) => ({
        id: `nav-${sec}`,
        label,
        hint: 'Page',
        icon,
        run: () => {
          setActiveSection(sec);
          setCommandPaletteOpen(false);
        },
      })),
    ],
    [
      dataset.preferences.theme,
      openQuickAdd,
      setActiveSection,
      setAiAssistantOpen,
      setCommandPaletteOpen,
      updatePreferences,
    ]
  );

  const q = query.trim().toLowerCase();

  const filteredActions = useMemo(
    () =>
      navActions.filter(
        (a) =>
          !q ||
          a.label.toLowerCase().includes(q) ||
          a.hint.toLowerCase().includes(q)
      ),
    [navActions, q]
  );

  const matchedTasks = useMemo(
    () =>
      q
        ? dataset.tasks
            .filter(
              (t) =>
                t.title.toLowerCase().includes(q) ||
                t.tags.some((tg) => tg.toLowerCase().includes(q))
            )
            .slice(0, 6)
        : [],
    [dataset.tasks, q]
  );

  const matchedProjects = useMemo(
    () =>
      q
        ? dataset.projects
            .filter((p) => p.name.toLowerCase().includes(q))
            .slice(0, 4)
        : [],
    [dataset.projects, q]
  );

  return (
    <AnimatePresence>
      {commandPaletteOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[12vh]"
          role="dialog"
          aria-modal="true"
          aria-label="Command Palette"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setCommandPaletteOpen(false)}
            className="fixed inset-0 bg-black/50 backdrop-blur-[2px]"
          />

          <motion.div
            initial={{ opacity: 0, y: -12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 w-full max-w-lg overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-[#19191d]"
          >
            <div className="flex items-center gap-2.5 border-b border-zinc-100 px-4 py-3 dark:border-zinc-800">
              <Search className="h-4 w-4 text-zinc-400" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search tasks, projects, or jump to a view..."
                className="flex-1 bg-transparent text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none dark:text-zinc-100"
              />
              <kbd className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-[10px] text-zinc-500 dark:bg-zinc-800">
                ESC
              </kbd>
            </div>

            <div className="max-h-80 overflow-y-auto p-2">
              {matchedTasks.length > 0 && (
                <div className="mb-2">
                  <p className="px-2.5 py-1 text-[11px] font-semibold text-zinc-400">
                    Tasks
                  </p>
                  {matchedTasks.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        setCommandPaletteOpen(false);
                        setEditingTask(t);
                      }}
                      className="flex w-full items-center justify-between gap-3 rounded-lg px-2.5 py-2 text-left text-sm text-zinc-800 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
                    >
                      <span className="truncate">{t.title}</span>
                      <span className="shrink-0 font-mono text-[11px] text-zinc-400">
                        {t.dueDate || 'No date'}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {matchedProjects.length > 0 && (
                <div className="mb-2">
                  <p className="px-2.5 py-1 text-[11px] font-semibold text-zinc-400">
                    Projects
                  </p>
                  {matchedProjects.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setSelectedProjectId(p.id);
                        setActiveSection('projects');
                        setCommandPaletteOpen(false);
                      }}
                      className="flex w-full items-center justify-between gap-3 rounded-lg px-2.5 py-2 text-left text-sm text-zinc-800 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
                    >
                      <span className="truncate">{p.name}</span>
                      <ArrowRight className="h-3.5 w-3.5 text-zinc-400" />
                    </button>
                  ))}
                </div>
              )}

              <div>
                <p className="px-2.5 py-1 text-[11px] font-semibold text-zinc-400">
                  Commands &amp; Navigation
                </p>
                {filteredActions.length === 0 ? (
                  <p className="px-3 py-6 text-center text-xs text-zinc-500">
                    No matching commands or tasks.
                  </p>
                ) : (
                  filteredActions.slice(0, 12).map((act) => {
                    const Icon = act.icon;
                    return (
                      <button
                        key={act.id}
                        type="button"
                        onClick={act.run}
                        className="flex w-full items-center justify-between gap-3 rounded-lg px-2.5 py-2 text-left text-sm text-zinc-800 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
                      >
                        <div className="flex items-center gap-2.5">
                          <Icon className="h-4 w-4 text-zinc-400" />
                          <span>{act.label}</span>
                        </div>
                        <span className="text-[11px] text-zinc-400">{act.hint}</span>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
