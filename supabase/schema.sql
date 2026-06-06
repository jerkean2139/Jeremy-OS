-- Jeremy OS — optional Supabase schema.
-- The app runs entirely on localStorage by default. Apply this schema and set
-- NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY to enable cloud sync.
-- Row Level Security ties every row to the authenticated user.

-- Identity statement (one row per user)
create table if not exists identity (
  user_id uuid primary key references auth.users(id) on delete cascade,
  lines text[] not null default '{}',
  updated_at timestamptz not null default now()
);

-- Daily entries
create table if not exists days (
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  mountain text default '',
  pressure_level int not null default 5,
  pressure_sources text[] not null default '{}',
  weight numeric,
  sleep_hours numeric,
  moved_mountain boolean,
  morning jsonb,
  reflection jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, date)
);

-- Elevator logs (THC sessions, code-worded)
create table if not exists elevator_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  ts timestamptz not null default now(),
  floors int not null default 1,
  pressure_level int not null default 5,
  triggers text[] not null default '{}',
  note text
);

-- Theater logs (porn sessions, code-worded, private)
create table if not exists theater_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  ts timestamptz not null default now(),
  acts int not null default 1,
  pressure_level int not null default 5,
  trigger text
);

-- Manumation launch command center (one row per user)
create table if not exists manumation (
  user_id uuid primary key references auth.users(id) on delete cascade,
  funnel_completion int not null default 0,
  content_loaded int not null default 0,
  outbound_status int not null default 0,
  summit_planning int not null default 0,
  team_readiness int not null default 0,
  launch_date date,
  updated_at timestamptz not null default now()
);

-- Coach conversation history
create table if not exists coach_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  ts timestamptz not null default now()
);

-- Row Level Security
alter table identity enable row level security;
alter table days enable row level security;
alter table elevator_logs enable row level security;
alter table theater_logs enable row level security;
alter table manumation enable row level security;
alter table coach_messages enable row level security;

do $$
declare t text;
begin
  foreach t in array array['identity','days','elevator_logs','theater_logs','manumation','coach_messages']
  loop
    execute format($f$
      create policy "own rows" on %I
        for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
    $f$, t);
  end loop;
end $$;
