-- Dayflow Supabase PostgreSQL Schema & Row Level Security
-- Project: xphkbboujffjcbdfantb
-- Run this script once in your Supabase Dashboard -> SQL Editor

create table if not exists public.dayflow_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Alex Morgan',
  role_title text not null default 'Product Designer & Builder',
  avatar_url text not null default '',
  theme text not null default 'dark',
  accent_color text not null default 'violet',
  default_priority text not null default 'medium',
  focus_minutes int not null default 25,
  short_break_minutes int not null default 5,
  long_break_minutes int not null default 15,
  sound_enabled boolean not null default true,
  browser_notifications boolean not null default false,
  in_app_reminders boolean not null default true,
  reminder_lead_minutes int not null default 45,
  updated_at timestamptz not null default now()
);

create table if not exists public.dayflow_categories (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  name text not null,
  color text not null default '#8b5cf6',
  icon_name text not null default 'Folder',
  is_default boolean not null default false,
  primary key (user_id, id)
);

create table if not exists public.dayflow_projects (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  name text not null,
  description text not null default '',
  deadline text not null default '',
  color text not null default '#7c3aed',
  status text not null default 'active',
  created_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table if not exists public.dayflow_tasks (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  title text not null,
  description text not null default '',
  due_date text not null default '',
  due_time text not null default '',
  priority text not null default 'medium',
  category_id text not null default 'cat-personal',
  project_id text,
  status text not null default 'todo',
  subtasks jsonb not null default '[]'::jsonb,
  tags text[] not null default '{}',
  estimated_minutes int not null default 30,
  recurring text not null default 'none',
  notes text not null default '',
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  primary key (user_id, id)
);

create table if not exists public.dayflow_habits (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  title text not null,
  description text not null default '',
  schedule text not null default 'daily',
  custom_days int[] not null default '{1,2,3,4,5}',
  color text not null default '#10b981',
  icon_name text not null default 'Flame',
  completed_dates text[] not null default '{}',
  created_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table if not exists public.dayflow_focus_sessions (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  task_id text,
  task_title text,
  mode text not null default 'focus',
  duration_minutes int not null default 25,
  completed_at timestamptz not null default now(),
  primary key (user_id, id)
);

-- Enable Row Level Security (RLS) on all tables
alter table public.dayflow_preferences enable row level security;
alter table public.dayflow_categories enable row level security;
alter table public.dayflow_projects enable row level security;
alter table public.dayflow_tasks enable row level security;
alter table public.dayflow_habits enable row level security;
alter table public.dayflow_focus_sessions enable row level security;

-- Drop existing policies if re-running script
drop policy if exists "Users manage own preferences" on public.dayflow_preferences;
drop policy if exists "Users manage own categories" on public.dayflow_categories;
drop policy if exists "Users manage own projects" on public.dayflow_projects;
drop policy if exists "Users manage own tasks" on public.dayflow_tasks;
drop policy if exists "Users manage own habits" on public.dayflow_habits;
drop policy if exists "Users manage own focus sessions" on public.dayflow_focus_sessions;

-- Strict per-user RLS policies
create policy "Users manage own preferences"
  on public.dayflow_preferences for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users manage own categories"
  on public.dayflow_categories for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users manage own projects"
  on public.dayflow_projects for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users manage own tasks"
  on public.dayflow_tasks for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users manage own habits"
  on public.dayflow_habits for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users manage own focus sessions"
  on public.dayflow_focus_sessions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Helpful indexes
create index if not exists idx_dayflow_tasks_user_due on public.dayflow_tasks (user_id, due_date);
create index if not exists idx_dayflow_tasks_user_status on public.dayflow_tasks (user_id, status);
create index if not exists idx_dayflow_focus_user_completed on public.dayflow_focus_sessions (user_id, completed_at desc);
