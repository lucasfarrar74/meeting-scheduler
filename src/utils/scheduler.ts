import type { Supplier, Buyer, Meeting, TimeSlot, EventConfig } from '../types';
import { generateId, generateTimeSlots } from './timeUtils';

interface ScheduleResult {
  meetings: Meeting[];
  timeSlots: TimeSlot[];
  unscheduledPairs: Array<{ supplierId: string; buyerId: string }>;
}

export function canSupplierMeetBuyer(supplier: Supplier, buyerId: string): boolean {
  switch (supplier.preference) {
    case 'all':
      return true;
    case 'include':
      return supplier.preferenceList.includes(buyerId);
    case 'exclude':
      return !supplier.preferenceList.includes(buyerId);
    default:
      return true;
  }
}

export function generateSchedule(
  config: EventConfig,
  suppliers: Supplier[],
  buyers: Buyer[]
): ScheduleResult {
  const timeSlots = generateTimeSlots(config);
  const meetings: Meeting[] = [];
  const unscheduledPairs: Array<{ supplierId: string; buyerId: string }> = [];

  // Get non-break slots only
  const meetingSlots = timeSlots.filter(slot => !slot.isBreak);

  // Track which slots are taken for each supplier and buyer
  const supplierSlots: Map<string, Set<string>> = new Map();
  const buyerSlots: Map<string, Set<string>> = new Map();

  suppliers.forEach(s => supplierSlots.set(s.id, new Set()));
  buyers.forEach(b => buyerSlots.set(b.id, new Set()));

  // Create list of desired meetings based on preferences
  const desiredMeetings: Array<{ supplierId: string; buyerId: string; priority: number }> = [];

  suppliers.forEach(supplier => {
    buyers.forEach(buyer => {
      if (canSupplierMeetBuyer(supplier, buyer.id)) {
        // Priority: include list gets highest priority, then all, then exclude (by count)
        let priority = 1;
        if (supplier.preference === 'include') {
          priority = 3; // Highest - explicitly requested
        } else if (supplier.preference === 'all') {
          priority = 2;
        } else {
          priority = 1; // Exclude list (meeting everyone except some)
        }
        desiredMeetings.push({ supplierId: supplier.id, buyerId: buyer.id, priority });
      }
    });
  });

  // Sort by priority (highest first) then shuffle within same priority for fairness
  desiredMeetings.sort((a, b) => {
    if (b.priority !== a.priority) return b.priority - a.priority;
    return Math.random() - 0.5;
  });

  // Assign meetings to slots
  for (const desired of desiredMeetings) {
    const supplierUsed = supplierSlots.get(desired.supplierId)!;
    const buyerUsed = buyerSlots.get(desired.buyerId)!;

    // Find first available slot where both are free
    const availableSlot = meetingSlots.find(slot =>
      !supplierUsed.has(slot.id) && !buyerUsed.has(slot.id)
    );

    if (availableSlot) {
      meetings.push({
        id: generateId(),
        supplierId: desired.supplierId,
        buyerId: desired.buyerId,
        timeSlotId: availableSlot.id,
        status: 'scheduled',
      });
      supplierUsed.add(availableSlot.id);
      buyerUsed.add(availableSlot.id);
    } else {
      unscheduledPairs.push({
        supplierId: desired.supplierId,
        buyerId: desired.buyerId,
      });
    }
  }

  return { meetings, timeSlots, unscheduledPairs };
}

export function findAvailableSlotForMeeting(
  supplierId: string,
  buyerId: string,
  timeSlots: TimeSlot[],
  existingMeetings: Meeting[],
  excludeSlotId?: string
): TimeSlot | null {
  const meetingSlots = timeSlots.filter(slot => !slot.isBreak);

  for (const slot of meetingSlots) {
    if (slot.id === excludeSlotId) continue;

    const slotMeetings = existingMeetings.filter(m => m.timeSlotId === slot.id && m.status !== 'cancelled');
    const supplierBusy = slotMeetings.some(m => m.supplierId === supplierId);
    const buyerBusy = slotMeetings.some(m => m.buyerId === buyerId);

    if (!supplierBusy && !buyerBusy) {
      return slot;
    }
  }

  return null;
}

export function autoFillCancelledSlots(
  suppliers: Supplier[],
  buyers: Buyer[],
  timeSlots: TimeSlot[],
  meetings: Meeting[]
): Meeting[] {
  const updatedMeetings = [...meetings];
  const meetingSlots = timeSlots.filter(slot => !slot.isBreak);

  // Find cancelled meetings and their slots
  const cancelledMeetings = updatedMeetings.filter(m => m.status === 'cancelled');

  for (const cancelled of cancelledMeetings) {
    const slot = meetingSlots.find(s => s.id === cancelled.timeSlotId);
    if (!slot) continue;

    // Find the supplier for this slot
    const supplier = suppliers.find(s => s.id === cancelled.supplierId);
    if (!supplier) continue;

    // Get current meetings for this slot
    const slotMeetings = updatedMeetings.filter(
      m => m.timeSlotId === slot.id && m.status !== 'cancelled'
    );

    // Find a buyer who:
    // 1. The supplier wants to meet
    // 2. Is not already scheduled at this time
    // 3. Is not already meeting this supplier at another time
    const supplierMeetings = updatedMeetings.filter(
      m => m.supplierId === supplier.id && m.status !== 'cancelled'
    );
    const alreadyMeetingBuyers = new Set(supplierMeetings.map(m => m.buyerId));
    const busyBuyers = new Set(slotMeetings.map(m => m.buyerId));

    const availableBuyer = buyers.find(buyer => {
      if (busyBuyers.has(buyer.id)) return false;
      if (alreadyMeetingBuyers.has(buyer.id)) return false;
      return canSupplierMeetBuyer(supplier, buyer.id);
    });

    if (availableBuyer) {
      // Replace cancelled meeting with new one
      const cancelledIndex = updatedMeetings.findIndex(m => m.id === cancelled.id);
      updatedMeetings[cancelledIndex] = {
        ...cancelled,
        buyerId: availableBuyer.id,
        status: 'scheduled',
      };
    }
  }

  return updatedMeetings;
}
