import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { DayflowProvider, useDayflow } from './context/DayflowContext';
import { Sidebar } from './components/layout/Sidebar';
import { TopBar } from './components/layout/TopBar';
import { DashboardView } from './components/dashboard/DashboardView';
import { TasksWorkspaceView } from './components/tasks/TasksWorkspaceView';
import { CalendarView } from './components/calendar/CalendarView';
import { ProjectsView } from './components/projects/ProjectsView';
import { HabitTrackerView } from './components/habits/HabitTrackerView';
import { FocusModeView } from './components/focus/FocusModeView';
import { AnalyticsView } from './components/analytics/AnalyticsView';
import { SettingsView } from './components/settings/SettingsView';
import { QuickAddModal } from './components/tasks/QuickAddModal';
import { TaskEditorModal } from './components/tasks/TaskEditorModal';
import { CommandPalette } from './components/common/CommandPalette';
import { AIAssistantDrawer } from './components/ai/AIAssistantDrawer';
import { ToastContainer } from './components/common/ToastContainer';

function DayflowShell() {
  const { activeSection } = useDayflow();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const renderSection = () => {
    switch (activeSection) {
      case 'dashboard':
        return <DashboardView />;
      case 'today':
        return <TasksWorkspaceView scope="today" />;
      case 'upcoming':
        return <TasksWorkspaceView scope="upcoming" />;
      case 'all-tasks':
        return <TasksWorkspaceView scope="all" />;
      case 'calendar':
        return <CalendarView />;
      case 'projects':
        return <ProjectsView />;
      case 'habits':
        return <HabitTrackerView />;
      case 'focus':
        return <FocusModeView />;
      case 'analytics':
        return <AnalyticsView />;
      case 'completed':
        return <TasksWorkspaceView scope="completed" />;
      case 'settings':
        return <SettingsView />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-zinc-50 text-zinc-900 dark:bg-[#121215] dark:text-zinc-100">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((p) => !p)}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <TopBar onOpenMobileMenu={() => setMobileMenuOpen(true)} />

        <main className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-6 sm:px-6 lg:px-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeSection}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            >
              {renderSection()}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Global Overlays */}
      <QuickAddModal />
      <TaskEditorModal />
      <CommandPalette />
      <AIAssistantDrawer />
      <ToastContainer />
    </div>
  );
}

export default function App() {
  return (
    <DayflowProvider>
      <DayflowShell />
    </DayflowProvider>
  );
}
