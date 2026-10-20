-- EventPulse schema. Paste this whole file into Supabase > SQL Editor > Run.
-- Safe to run once on a fresh project.

create table public.events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  slug text not null unique,
  title text not null,
  description text not null default '',
  category text not null default 'General',
  banner_url text,
  format text not null default 'in_person' check (format in ('in_person','online','hybrid')),
  venue text,
  meeting_link text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  registration_closes_at timestamptz,
  capacity int check (capacity is null or capacity > 0),
  ask_phone boolean not null default false,
  custom_questions jsonb not null default '[]',
  status text not null default 'draft' check (status in ('draft','published','cancelled','completed','archived')),
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create table public.campaign_links (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  code text not null unique,
  name text not null,
  channel text not null,
  description text,
  utm_source text not null,
  utm_medium text not null,
  utm_campaign text not null,
  utm_content text,
  utm_term text,
  status text not null default 'active' check (status in ('active','inactive','archived')),
  created_at timestamptz not null default now()
);
create index on public.campaign_links(event_id);

create table public.campaign_clicks (
  id uuid primary key default gen_random_uuid(),
  link_id uuid not null references public.campaign_links(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index on public.campaign_clicks(event_id, created_at);

create table public.event_page_views (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  click_id uuid references public.campaign_clicks(id) on delete set null,
  created_at timestamptz not null default now()
);
create index on public.event_page_views(event_id, created_at);

create table public.event_registrations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  name text not null,
  email text not null,
  email_norm text not null,
  phone text,
  answers jsonb not null default '{}',
  status text not null default 'confirmed' check (status in ('confirmed','cancelled')),
  ticket_token text not null unique,
  link_id uuid references public.campaign_links(id) on delete set null,
  click_id uuid references public.campaign_clicks(id) on delete set null,
  utm_source text, utm_medium text, utm_campaign text, utm_content text,
  created_at timestamptz not null default now(),
  unique (event_id, email_norm)
);
create index on public.event_registrations(event_id, created_at);

create table public.event_check_ins (
  id uuid primary key default gen_random_uuid(),
  registration_id uuid not null unique references public.event_registrations(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  checked_in_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Security: all tables locked. Only the server (service-role key) can read/write.
alter table public.events enable row level security;
alter table public.campaign_links enable row level security;
alter table public.campaign_clicks enable row level security;
alter table public.event_page_views enable row level security;
alter table public.event_registrations enable row level security;
alter table public.event_check_ins enable row level security;

-- Atomic registration: locks the event row so capacity can't be exceeded.
create or replace function public.register_attendee(
  p_event_id uuid, p_name text, p_email text, p_phone text, p_answers jsonb,
  p_token text, p_link_id uuid, p_click_id uuid,
  p_utm_source text, p_utm_medium text, p_utm_campaign text, p_utm_content text
) returns jsonb language plpgsql security definer set search_path = public as $$
declare ev public.events; n int; reg public.event_registrations;
begin
  select * into ev from public.events where id = p_event_id for update;
  if not found or ev.status <> 'published' then return jsonb_build_object('error','closed'); end if;
  if ev.registration_closes_at is not null and now() > ev.registration_closes_at then
    return jsonb_build_object('error','deadline'); end if;
  if exists (select 1 from public.event_registrations
             where event_id = p_event_id and email_norm = lower(trim(p_email)) and status = 'confirmed') then
    return jsonb_build_object('error','duplicate'); end if;
  select count(*) into n from public.event_registrations where event_id = p_event_id and status = 'confirmed';
  if ev.capacity is not null and n >= ev.capacity then return jsonb_build_object('error','full'); end if;
  -- a previously cancelled registration for the same email is re-activated
  delete from public.event_registrations
    where event_id = p_event_id and email_norm = lower(trim(p_email)) and status = 'cancelled';
  insert into public.event_registrations(event_id,name,email,email_norm,phone,answers,ticket_token,link_id,click_id,
      utm_source,utm_medium,utm_campaign,utm_content)
    values (p_event_id,p_name,trim(p_email),lower(trim(p_email)),p_phone,coalesce(p_answers,'{}'),p_token,p_link_id,p_click_id,
      p_utm_source,p_utm_medium,p_utm_campaign,p_utm_content)
    returning * into reg;
  return jsonb_build_object('token', reg.ticket_token);
end $$;
revoke all on function public.register_attendee from public, anon, authenticated;
