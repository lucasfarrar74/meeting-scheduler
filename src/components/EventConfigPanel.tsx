import { useState, useEffect } from 'react';
import { useSchedule } from '../context/ScheduleContext';
import type { EventConfig, Break } from '../types';
import { generateId } from '../utils/timeUtils';

export default function EventConfigPanel() {
  const { eventConfig, setEventConfig } = useSchedule();

  const [name, setName] = useState(eventConfig?.name || '');
  const [date, setDate] = useState(eventConfig?.date || '');
  const [startTime, setStartTime] = useState(eventConfig?.startTime || '09:00');
  const [endTime, setEndTime] = useState(eventConfig?.endTime || '17:00');
  const [duration, setDuration] = useState(eventConfig?.defaultMeetingDuration || 15);
  const [breaks, setBreaks] = useState<Break[]>(eventConfig?.breaks || []);

  useEffect(() => {
    if (eventConfig) {
      setName(eventConfig.name);
      setDate(eventConfig.date);
      setStartTime(eventConfig.startTime);
      setEndTime(eventConfig.endTime);
      setDuration(eventConfig.defaultMeetingDuration);
      setBreaks(eventConfig.breaks);
    }
  }, [eventConfig]);

  const addBreak = () => {
    setBreaks([...breaks, { id: generateId(), name: 'Lunch', startTime: '12:00', endTime: '13:00' }]);
  };

  const updateBreak = (id: string, field: keyof Break, value: string) => {
    setBreaks(breaks.map(b => (b.id === id ? { ...b, [field]: value } : b)));
  };

  const removeBreak = (id: string) => {
    setBreaks(breaks.filter(b => b.id !== id));
  };

  const handleSave = () => {
    const config: EventConfig = {
      id: eventConfig?.id || generateId(),
      name,
      date,
      startTime,
      endTime,
      defaultMeetingDuration: duration,
      breaks,
    };
    setEventConfig(config);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900/50 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Event Configuration</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Event Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Trade Show 2026"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date</label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Start Time</label>
            <input
              type="time"
              value={startTime}
              onChange={e => setStartTime(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">End Time</label>
            <input
              type="time"
              value={endTime}
              onChange={e => setEndTime(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Default Meeting Duration (minutes)
            </label>
            <input
              type="number"
              min="5"
              max="120"
              value={duration}
              onChange={e => setDuration(Number(e.target.value))}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900/50 p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Breaks</h2>
          <button
            onClick={addBreak}
            className="px-3 py-1 bg-blue-500 dark:bg-blue-600 text-white rounded-md hover:bg-blue-600 dark:hover:bg-blue-700 text-sm"
          >
            + Add Break
          </button>
        </div>

        {breaks.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-sm">No breaks scheduled. Click "Add Break" to add one.</p>
        ) : (
          <div className="space-y-3">
            {breaks.map(brk => (
              <div key={brk.id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
                <input
                  type="text"
                  value={brk.name}
                  onChange={e => updateBreak(brk.id, 'name', e.target.value)}
                  className="border border-gray-300 dark:border-gray-600 rounded px-2 py-1 w-32 bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100"
                  placeholder="Break name"
                />
                <input
                  type="time"
                  value={brk.startTime}
                  onChange={e => updateBreak(brk.id, 'startTime', e.target.value)}
                  className="border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100"
                />
                <span className="text-gray-500 dark:text-gray-400">to</span>
                <input
                  type="time"
                  value={brk.endTime}
                  onChange={e => updateBreak(brk.id, 'endTime', e.target.value)}
                  className="border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100"
                />
                <button
                  onClick={() => removeBreak(brk.id)}
                  className="text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 ml-auto"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={!name || !date}
          className="px-6 py-2 bg-green-500 dark:bg-green-600 text-white rounded-md hover:bg-green-600 dark:hover:bg-green-700 disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed"
        >
          Save Configuration
        </button>
      </div>

      {eventConfig && (
        <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-md p-4">
          <p className="text-green-800 dark:text-green-300 text-sm">
            Configuration saved. Proceed to "Participants" tab to add suppliers and buyers.
          </p>
        </div>
      )}
    </div>
  );
}
