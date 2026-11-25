import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';
import {
  checkSchemaReady,
  createAnonSupabaseClient,
  createUserSupabaseClient,
  getSupabaseConfig,
  loadDatasetFromSupabase,
  saveDatasetToSupabase,
  verifyUserFromToken,
} from './server/supabaseClient.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const MODEL_NAME = 'gemini-4-hydrogen';

function getAiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function handleAiError(res: Response, error: unknown, fallbackMessage: string) {
  console.error('[Dayflow AI Error]:', error);
  const message =
    error instanceof Error ? error.message : fallbackMessage;
  const status =
    message.includes('403') || message.includes('PERMISSION_DENIED')
      ? 403
      : message.includes('429') || message.includes('RESOURCE_EXHAUSTED')
      ? 429
      : message.includes('400') || message.includes('API_KEY_INVALID')
      ? 400
      : 502;

  res.status(status).json({
    error: message || fallbackMessage,
  });
}

async function createApp() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  // Check if Gemini integration is configured (never returns secret key)
  app.get('/api/ai/status', (_req: Request, res: Response) => {
    const client = getAiClient();
    res.json({
      available: Boolean(client),
      model: MODEL_NAME,
    });
  });

  // Convert natural-language goal or instruction into structured tasks
  app.post('/api/ai/plan', async (req: Request, res: Response) => {
    const client = getAiClient();
    if (!client) {
      res.status(503).json({
        error:
          'AI assistant is currently unavailable because GEMINI_API_KEY is not configured in environment secrets.',
      });
      return;
    }

    const { prompt, todayDate, categories } = req.body ?? {};
    if (typeof prompt !== 'string' || prompt.trim().length < 3 || prompt.length > 1500) {
      res.status(400).json({ error: 'Please provide a clear task prompt (3–1500 characters).' });
      return;
    }

    const safeToday = typeof todayDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(todayDate)
      ? todayDate
      : new Date().toISOString().slice(0, 10);
    const categoryNames = Array.isArray(categories)
      ? categories.filter((c): c is string => typeof c === 'string').slice(0, 20)
      : ['Personal', 'Academics', 'Business', 'Fitness', 'Finance', 'Work'];

    try {
      const response = await client.models.generateContent({
        model: MODEL_NAME,
        contents: `Today's date is ${safeToday}. Available categories: ${categoryNames.join(', ')}.
User request: "${prompt.trim()}"

Create a realistic, actionable plan of 2 to 7 structured tasks to accomplish this request. Assign realistic due dates starting from ${safeToday}, appropriate priorities (urgent, high, medium, low), estimated duration in minutes, matching category name from the available list, and 2-3 concise subtasks per task when helpful.`,
        config: {
          systemInstruction:
            'You are Dayflow Productivity Planner. Return crisp, realistic, actionable tasks with accurate YYYY-MM-DD due dates relative to today.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              summary: {
                type: Type.STRING,
                description: 'A brief 1-2 sentence overview of the proposed plan.',
              },
              tasks: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    description: { type: Type.STRING },
                    dueDate: { type: Type.STRING, description: 'YYYY-MM-DD format' },
                    dueTime: { type: Type.STRING, description: 'HH:mm 24-hour format or empty string' },
                    priority: { type: Type.STRING, description: 'One of: urgent, high, medium, low' },
                    categoryName: { type: Type.STRING },
                    estimatedMinutes: { type: Type.INTEGER },
                    subtasks: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                    },
                    tags: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                    },
                  },
                  required: ['title', 'dueDate', 'priority', 'categoryName', 'estimatedMinutes'],
                },
              },
            },
            required: ['summary', 'tasks'],
          },
        },
      });

      const parsed = JSON.parse((response.text ?? '{}').trim());
      res.json(parsed);
    } catch (error) {
      handleAiError(res, error, 'Failed to generate AI task plan.');
    }
  });

  // Break a single large task into actionable subtasks + suggest priority/deadline
  app.post('/api/ai/breakdown', async (req: Request, res: Response) => {
    const client = getAiClient();
    if (!client) {
      res.status(503).json({
        error: 'AI assistant is unavailable because GEMINI_API_KEY is not configured.',
      });
      return;
    }

    const { title, description, dueDate, todayDate } = req.body ?? {};
    if (typeof title !== 'string' || title.trim().length < 2 || title.length > 300) {
      res.status(400).json({ error: 'Task title is required (2–300 characters).' });
      return;
    }

    const safeToday = typeof todayDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(todayDate)
      ? todayDate
      : new Date().toISOString().slice(0, 10);

    try {
      const response = await client.models.generateContent({
        model: MODEL_NAME,
        contents: `Today is ${safeToday}.
Task title: "${title.trim()}"
Description: "${typeof description === 'string' ? description.slice(0, 800) : ''}"
Current due date: "${typeof dueDate === 'string' ? dueDate : 'unset'}"

Break this task down into 3 to 6 concrete, sequential subtasks, suggest an appropriate priority (urgent, high, medium, low), estimate total duration in minutes, and suggest a realistic deadline (YYYY-MM-DD) with brief reasoning.`,
        config: {
          systemInstruction:
            'You are a pragmatic productivity coach. Keep subtasks concise and immediately actionable.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              subtasks: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              suggestedPriority: { type: Type.STRING },
              suggestedDueDate: { type: Type.STRING },
              estimatedMinutes: { type: Type.INTEGER },
              rationale: { type: Type.STRING },
            },
            required: ['subtasks', 'suggestedPriority', 'suggestedDueDate', 'estimatedMinutes', 'rationale'],
          },
        },
      });

      const parsed = JSON.parse((response.text ?? '{}').trim());
      res.json(parsed);
    } catch (error) {
      handleAiError(res, error, 'Failed to break down task.');
    }
  });

  // Generate personalized daily schedule & identify overloaded days
  app.post('/api/ai/schedule', async (req: Request, res: Response) => {
    const client = getAiClient();
    if (!client) {
      res.status(503).json({
        error: 'AI assistant is unavailable because GEMINI_API_KEY is not configured.',
      });
      return;
    }

    const { tasks, todayDate } = req.body ?? {};
    if (!Array.isArray(tasks)) {
      res.status(400).json({ error: 'Tasks array is required.' });
      return;
    }

    const safeToday = typeof todayDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(todayDate)
      ? todayDate
      : new Date().toISOString().slice(0, 10);

    const compactTasks = tasks.slice(0, 40).map((t) => ({
      id: String(t.id ?? ''),
      title: String(t.title ?? '').slice(0, 120),
      dueDate: String(t.dueDate ?? ''),
      dueTime: String(t.dueTime ?? ''),
      priority: String(t.priority ?? 'medium'),
      estimatedMinutes: Number(t.estimatedMinutes) || 30,
      status: String(t.status ?? 'todo'),
    }));

    try {
      const response = await client.models.generateContent({
        model: MODEL_NAME,
        contents: `Today is ${safeToday}. Analyze these pending tasks:
${JSON.stringify(compactTasks)}

1) Build a realistic time-blocked schedule for today (${safeToday}) prioritizing overdue, urgent, and due-today tasks without burning out the user.
2) Identify any overloaded days in the upcoming week (days where total estimated work exceeds ~240 minutes or >5 heavy tasks) and recommend specific tasks to reschedule.`,
        config: {
          systemInstruction:
            'You are Dayflow Schedule Architect. Only reference actual task IDs and titles provided in the input.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              overview: { type: Type.STRING },
              scheduleBlocks: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    timeSlot: { type: Type.STRING, description: 'e.g. 09:00 - 09:45' },
                    taskId: { type: Type.STRING },
                    taskTitle: { type: Type.STRING },
                    reason: { type: Type.STRING },
                  },
                  required: ['timeSlot', 'taskTitle', 'reason'],
                },
              },
              overloadedDays: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    date: { type: Type.STRING },
                    taskCount: { type: Type.INTEGER },
                    totalMinutes: { type: Type.INTEGER },
                    recommendation: { type: Type.STRING },
                  },
                  required: ['date', 'taskCount', 'totalMinutes', 'recommendation'],
                },
              },
            },
            required: ['overview', 'scheduleBlocks', 'overloadedDays'],
          },
        },
      });

      const parsed = JSON.parse((response.text ?? '{}').trim());
      res.json(parsed);
    } catch (error) {
      handleAiError(res, error, 'Failed to generate daily schedule.');
    }
  });

  // Summarize weekly productivity from real user metrics
  app.post('/api/ai/weekly-summary', async (req: Request, res: Response) => {
    const client = getAiClient();
    if (!client) {
      res.status(503).json({
        error: 'AI assistant is unavailable because GEMINI_API_KEY is not configured.',
      });
      return;
    }

    const { metrics } = req.body ?? {};
    if (!metrics || typeof metrics !== 'object') {
      res.status(400).json({ error: 'Productivity metrics payload is required.' });
      return;
    }

    try {
      const response = await client.models.generateContent({
        model: MODEL_NAME,
        contents: `Summarize this user's real weekly productivity data and give 3 focused, practical recommendations for next week:
${JSON.stringify(metrics).slice(0, 4000)}`,
        config: {
          systemInstruction:
            'You are Dayflow Analytics Advisor. Ground every insight strictly in the numbers provided. Do not invent metrics.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              headline: { type: Type.STRING },
              summary: { type: Type.STRING },
              wins: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              recommendations: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
            },
            required: ['headline', 'summary', 'wins', 'recommendations'],
          },
        },
      });

      const parsed = JSON.parse((response.text ?? '{}').trim());
      res.json(parsed);
    } catch (error) {
      handleAiError(res, error, 'Failed to generate weekly productivity summary.');
    }
  });

  // ==========================================
  // Supabase Status, Auth & Workspace Sync API
  // ==========================================

  app.get('/api/supabase/status', async (_req: Request, res: Response) => {
    const cfg = getSupabaseConfig();
    let schemaReady = false;
    const anonClient = createAnonSupabaseClient();
    if (anonClient) {
      try {
        schemaReady = await checkSchemaReady(anonClient);
      } catch {
        schemaReady = false;
      }
    }

    let sqlSchema = '';
    try {
      const schemaPath = path.resolve(__dirname, 'supabase', 'schema.sql');
      if (fs.existsSync(schemaPath)) {
        sqlSchema = fs.readFileSync(schemaPath, 'utf8');
      }
    } catch {
      sqlSchema = '';
    }

    res.json({
      configured: cfg.configured,
      projectRef: cfg.projectRef,
      url: cfg.url,
      schemaReady,
      sqlSchema,
    });
  });

  app.post('/api/auth/signup', async (req: Request, res: Response) => {
    const anonClient = createAnonSupabaseClient();
    if (!anonClient) {
      res.status(503).json({
        error: 'Supabase is not configured yet. Set SUPABASE_ANON_KEY in Settings > Secrets.',
      });
      return;
    }

    const { email, password } = req.body ?? {};
    if (typeof email !== 'string' || !email.includes('@') || typeof password !== 'string' || password.length < 6) {
      res.status(400).json({ error: 'Valid email and password (min 6 characters) are required.' });
      return;
    }

    const { data, error } = await anonClient.auth.signUp({
      email: email.trim(),
      password,
    });

    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }

    res.json({
      user: data.user ? { id: data.user.id, email: data.user.email } : null,
      accessToken: data.session?.access_token ?? null,
      refreshToken: data.session?.refresh_token ?? null,
      needsEmailConfirmation: Boolean(data.user && !data.session),
    });
  });

  app.post('/api/auth/signin', async (req: Request, res: Response) => {
    const anonClient = createAnonSupabaseClient();
    if (!anonClient) {
      res.status(503).json({
        error: 'Supabase is not configured yet. Set SUPABASE_ANON_KEY in Settings > Secrets.',
      });
      return;
    }

    const { email, password } = req.body ?? {};
    if (typeof email !== 'string' || typeof password !== 'string' || !email.trim() || !password) {
      res.status(400).json({ error: 'Email and password are required.' });
      return;
    }

    const { data, error } = await anonClient.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error || !data.session || !data.user) {
      res.status(401).json({ error: error?.message || 'Invalid login credentials.' });
      return;
    }

    res.json({
      user: { id: data.user.id, email: data.user.email },
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
    });
  });

  app.post('/api/auth/refresh', async (req: Request, res: Response) => {
    const anonClient = createAnonSupabaseClient();
    if (!anonClient) {
      res.status(503).json({ error: 'Supabase is not configured.' });
      return;
    }

    const { refreshToken } = req.body ?? {};
    if (typeof refreshToken !== 'string' || !refreshToken) {
      res.status(400).json({ error: 'Refresh token is required.' });
      return;
    }

    const { data, error } = await anonClient.auth.refreshSession({ refresh_token: refreshToken });
    if (error || !data.session || !data.user) {
      res.status(401).json({ error: error?.message || 'Session expired.' });
      return;
    }

    res.json({
      user: { id: data.user.id, email: data.user.email },
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
    });
  });

  const extractBearer = (req: Request): string => {
    const auth = req.headers.authorization || '';
    if (auth.startsWith('Bearer ')) return auth.slice(7).trim();
    return '';
  };

  app.get('/api/workspace', async (req: Request, res: Response) => {
    const token = extractBearer(req);
    if (!token) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }

    const user = await verifyUserFromToken(token);
    const userClient = createUserSupabaseClient(token);
    if (!user || !userClient) {
      res.status(401).json({ error: 'Invalid or expired Supabase session.' });
      return;
    }

    try {
      const schemaReady = await checkSchemaReady(userClient);
      if (!schemaReady) {
        res.status(409).json({
          error: 'Supabase tables have not been created yet. Run supabase/schema.sql in your SQL Editor.',
          code: 'SCHEMA_MISSING',
        });
        return;
      }

      const data = await loadDatasetFromSupabase(userClient, user.id);
      res.json(data);
    } catch (err) {
      console.error('[Supabase Load Error]:', err);
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Failed to load workspace from Supabase.',
      });
    }
  });

  app.put('/api/workspace', async (req: Request, res: Response) => {
    const token = extractBearer(req);
    if (!token) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }

    const user = await verifyUserFromToken(token);
    const userClient = createUserSupabaseClient(token);
    if (!user || !userClient) {
      res.status(401).json({ error: 'Invalid or expired Supabase session.' });
      return;
    }

    const payload = req.body;
    if (!payload || !Array.isArray(payload.tasks) || !Array.isArray(payload.categories)) {
      res.status(400).json({ error: 'Invalid workspace dataset payload.' });
      return;
    }

    try {
      await saveDatasetToSupabase(userClient, user.id, payload);
      res.json({ ok: true, syncedAt: new Date().toISOString() });
    } catch (err) {
      console.error('[Supabase Save Error]:', err);
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Failed to save workspace to Supabase.',
      });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('/{*splat}', (_req: Request, res: Response) => {
      const indexHtml = path.join(distPath, 'index.html');
      if (fs.existsSync(indexHtml)) {
        res.sendFile(indexHtml);
      } else {
        res.status(404).send('Build output not found. Run npm run build first.');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Dayflow server listening on http://localhost:${PORT}`);
  });
}

createApp().catch((err) => {
  console.error('Failed to start Dayflow server:', err);
  process.exit(1);
});
