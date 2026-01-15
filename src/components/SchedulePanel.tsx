import { useState, useMemo } from 'react';
import { useSchedule } from '../context/ScheduleContext';
import { formatTime } from '../utils/timeUtils';
import type { Meeting } from '../types';

type ViewMode = 'grid' | 'supplier' | 'buyer';

export default function SchedulePanel() {
  const {
    eventConfig,
    suppliers,
    buyers,
    meetings,
    timeSlots,
    unscheduledPairs,
    isGenerating,
    generateSchedule,
    clearSchedule,
    cancelMeeting,
    updateMeetingStatus,
    autoFillGaps,
  } = useSchedule();

  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [activeMeetingMenu, setActiveMeetingMenu] = useState<string | null>(null);

  // Memoized Maps for O(1) lookups instead of O(n)
  const meetingMap = useMemo(() => {
    const map = new Map<string, Map<string, Meeting>>();
    meetings.forEach(m => {
      if (m.status === 'cancelled') return;
      if (!map.has(m.supplierId)) map.set(m.supplierId, new Map());
      map.get(m.supplierId)!.set(m.timeSlotId, m);
    });
    return map;
  }, [meetings]);

  const buyerMeetingMap = useMemo(() => {
    const map = new Map<string, Map<string, Meeting>>();
    meetings.forEach(m => {
      if (m.status === 'cancelled') return;
      if (!map.has(m.buyerId)) map.set(m.buyerId, new Map());
      map.get(m.buyerId)!.set(m.timeSlotId, m);
    });
    return map;
  }, [meetings]);

  const buyerMap = useMemo(() => new Map(buyers.map(b => [b.id, b])), [buyers]);
  const supplierMap = useMemo(() => new Map(suppliers.map(s => [s.id, s])), [suppliers]);

  // Memoized filtered arrays
  const meetingSlots = useMemo(() => timeSlots.filter(s => !s.isBreak), [timeSlots]);
  const cancelledCount = useMemo(() => meetings.filter(m => m.status === 'cancelled').length, [meetings]);
  const scheduledCount = useMemo(() => meetings.filter(m => m.status === 'scheduled').length, [meetings]);

  // O(1) lookup functions
  const getMeetingForSlot = (supplierId: string, slotId: string) =>
    meetingMap.get(supplierId)?.get(slotId);

  const getBuyerMeetingForSlot = (buyerId: string, slotId: string) =>
    buyerMeetingMap.get(buyerId)?.get(slotId);

  const getBuyer = (id: string) => buyerMap.get(id);
  const getSupplier = (id: string) => supplierMap.get(id);

  if (!eventConfig) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
        <p className="text-yellow-800">Please configure the event first.</p>
      </div>
    );
  }

  if (suppliers.length === 0 || buyers.length === 0) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
        <p className="text-yellow-800">Please add suppliers and buyers first.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg shadow p-4 no-print">
        <div className="flex flex-wrap gap-3 items-center justify-between">
          <div className="flex gap-2">
            <button
              onClick={generateSchedule}
              disabled={isGenerating}
              className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:bg-green-300 disabled:cursor-wait flex items-center gap-2"
            >
              {isGenerating && (
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              )}
              {isGenerating ? 'Generating...' : 'Generate Schedule'}
            </button>
            {meetings.length > 0 && (
              <>
                <button
                  onClick={clearSchedule}
                  className="px-4 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200"
                >
                  Clear Schedule
                </button>
                {cancelledCount > 0 && (
                  <button
                    onClick={autoFillGaps}
                    className="px-4 py-2 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200"
                  >
                    Auto-fill Gaps ({cancelledCount})
                  </button>
                )}
              </>
            )}
          </div>

          <div className="flex gap-1 bg-gray-100 rounded-md p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1 rounded text-sm ${
                viewMode === 'grid' ? 'bg-white shadow' : ''
              }`}
            >
              Grid View
            </button>
            <button
              onClick={() => setViewMode('supplier')}
              className={`px-3 py-1 rounded text-sm ${
                viewMode === 'supplier' ? 'bg-white shadow' : ''
              }`}
            >
              By Supplier
            </button>
            <button
              onClick={() => setViewMode('buyer')}
              className={`px-3 py-1 rounded text-sm ${
                viewMode === 'buyer' ? 'bg-white shadow' : ''
              }`}
            >
              By Buyer
            </button>
          </div>
        </div>

        {meetings.length > 0 && (
          <div className="mt-3 text-sm text-gray-600 flex flex-wrap gap-4">
            <span className="text-green-600">{scheduledCount} scheduled</span>
            {cancelledCount > 0 && <span className="text-red-600">{cancelledCount} cancelled</span>}
            {unscheduledPairs.length > 0 && (
              <span className="text-orange-600" title="Some requested meetings couldn't be scheduled due to time constraints">
                {unscheduledPairs.length} couldn't be scheduled
              </span>
            )}
          </div>
        )}
        {unscheduledPairs.length > 0 && meetings.length > 0 && (
          <div className="mt-2 p-3 bg-orange-50 border border-orange-200 rounded-md text-sm">
            <p className="text-orange-800 font-medium mb-1">
              {unscheduledPairs.length} requested meeting(s) couldn't be scheduled
            </p>
            <p className="text-orange-700 text-xs">
              Not enough time slots available. Consider extending event hours or reducing meeting durations.
            </p>
          </div>
        )}
      </div>

      {meetings.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-500">
            Click "Generate Schedule" to create the meeting schedule based on supplier preferences.
          </p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="bg-white rounded-lg shadow overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="px-3 py-2 text-left font-medium sticky left-0 bg-gray-50">Time</th>
                {suppliers.map(s => (
                  <th key={s.id} className="px-3 py-2 text-left font-medium min-w-32">
                    {s.companyName}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {timeSlots.map(slot => (
                <tr key={slot.id} className={`border-b ${slot.isBreak ? 'bg-yellow-50' : ''}`}>
                  <td className="px-3 py-2 font-medium sticky left-0 bg-white whitespace-nowrap">
                    {formatTime(slot.startTime)}
                    {slot.isBreak && (
                      <span className="ml-2 text-xs text-yellow-700">({slot.breakName})</span>
                    )}
                  </td>
                  {slot.isBreak ? (
                    <td colSpan={suppliers.length} className="px-3 py-2 text-center text-yellow-700">
                      {slot.breakName}
                    </td>
                  ) : (
                    suppliers.map(supplier => {
                      const meeting = getMeetingForSlot(supplier.id, slot.id);
                      const buyer = meeting ? getBuyer(meeting.buyerId) : null;
                      return (
                        <td key={supplier.id} className="px-3 py-2 relative">
                          {meeting && buyer ? (
                            <div className="relative">
                              <div
                                className={`p-2 rounded text-xs cursor-pointer ${
                                  meeting.status === 'completed'
                                    ? 'bg-green-100 text-green-800'
                                    : meeting.status === 'late'
                                    ? 'bg-orange-100 text-orange-800'
                                    : 'bg-blue-100 text-blue-800'
                                }`}
                                onClick={() => setActiveMeetingMenu(activeMeetingMenu === meeting.id ? null : meeting.id)}
                              >
                                <div className="flex items-center justify-between gap-1">
                                  <span>{buyer.name}</span>
                                  <span className="text-[10px] opacity-60">
                                    {meeting.status === 'scheduled' ? '' : meeting.status === 'completed' ? '✓' : '⏰'}
                                  </span>
                                </div>
                                <div className="text-[10px] opacity-75">{buyer.organization}</div>
                              </div>
                              {activeMeetingMenu === meeting.id && (
                                <div className="absolute z-10 mt-1 left-0 bg-white border rounded-md shadow-lg min-w-32">
                                  <button
                                    onClick={() => { updateMeetingStatus(meeting.id, 'completed'); setActiveMeetingMenu(null); }}
                                    className="w-full px-3 py-2 text-left text-xs hover:bg-green-50 text-green-700"
                                  >
                                    ✓ Completed
                                  </button>
                                  <button
                                    onClick={() => { updateMeetingStatus(meeting.id, 'late'); setActiveMeetingMenu(null); }}
                                    className="w-full px-3 py-2 text-left text-xs hover:bg-orange-50 text-orange-700"
                                  >
                                    ⏰ Late
                                  </button>
                                  <button
                                    onClick={() => { updateMeetingStatus(meeting.id, 'scheduled'); setActiveMeetingMenu(null); }}
                                    className="w-full px-3 py-2 text-left text-xs hover:bg-blue-50 text-blue-700"
                                  >
                                    ↺ Reset
                                  </button>
                                  <button
                                    onClick={() => { cancelMeeting(meeting.id); setActiveMeetingMenu(null); }}
                                    className="w-full px-3 py-2 text-left text-xs hover:bg-red-50 text-red-700 border-t"
                                  >
                                    ✕ Cancel Meeting
                                  </button>
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-300">-</span>
                          )}
                        </td>
                      );
                    })
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : viewMode === 'supplier' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {suppliers.map(supplier => (
            <div key={supplier.id} className="bg-white rounded-lg shadow p-4">
              <h3 className="font-semibold mb-3">{supplier.companyName}</h3>
              <div className="space-y-2">
                {meetingSlots.map(slot => {
                  const meeting = getMeetingForSlot(supplier.id, slot.id);
                  const buyer = meeting ? getBuyer(meeting.buyerId) : null;
                  return (
                    <div
                      key={slot.id}
                      className="flex justify-between items-center text-sm border-b pb-1"
                    >
                      <span className="text-gray-500">{formatTime(slot.startTime)}</span>
                      <span>{buyer?.name || '-'}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {buyers.map(buyer => (
            <div key={buyer.id} className="bg-white rounded-lg shadow p-4">
              <h3 className="font-semibold mb-3">{buyer.name}</h3>
              <div className="space-y-2">
                {meetingSlots.map(slot => {
                  const meeting = getBuyerMeetingForSlot(buyer.id, slot.id);
                  const supplier = meeting ? getSupplier(meeting.supplierId) : null;
                  return (
                    <div
                      key={slot.id}
                      className="flex justify-between items-center text-sm border-b pb-1"
                    >
                      <span className="text-gray-500">{formatTime(slot.startTime)}</span>
                      <span>{supplier?.companyName || '-'}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
