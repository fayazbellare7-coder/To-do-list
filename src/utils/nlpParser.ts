import { Category, PriorityLevel, RecurringRule } from '../types/dayflow';
import { addDaysStr, formatLocalDate, getTodayStr, pad2, parseLocalDate } from './dateUtils';

export interface ParsedQuickTask {
  title: string;
  dueDate: string;
  dueTime: string;
  priority?: PriorityLevel;
  recurring: RecurringRule;
  categoryId?: string;
  tags: string[];
  estimatedMinutes?: number;
}

const WEEKDAYS: Record<string, number> = {
  sunday: 0,
  sun: 0,
  monday: 1,
  mon: 1,
  tuesday: 2,
  tue: 2,
  tues: 2,
  wednesday: 3,
  wed: 3,
  thursday: 4,
  thu: 4,
  thurs: 4,
  friday: 5,
  fri: 5,
  saturday: 6,
  sat: 6,
};

export function parseQuickTaskInput(
  raw: string,
  categories: Category[],
  defaultPriority: PriorityLevel
): ParsedQuickTask {
  let working = raw.trim();
  let dueDate = '';
  let dueTime = '';
  let priority: PriorityLevel | undefined;
  let recurring: RecurringRule = 'none';
  let categoryId: string | undefined;
  let estimatedMinutes: number | undefined;
  const tags: string[] = [];

  const today = getTodayStr();

  // Extract hashtags (#work, #exam)
  working = working.replace(/#([a-zA-Z0-9_-]+)/g, (_m, tag: string) => {
    const lower = tag.toLowerCase();
    const matchedCategory = categories.find((c) => c.name.toLowerCase() === lower);
    if (matchedCategory && !categoryId) {
      categoryId = matchedCategory.id;
    } else if (!tags.includes(lower)) {
      tags.push(lower);
    }
    return '';
  });

  // Extract explicit duration (e.g., "45m", "1h", "90 min")
  working = working.replace(/\b(\d+)\s*(min|mins|minutes|m|hr|hrs|hour|hours|h)\b/gi, (_m, num: string, unit: string) => {
    const val = Number(num);
    if (!Number.isNaN(val) && val > 0) {
      estimatedMinutes = unit.toLowerCase().startsWith('h') ? val * 60 : val;
    }
    return '';
  });

  // Extract priority phrases
  const priorityPatterns: Array<{ regex: RegExp; level: PriorityLevel }> = [
    { regex: /\b(urgent|p1|critical)\b/i, level: 'urgent' },
    { regex: /,?\s*\b(high\s+priority|priority\s+high|p2)\b/i, level: 'high' },
    { regex: /,?\s*\b(medium\s+priority|priority\s+medium|p3)\b/i, level: 'medium' },
    { regex: /,?\s*\b(low\s+priority|priority\s+low|p4)\b/i, level: 'low' },
  ];
  for (const p of priorityPatterns) {
    if (p.regex.test(working)) {
      priority = p.level;
      working = working.replace(p.regex, '');
      break;
    }
  }

  // Extract recurrence
  if (/\bevery\s+day\b|\bdaily\b/i.test(working)) {
    recurring = 'daily';
    working = working.replace(/\bevery\s+day\b|\bdaily\b/gi, '');
    if (!dueDate) dueDate = today;
  } else if (/\bevery\s+weekday\b|\bweekdays\b/i.test(working)) {
    recurring = 'weekdays';
    working = working.replace(/\bevery\s+weekday\b|\bweekdays\b/gi, '');
    if (!dueDate) dueDate = today;
  } else if (/\bevery\s+week\b|\bweekly\b/i.test(working)) {
    recurring = 'weekly';
    working = working.replace(/\bevery\s+week\b|\bweekly\b/gi, '');
    if (!dueDate) dueDate = today;
  } else if (/\bevery\s+month\b|\bmonthly\b/i.test(working)) {
    recurring = 'monthly';
    working = working.replace(/\bevery\s+month\b|\bmonthly\b/gi, '');
    if (!dueDate) dueDate = today;
  } else {
    const everyWeekdayMatch = working.match(/\bevery\s+(sunday|sun|monday|mon|tuesday|tue|tues|wednesday|wed|thursday|thu|thurs|friday|fri|saturday|sat)\b/i);
    if (everyWeekdayMatch) {
      recurring = 'weekly';
      const targetDow = WEEKDAYS[everyWeekdayMatch[1].toLowerCase()];
      const nowD = parseLocalDate(today);
      const diff = (targetDow - nowD.getDay() + 7) % 7;
      dueDate = addDaysStr(today, diff);
      working = working.replace(everyWeekdayMatch[0], '');
    }
  }

  // Extract time: "at 5 PM", "at 17:30", "9:30 am"
  const timeMatch = working.match(/\b(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i) ||
    working.match(/\bat\s+(\d{1,2}):(\d{2})\b/i);
  if (timeMatch) {
    let hour = Number(timeMatch[1]);
    const minute = Number(timeMatch[2] || '0');
    const meridiem = timeMatch[3]?.toLowerCase();
    if (meridiem === 'pm' && hour < 12) hour += 12;
    if (meridiem === 'am' && hour === 12) hour = 0;
    if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
      dueTime = `${pad2(hour)}:${pad2(minute)}`;
      working = working.replace(timeMatch[0], '');
    }
  }

  // Extract explicit ISO date YYYY-MM-DD
  const isoMatch = working.match(/\b(\d{4}-\d{2}-\d{2})\b/);
  if (isoMatch) {
    dueDate = isoMatch[1];
    working = working.replace(isoMatch[0], '');
  }

  // Extract relative dates
  if (!dueDate) {
    if (/\btoday\b/i.test(working)) {
      dueDate = today;
      working = working.replace(/\btoday\b/gi, '');
    } else if (/\btomorrow\b/i.test(working)) {
      dueDate = addDaysStr(today, 1);
      working = working.replace(/\btomorrow\b/gi, '');
    } else {
      const inDaysMatch = working.match(/\bin\s+(\d+)\s+days?\b/i);
      if (inDaysMatch) {
        dueDate = addDaysStr(today, Number(inDaysMatch[1]));
        working = working.replace(inDaysMatch[0], '');
      } else {
        const dayMatch = working.match(
          /\b(?:(?:on|this|next)\s+)?(sunday|monday|tuesday|wednesday|thursday|friday|saturday|sun|mon|tue|tues|wed|thu|thurs|fri|sat)\b/i
        );
        if (dayMatch) {
          const isNext = /\bnext\b/i.test(dayMatch[0]);
          const targetDow = WEEKDAYS[dayMatch[1].toLowerCase()];
          const base = parseLocalDate(today);
          let diff = (targetDow - base.getDay() + 7) % 7;
          if (diff === 0 || isNext) diff += 7;
          const target = new Date(base);
          target.setDate(base.getDate() + diff);
          dueDate = formatLocalDate(target);
          working = working.replace(dayMatch[0], '');
        }
      }
    }
  }

  // Infer category from keyword if not set via #hashtag
  if (!categoryId) {
    const lowerTitle = working.toLowerCase();
    for (const cat of categories) {
      if (lowerTitle.includes(cat.name.toLowerCase())) {
        categoryId = cat.id;
        break;
      }
    }
    if (!categoryId) {
      if (/\b(gym|workout|run|fitness|yoga|exercise)\b/i.test(lowerTitle)) {
        categoryId = categories.find((c) => c.name.toLowerCase() === 'fitness')?.id;
      } else if (/\b(exam|assignment|study|chapter|lecture|homework|thesis)\b/i.test(lowerTitle)) {
        categoryId = categories.find((c) => c.name.toLowerCase() === 'academics')?.id;
      } else if (/\b(invoice|budget|tax|expense|bill|finance)\b/i.test(lowerTitle)) {
        categoryId = categories.find((c) => c.name.toLowerCase() === 'finance')?.id;
      } else if (/\b(client|sprint|meeting|deploy|project|report|work)\b/i.test(lowerTitle)) {
        categoryId = categories.find((c) => c.name.toLowerCase() === 'work')?.id;
      }
    }
  }

  const cleanedTitle = working
    .replace(/\s*,\s*$/g, '')
    .replace(/^\s*,\s*/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

  return {
    title: cleanedTitle || raw.trim(),
    dueDate: dueDate || today,
    dueTime,
    priority: priority ?? defaultPriority,
    recurring,
    categoryId: categoryId ?? categories[0]?.id,
    tags,
    estimatedMinutes,
  };
}
