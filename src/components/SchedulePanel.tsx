import { useState } from 'react';
import { useSchedule } from '../context/ScheduleContext';
import { formatTime } from '../utils/timeUtils';

type ViewMode = 'grid' | 'supplier' | 'buyer';

export default function SchedulePanel() {
  const {
    eventConfig,
    suppliers,
    buyers,
    meetings,
    timeSlots,
    generateSchedule,
    clearSchedule,
    cancelMeeting,
    updateMeetingStatus,
    autoFillGaps,
  } = useSchedule();

  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  const getMeetingForSlot = (supplierId: string, slotId: string) => {
    return meetings.find(
      m => m.supplierId === supplierId && m.timeSlotId === slotId && m.status !== 'cancelled'
    );
  };

  const getBuyer = (id: string) => buyers.find(b => b.id === id);
  const getSupplier = (id: string) => suppliers.find(s => s.id === id);

  const meetingSlots = timeSlots.filter(s => !s.isBreak);
  const cancelledCount = meetings.filter(m => m.status === 'cancelled').length;

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
              className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600"
            >
              Generate Schedule
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
          <div className="mt-3 text-sm text-gray-600">
            {meetings.filter(m => m.status === 'scheduled').length} meetings scheduled |{' '}
            {cancelledCount} cancelled
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
                    {s.name}
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
                        <td key={supplier.id} className="px-3 py-2">
                          {meeting && buyer ? (
                            <div
                              className={`p-2 rounded text-xs cursor-pointer ${
                                meeting.status === 'completed'
                                  ? 'bg-green-100 text-green-800'
                                  : meeting.status === 'late'
                                  ? 'bg-orange-100 text-orange-800'
                                  : 'bg-blue-100 text-blue-800'
                              }`}
                              onClick={() => {
                                const action = window.confirm(
                                  `${buyer.name}\n\nMark as:\n- OK: Completed\n- Cancel: Cancel meeting`
                                );
                                if (action) {
                                  updateMeetingStatus(meeting.id, 'completed');
                                } else {
                                  cancelMeeting(meeting.id);
                                }
                              }}
                            >
                              {buyer.name}
                              <div className="text-[10px] opacity-75">{buyer.organization}</div>
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
          {suppliers.map(supplier => {
            const supplierMeetings = meetings.filter(
              m => m.supplierId === supplier.id && m.status !== 'cancelled'
            );
            return (
              <div key={supplier.id} className="bg-white rounded-lg shadow p-4">
                <h3 className="font-semibold mb-3">{supplier.name}</h3>
                <div className="space-y-2">
                  {meetingSlots.map(slot => {
                    const meeting = supplierMeetings.find(m => m.timeSlotId === slot.id);
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
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {buyers.map(buyer => {
            const buyerMeetings = meetings.filter(
              m => m.buyerId === buyer.id && m.status !== 'cancelled'
            );
            return (
              <div key={buyer.id} className="bg-white rounded-lg shadow p-4">
                <h3 className="font-semibold mb-3">{buyer.name}</h3>
                <div className="space-y-2">
                  {meetingSlots.map(slot => {
                    const meeting = buyerMeetings.find(m => m.timeSlotId === slot.id);
                    const supplier = meeting ? getSupplier(meeting.supplierId) : null;
                    return (
                      <div
                        key={slot.id}
                        className="flex justify-between items-center text-sm border-b pb-1"
                      >
                        <span className="text-gray-500">{formatTime(slot.startTime)}</span>
                        <span>{supplier?.name || '-'}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
