import { useState } from 'react';
import { ScheduleProvider } from './context/ScheduleContext';
import EventConfigPanel from './components/EventConfigPanel';
import ParticipantsPanel from './components/ParticipantsPanel';
import PreferencesPanel from './components/PreferencesPanel';
import SchedulePanel from './components/SchedulePanel';
import ExportPanel from './components/ExportPanel';
import './index.css';

type Tab = 'config' | 'participants' | 'preferences' | 'schedule' | 'export';

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('config');

  const tabs: { id: Tab; label: string }[] = [
    { id: 'config', label: 'Event Setup' },
    { id: 'participants', label: 'Participants' },
    { id: 'preferences', label: 'Preferences' },
    { id: 'schedule', label: 'Schedule' },
    { id: 'export', label: 'Export' },
  ];

  return (
    <ScheduleProvider>
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm no-print">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <h1 className="text-2xl font-bold text-gray-900">Meeting Scheduler</h1>
            <p className="text-sm text-gray-600">Supplier-Buyer Meeting Organizer</p>
          </div>
        </header>

        <nav className="bg-white border-b no-print">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex space-x-1">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </nav>

        <main className="max-w-7xl mx-auto px-4 py-6">
          {activeTab === 'config' && <EventConfigPanel />}
          {activeTab === 'participants' && <ParticipantsPanel />}
          {activeTab === 'preferences' && <PreferencesPanel />}
          {activeTab === 'schedule' && <SchedulePanel />}
          {activeTab === 'export' && <ExportPanel />}
        </main>
      </div>
    </ScheduleProvider>
  );
}

export default App;
