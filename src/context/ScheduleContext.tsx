import { createContext, useContext, useMemo, useCallback } from 'react';
import type { ReactNode } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import type {
  ScheduleState,
  ScheduleContextType,
  EventConfig,
  Supplier,
  Buyer,
  MeetingStatus,
  Meeting,
  TimeSlot,
  UnscheduledPair,
} from '../types';
import { isLegacySupplier, migrateSupplier } from '../types';
import { generateSchedule, autoFillCancelledSlots } from '../utils/scheduler';

const initialState: ScheduleState = {
  eventConfig: null,
  suppliers: [],
  buyers: [],
  meetings: [],
  timeSlots: [],
  unscheduledPairs: [],
  isGenerating: false,
};

// Migration function for old data format
function migrateState(data: unknown): ScheduleState {
  if (!data || typeof data !== 'object') return initialState;

  const rawData = data as Record<string, unknown>;

  // Start with initial state defaults, then overlay loaded data
  const state: ScheduleState = {
    ...initialState,
    eventConfig: (rawData.eventConfig as EventConfig | null) ?? null,
    suppliers: (rawData.suppliers as Supplier[]) ?? [],
    buyers: (rawData.buyers as Buyer[]) ?? [],
    meetings: (rawData.meetings as Meeting[]) ?? [],
    timeSlots: (rawData.timeSlots as TimeSlot[]) ?? [],
    unscheduledPairs: (rawData.unscheduledPairs as UnscheduledPair[]) ?? [],
    isGenerating: false, // Always reset to false on load
  };

  // Migrate suppliers if they're in the old format
  if (state.suppliers.length > 0) {
    const firstSupplier = state.suppliers[0];
    if (isLegacySupplier(firstSupplier)) {
      state.suppliers = state.suppliers.map(s =>
        migrateSupplier(s as unknown as Parameters<typeof migrateSupplier>[0])
      );
    }
  }

  // Restore Date objects from strings for timeSlots
  if (state.timeSlots.length > 0) {
    state.timeSlots = state.timeSlots.map(slot => ({
      ...slot,
      startTime: new Date(slot.startTime),
      endTime: new Date(slot.endTime),
    }));
  }

  return state;
}

const ScheduleContext = createContext<ScheduleContextType | undefined>(undefined);

export function ScheduleProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useLocalStorage<ScheduleState>('meeting-scheduler-state', initialState, migrateState);

  const setEventConfig = useCallback((config: EventConfig) => {
    setState(prev => ({ ...prev, eventConfig: config, meetings: [], timeSlots: [] }));
  }, [setState]);

  const addSupplier = useCallback((supplier: Supplier) => {
    setState(prev => ({ ...prev, suppliers: [...prev.suppliers, supplier] }));
  }, [setState]);

  const updateSupplier = useCallback((id: string, updates: Partial<Supplier>) => {
    setState(prev => ({
      ...prev,
      suppliers: prev.suppliers.map(s => (s.id === id ? { ...s, ...updates } : s)),
    }));
  }, [setState]);

  const removeSupplier = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      suppliers: prev.suppliers.filter(s => s.id !== id),
      meetings: prev.meetings.filter(m => m.supplierId !== id),
    }));
  }, [setState]);

  const addBuyer = useCallback((buyer: Buyer) => {
    setState(prev => ({ ...prev, buyers: [...prev.buyers, buyer] }));
  }, [setState]);

  const updateBuyer = useCallback((id: string, updates: Partial<Buyer>) => {
    setState(prev => ({
      ...prev,
      buyers: prev.buyers.map(b => (b.id === id ? { ...b, ...updates } : b)),
    }));
  }, [setState]);

  const removeBuyer = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      buyers: prev.buyers.filter(b => b.id !== id),
      meetings: prev.meetings.filter(m => m.buyerId !== id),
      suppliers: prev.suppliers.map(s => ({
        ...s,
        preferenceList: s.preferenceList.filter(bid => bid !== id),
      })),
    }));
  }, [setState]);

  const importSuppliers = useCallback((suppliers: Supplier[]) => {
    setState(prev => ({ ...prev, suppliers, meetings: [], timeSlots: [] }));
  }, [setState]);

  const importBuyers = useCallback((buyers: Buyer[]) => {
    setState(prev => ({ ...prev, buyers, meetings: [], timeSlots: [] }));
  }, [setState]);

  const generateScheduleAction = useCallback(() => {
    // Set generating state
    setState(prev => ({ ...prev, isGenerating: true }));

    // Use setTimeout to allow UI to update before heavy computation
    setTimeout(() => {
      setState(prev => {
        if (!prev.eventConfig) return { ...prev, isGenerating: false };

        try {
          const result = generateSchedule(prev.eventConfig, prev.suppliers, prev.buyers);
          return {
            ...prev,
            meetings: result.meetings,
            timeSlots: result.timeSlots,
            unscheduledPairs: result.unscheduledPairs,
            isGenerating: false,
          };
        } catch (error) {
          console.error('Schedule generation failed:', error);
          return { ...prev, isGenerating: false };
        }
      });
    }, 50);
  }, [setState]);

  const updateMeetingStatus = useCallback((meetingId: string, status: MeetingStatus) => {
    setState(prev => ({
      ...prev,
      meetings: prev.meetings.map(m => (m.id === meetingId ? { ...m, status } : m)),
    }));
  }, [setState]);

  const swapMeetings = useCallback((meetingId1: string, meetingId2: string) => {
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
  }, [setState]);

  const moveMeeting = useCallback((meetingId: string, newTimeSlotId: string) => {
    setState(prev => ({
      ...prev,
      meetings: prev.meetings.map(m =>
        m.id === meetingId ? { ...m, timeSlotId: newTimeSlotId } : m
      ),
    }));
  }, [setState]);

  const cancelMeeting = useCallback((meetingId: string) => {
    setState(prev => ({
      ...prev,
      meetings: prev.meetings.map(m => (m.id === meetingId ? { ...m, status: 'cancelled' as const } : m)),
    }));
  }, [setState]);

  const autoFillGaps = useCallback(() => {
    setState(prev => ({
      ...prev,
      meetings: autoFillCancelledSlots(prev.suppliers, prev.buyers, prev.timeSlots, prev.meetings),
    }));
  }, [setState]);

  const clearSchedule = useCallback(() => {
    setState(prev => ({ ...prev, meetings: [], timeSlots: [], unscheduledPairs: [] }));
  }, [setState]);

  const exportToJSON = useCallback((): string => {
    return JSON.stringify(state, null, 2);
  }, [state]);

  const importFromJSON = useCallback((json: string) => {
    try {
      const parsed = JSON.parse(json) as ScheduleState;
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
  }, [setState]);

  const resetAllData = useCallback(() => {
    setState(initialState);
  }, [setState]);

  const value = useMemo<ScheduleContextType>(() => ({
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
    resetAllData,
  }), [
    state,
    setEventConfig,
    addSupplier,
    updateSupplier,
    removeSupplier,
    addBuyer,
    updateBuyer,
    removeBuyer,
    importSuppliers,
    importBuyers,
    generateScheduleAction,
    updateMeetingStatus,
    swapMeetings,
    moveMeeting,
    cancelMeeting,
    autoFillGaps,
    clearSchedule,
    exportToJSON,
    importFromJSON,
    resetAllData,
  ]);

  return <ScheduleContext.Provider value={value}>{children}</ScheduleContext.Provider>;
}

export function useSchedule(): ScheduleContextType {
  const context = useContext(ScheduleContext);
  if (context === undefined) {
    throw new Error('useSchedule must be used within a ScheduleProvider');
  }
  return context;
}
