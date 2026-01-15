export interface Supplier {
  id: string;
  name: string;
  organization: string;
  email?: string;
  phone?: string;
  tableNumber?: number;
  meetingDuration: number; // in minutes
  preference: PreferenceType;
  preferenceList: string[]; // buyer IDs
}

export interface Buyer {
  id: string;
  name: string;
  organization: string;
  email?: string;
  phone?: string;
}

export type PreferenceType = 'all' | 'include' | 'exclude';

export interface TimeSlot {
  id: string;
  startTime: Date;
  endTime: Date;
  isBreak: boolean;
  breakName?: string;
}

export interface Meeting {
  id: string;
  supplierId: string;
  buyerId: string;
  timeSlotId: string;
  status: MeetingStatus;
}

export type MeetingStatus = 'scheduled' | 'completed' | 'cancelled' | 'late';

export interface Break {
  id: string;
  name: string;
  startTime: string; // HH:mm format
  endTime: string;   // HH:mm format
}

export interface EventConfig {
  id: string;
  name: string;
  date: string;        // YYYY-MM-DD format
  startTime: string;   // HH:mm format
  endTime: string;     // HH:mm format
  defaultMeetingDuration: number; // in minutes
  breaks: Break[];
}

export interface ScheduleState {
  eventConfig: EventConfig | null;
  suppliers: Supplier[];
  buyers: Buyer[];
  meetings: Meeting[];
  timeSlots: TimeSlot[];
}

export interface ScheduleContextType extends ScheduleState {
  setEventConfig: (config: EventConfig) => void;
  addSupplier: (supplier: Supplier) => void;
  updateSupplier: (id: string, supplier: Partial<Supplier>) => void;
  removeSupplier: (id: string) => void;
  addBuyer: (buyer: Buyer) => void;
  updateBuyer: (id: string, buyer: Partial<Buyer>) => void;
  removeBuyer: (id: string) => void;
  importSuppliers: (suppliers: Supplier[]) => void;
  importBuyers: (buyers: Buyer[]) => void;
  generateSchedule: () => void;
  updateMeetingStatus: (meetingId: string, status: MeetingStatus) => void;
  swapMeetings: (meetingId1: string, meetingId2: string) => void;
  moveMeeting: (meetingId: string, newTimeSlotId: string) => void;
  cancelMeeting: (meetingId: string) => void;
  autoFillGaps: () => void;
  clearSchedule: () => void;
  exportToJSON: () => string;
  importFromJSON: (json: string) => void;
}
