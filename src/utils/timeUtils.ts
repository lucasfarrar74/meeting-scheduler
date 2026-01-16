import type { TimeSlot, EventConfig } from '../types';
import { parse, format, addMinutes, isBefore, isAfter } from 'date-fns';

export function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

export function parseTimeString(dateStr: string, timeStr: string): Date {
  return parse(`${dateStr} ${timeStr}`, 'yyyy-MM-dd HH:mm', new Date());
}

export function formatTime(date: Date): string {
  return format(date, 'h:mm a');
}

export function formatTimeShort(date: Date): string {
  return format(date, 'HH:mm');
}

export function generateTimeSlots(config: EventConfig): TimeSlot[] {
  const slots: TimeSlot[] = [];
  const eventDate = config.date;

  let currentTime = parseTimeString(eventDate, config.startTime);
  const endTime = parseTimeString(eventDate, config.endTime);

  // Sort breaks by start time
  const sortedBreaks = [...config.breaks].sort((a, b) =>
    a.startTime.localeCompare(b.startTime)
  );

  while (isBefore(currentTime, endTime)) {
    // Check if current time falls within a break (exclusive of end time to avoid infinite loop)
    const activeBreak = sortedBreaks.find(brk => {
      const breakStart = parseTimeString(eventDate, brk.startTime);
      const breakEnd = parseTimeString(eventDate, brk.endTime);
      // Use isBefore for end check to exclude the endpoint (avoids infinite loop at break end)
      const withinBreak = !isBefore(currentTime, breakStart) && isBefore(currentTime, breakEnd);
      const wouldOverlapBreak = isBefore(currentTime, breakStart) && isAfter(addMinutes(currentTime, config.defaultMeetingDuration), breakStart);
      return withinBreak || wouldOverlapBreak;
    });

    if (activeBreak) {
      const breakStart = parseTimeString(eventDate, activeBreak.startTime);
      const breakEnd = parseTimeString(eventDate, activeBreak.endTime);

      // If we haven't reached the break yet, create a slot before it
      if (isBefore(currentTime, breakStart)) {
        const slotEnd = breakStart;
        if (isBefore(currentTime, slotEnd)) {
          slots.push({
            id: generateId(),
            startTime: currentTime,
            endTime: slotEnd,
            isBreak: false,
          });
        }
      }

      // Add the break slot
      slots.push({
        id: generateId(),
        startTime: breakStart,
        endTime: breakEnd,
        isBreak: true,
        breakName: activeBreak.name,
      });

      currentTime = breakEnd;
    } else {
      // Regular meeting slot
      const slotEnd = addMinutes(currentTime, config.defaultMeetingDuration);

      // Check if this slot would overlap with a break
      const nextBreak = sortedBreaks.find(brk => {
        const breakStart = parseTimeString(eventDate, brk.startTime);
        return isAfter(breakStart, currentTime) && isBefore(breakStart, slotEnd);
      });

      if (nextBreak) {
        const breakStart = parseTimeString(eventDate, nextBreak.startTime);
        if (isBefore(currentTime, breakStart)) {
          slots.push({
            id: generateId(),
            startTime: currentTime,
            endTime: breakStart,
            isBreak: false,
          });
        }
        currentTime = breakStart;
      } else {
        const actualEnd = isBefore(slotEnd, endTime) ? slotEnd : endTime;
        slots.push({
          id: generateId(),
          startTime: currentTime,
          endTime: actualEnd,
          isBreak: false,
        });
        currentTime = actualEnd;
      }
    }
  }

  return slots.filter(slot => !slot.isBreak || slot.breakName);
}

export function getSlotDuration(slot: TimeSlot): number {
  return (slot.endTime.getTime() - slot.startTime.getTime()) / (1000 * 60);
}
