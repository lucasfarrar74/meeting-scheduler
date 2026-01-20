import { useState, useEffect } from 'react';
import { ScheduleProvider, useSchedule } from './context/ScheduleContext';
import EventConfigPanel from './components/EventConfigPanel';
import ParticipantsPanel from './components/ParticipantsPanel';
import PreferencesPanel from './components/PreferencesPanel';
import SchedulePanel from './components/SchedulePanel';
import ExportPanel from './components/ExportPanel';
import ProjectSidebar from './components/ProjectSidebar';
import SyncStatusIndicator from './components/SyncStatusIndicator';
import KeyboardShortcutsHelp from './components/KeyboardShortcutsHelp';
import NotificationSettings from './components/NotificationSettings';
import ThemeToggle from './components/ThemeToggle';
import './index.css';

type Tab = 'config' | 'participants' | 'preferences' | 'schedule' | 'export';

function AppContent() {
  const [activeTab, setActiveTab] = useState<Tab>('config');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { activeProject, openCloudProject, isFirebaseEnabled } = useSchedule();

  // Handle share URL parameter on load
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const shareId = urlParams.get('share');

    if (shareId && isFirebaseEnabled) {
      openCloudProject(shareId).then(project => {
        if (project) {
          // Clear the URL parameter after successful join
          window.history.replaceState({}, '', window.location.pathname);
        }
      });
    }
  }, [isFirebaseEnabled, openCloudProject]);

  const tabs: { id: Tab; label: string }[] = [
    { id: 'config', label: 'Event Setup' },
    { id: 'participants', label: 'Participants' },
    { id: 'preferences', label: 'Preferences' },
    { id: 'schedule', label: 'Schedule' },
    { id: 'export', label: 'Export' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex transition-colors">
      {/* Project Sidebar */}
      <ProjectSidebar
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white dark:bg-gray-800 shadow-sm dark:shadow-gray-900/50 no-print">
          <div className="px-4 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Meeting Scheduler</h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">Supplier-Buyer Meeting Organizer</p>
              </div>
              <div className="flex items-center gap-4">
                <ThemeToggle />
                <KeyboardShortcutsHelp />
                <NotificationSettings />
                <SyncStatusIndicator />
                {activeProject && (
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{activeProject.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {activeProject.eventConfig?.startDate || 'No date set'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        <nav className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 no-print">
          <div className="px-4">
            <div className="flex space-x-1">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </nav>

        <main className="flex-1 px-4 py-6 overflow-auto">
          {activeTab === 'config' && <EventConfigPanel />}
          {activeTab === 'participants' && <ParticipantsPanel />}
          {activeTab === 'preferences' && <PreferencesPanel />}
          {activeTab === 'schedule' && <SchedulePanel />}
          {activeTab === 'export' && <ExportPanel />}
        </main>
      </div>
    </div>
  );
}

function App() {
  return (
    <ScheduleProvider>
      <AppContent />
    </ScheduleProvider>
  );
}

export default App;
