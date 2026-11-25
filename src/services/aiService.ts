import {
  AIPlanResponse,
  AIScheduleResponse,
  AIWeeklySummaryResponse,
  PriorityLevel,
  Task,
} from '../types/dayflow';
import { getTodayStr } from '../utils/dateUtils';

export interface AIStatusResult {
  available: boolean;
  model: string;
}

export interface AIBreakdownResponse {
  subtasks: string[];
  suggestedPriority: PriorityLevel;
  suggestedDueDate: string;
  estimatedMinutes: number;
  rationale: string;
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(typeof data.error === 'string' ? data.error : `Request failed (${res.status})`);
  }
  return data as T;
}

export async function fetchAiStatus(): Promise<AIStatusResult> {
  try {
    const res = await fetch('/api/ai/status');
    if (!res.ok) return { available: false, model: 'gemini-4-hydrogen' };
    return (await res.json()) as AIStatusResult;
  } catch {
    return { available: false, model: 'gemini-4-hydrogen' };
  }
}

export async function generateAiTaskPlan(
  prompt: string,
  categories: string[]
): Promise<AIPlanResponse> {
  return postJson<AIPlanResponse>('/api/ai/plan', {
    prompt,
    todayDate: getTodayStr(),
    categories,
  });
}

export async function generateAiTaskBreakdown(
  title: string,
  description: string,
  dueDate: string
): Promise<AIBreakdownResponse> {
  return postJson<AIBreakdownResponse>('/api/ai/breakdown', {
    title,
    description,
    dueDate,
    todayDate: getTodayStr(),
  });
}

export async function generateAiSchedule(tasks: Task[]): Promise<AIScheduleResponse> {
  const pending = tasks.filter((t) => t.status !== 'completed');
  return postJson<AIScheduleResponse>('/api/ai/schedule', {
    tasks: pending,
    todayDate: getTodayStr(),
  });
}

export async function generateAiWeeklySummary(metrics: Record<string, unknown>): Promise<AIWeeklySummaryResponse> {
  return postJson<AIWeeklySummaryResponse>('/api/ai/weekly-summary', {
    metrics,
  });
}
