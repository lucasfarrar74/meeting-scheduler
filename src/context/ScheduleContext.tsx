import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import type {
  ScheduleState,
  ScheduleContextType,
  EventConfig,
  Supplier,
  Buyer,
  MeetingStatus,
} from '../types';
import { generateSchedule, autoFillCancelledSlots } from '../utils/scheduler';

const initialState: ScheduleState = {
  eventConfig: null,
  suppliers: [],
  buyers: [],
  meetings: [],
  timeSlots: [],
};

const ScheduleContext = createContext<ScheduleContextType | undefined>(undefined);

export function ScheduleProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useLocalStorage<ScheduleState>('meeting-scheduler-state', initialState);

  const setEventConfig = (config: EventConfig) => {
    setState(prev => ({ ...prev, eventConfig: config, meetings: [], timeSlots: [] }));
  };

  const addSupplier = (supplier: Supplier) => {
    setState(prev => ({ ...prev, suppliers: [...prev.suppliers, supplier] }));
  };

  const updateSupplier = (id: string, updates: Partial<Supplier>) => {
    setState(prev => ({
      ...prev,
      suppliers: prev.suppliers.map(s => (s.id === id ? { ...s, ...updates } : s)),
    }));
  };

  const removeSupplier = (id: string) => {
    setState(prev => ({
      ...prev,
      suppliers: prev.suppliers.filter(s => s.id !== id),
      meetings: prev.meetings.filter(m => m.supplierId !== id),
    }));
  };

  const addBuyer = (buyer: Buyer) => {
    setState(prev => ({ ...prev, buyers: [...prev.buyers, buyer] }));
  };

  const updateBuyer = (id: string, updates: Partial<Buyer>) => {
    setState(prev => ({
      ...prev,
      buyers: prev.buyers.map(b => (b.id === id ? { ...b, ...updates } : b)),
    }));
  };

  const removeBuyer = (id: string) => {
    setState(prev => ({
      ...prev,
      buyers: prev.buyers.filter(b => b.id !== id),
      meetings: prev.meetings.filter(m => m.buyerId !== id),
      // Also remove from supplier preference lists
      suppliers: prev.suppliers.map(s => ({
        ...s,
        preferenceList: s.preferenceList.filter(bid => bid !== id),
      })),
    }));
  };

  const importSuppliers = (suppliers: Supplier[]) => {
    setState(prev => ({ ...prev, suppliers, meetings: [], timeSlots: [] }));
  };

  const importBuyers = (buyers: Buyer[]) => {
    setState(prev => ({ ...prev, buyers, meetings: [], timeSlots: [] }));
  };

  const generateScheduleAction = () => {
    if (!state.eventConfig) return;

    const result = generateSchedule(state.eventConfig, state.suppliers, state.buyers);
    setState(prev => ({
      ...prev,
      meetings: result.meetings,
      timeSlots: result.timeSlots,
    }));

    if (result.unscheduledPairs.length > 0) {
      console.warn('Some meetings could not be scheduled:', result.unscheduledPairs.length);
    }
  };

  const updateMeetingStatus = (meetingId: string, status: MeetingStatus) => {
    setState(prev => ({
      ...prev,
      meetings: prev.meetings.map(m => (m.id === meetingId ? { ...m, status } : m)),
    }));
  };

  const swapMeetings = (meetingId1: string, meetingId2: string) => {
    setState(prev => {
      const meeting1 = prev.meetings.find(m => m.id === meetingId1);
      const meeting2 = prev.meetings.find(m => m.id === meetingId2);
      if (!meeting1 || !meeting2) return prev;

      return {
        ...prev,
        meetings: prev.meetings.map(m => {
          if (m.id === meetingId1) return { ...m, timeSlotId: meeting2.timeSlotId };
          if (m.id === meetingId2) return { ...m, timeSlotId: meeting1.timeSlotId };
          return m;
        }),
      };
    });
  };

  const moveMeeting = (meetingId: string, newTimeSlotId: string) => {
    setState(prev => ({
      ...prev,
      meetings: prev.meetings.map(m =>
        m.id === meetingId ? { ...m, timeSlotId: newTimeSlotId } : m
      ),
    }));
  };

  const cancelMeeting = (meetingId: string) => {
    updateMeetingStatus(meetingId, 'cancelled');
  };

  const autoFillGaps = () => {
    setState(prev => ({
      ...prev,
      meetings: autoFillCancelledSlots(prev.suppliers, prev.buyers, prev.timeSlots, prev.meetings),
    }));
  };

  const clearSchedule = () => {
    setState(prev => ({ ...prev, meetings: [], timeSlots: [] }));
  };

  const exportToJSON = (): string => {
    return JSON.stringify(state, null, 2);
  };

  const importFromJSON = (json: string) => {
    try {
      const parsed = JSON.parse(json) as ScheduleState;
      // Restore Date objects from strings
      if (parsed.timeSlots) {
        parsed.timeSlots = parsed.timeSlots.map(slot => ({
          ...slot,
          startTime: new Date(slot.startTime),
          endTime: new Date(slot.endTime),
        }));
      }
      setState(parsed);
    } catch (error) {
      console.error('Failed to import JSON:', error);
      throw new Error('Invalid JSON format');
    }
  };

  const value: ScheduleContextType = {
    ...state,
    setEventConfig,
    addSupplier,
    updateSupplier,
    removeSupplier,
    addBuyer,
    updateBuyer,
    removeBuyer,
    importSuppliers,
    importBuyers,
    generateSchedule: generateScheduleAction,
    updateMeetingStatus,
    swapMeetings,
    moveMeeting,
    cancelMeeting,
    autoFillGaps,
    clearSchedule,
    exportToJSON,
    importFromJSON,
  };

  return <ScheduleContext.Provider value={value}>{children}</ScheduleContext.Provider>;
}

export function useSchedule(): ScheduleContextType {
  const context = useContext(ScheduleContext);
  if (context === undefined) {
    throw new Error('useSchedule must be used within a ScheduleProvider');
  }
  return context;
}
