-- EventPulse upgrade: waitlist, referrals, automations, email log, feedback, team, certificates.
-- Paste into Supabase > SQL Editor > Run (after schema.sql). Run once.

alter table public.events
  add column if not exists waitlist_enabled boolean not null default false,
  add column if not exists organizer_name text,
  add column if not exists certificate_text text;

alter table public.event_registrations drop constraint if exists event_registrations_status_check;
alter table public.event_registrations add constraint event_registrations_status_check
  check (status in ('confirmed','waitlisted','cancelled'));
alter table public.event_registrations
  add column if not exists referral_code text unique,
  add column if not exists referred_by uuid references public.event_registrations(id) on delete set null;

create table if not exists public.event_automations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  kind text not null check (kind in ('confirmation','reminder','feedback','certificate','no_show','waitlist_promoted','low_signups')),
  enabled boolean not null default true,
  offset_hours int not null default 24,
  subject text not null,
  body text not null,
  unique (event_id, kind)
);

create table if not exists public.email_log (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  registration_id uuid references public.event_registrations(id) on delete cascade,
  kind text not null,
  to_email text not null,
  subject text not null,
  status text not null check (status in ('sent','failed','skipped')),
  error text,
  created_at timestamptz not null default now()
);
create index if not exists email_log_event on public.email_log(event_id, created_at desc);
-- A given email kind can be successfully sent at most once per registration.
create unique index if not exists email_log_once on public.email_log(registration_id, kind) where status = 'sent' and registration_id is not null;

create table if not exists public.event_feedback (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  registration_id uuid not null unique references public.event_registrations(id) on delete cascade,
  rating int not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now()
);

create table if not exists public.event_members (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('organiser','staff')),
  created_at timestamptz not null default now(),
  unique (event_id, user_id)
);

alter table public.event_automations enable row level security;
alter table public.email_log enable row level security;
alter table public.event_feedback enable row level security;
alter table public.event_members enable row level security;

-- Registration now supports waitlist + referral codes
drop function if exists public.register_attendee(uuid,text,text,text,jsonb,text,uuid,uuid,text,text,text,text);
create or replace function public.register_attendee(
  p_event_id uuid, p_name text, p_email text, p_phone text, p_answers jsonb,
  p_token text, p_link_id uuid, p_click_id uuid,
  p_utm_source text, p_utm_medium text, p_utm_campaign text, p_utm_content text,
  p_ref_code text, p_referrer_code text
) returns jsonb language plpgsql security definer set search_path = public as $$
declare ev public.events; n int; reg public.event_registrations; st text := 'confirmed'; referrer uuid;
begin
  select * into ev from public.events where id = p_event_id for update;
  if not found or ev.status <> 'published' then return jsonb_build_object('error','closed'); end if;
  if ev.registration_closes_at is not null and now() > ev.registration_closes_at then
    return jsonb_build_object('error','deadline'); end if;
  if exists (select 1 from public.event_registrations
             where event_id = p_event_id and email_norm = lower(trim(p_email)) and status in ('confirmed','waitlisted')) then
    return jsonb_build_object('error','duplicate'); end if;
  select count(*) into n from public.event_registrations where event_id = p_event_id and status = 'confirmed';
  if ev.capacity is not null and n >= ev.capacity then
    if ev.waitlist_enabled then st := 'waitlisted'; else return jsonb_build_object('error','full'); end if;
  end if;
  if p_referrer_code is not null then
    select id into referrer from public.event_registrations where event_id = p_event_id and referral_code = p_referrer_code and status = 'confirmed';
  end if;
  delete from public.event_registrations
    where event_id = p_event_id and email_norm = lower(trim(p_email)) and status = 'cancelled';
  insert into public.event_registrations(event_id,name,email,email_norm,phone,answers,status,ticket_token,link_id,click_id,
      utm_source,utm_medium,utm_campaign,utm_content,referral_code,referred_by)
    values (p_event_id,p_name,trim(p_email),lower(trim(p_email)),p_phone,coalesce(p_answers,'{}'),st,p_token,p_link_id,p_click_id,
      p_utm_source,p_utm_medium,p_utm_campaign,p_utm_content,p_ref_code,referrer)
    returning * into reg;
  return jsonb_build_object('token', reg.ticket_token, 'status', reg.status, 'id', reg.id);
end $$;
revoke all on function public.register_attendee from public, anon, authenticated;

-- Moves waitlisted people to confirmed (oldest first) while spots are free. Returns the promoted ids.
create or replace function public.promote_waitlist(p_event_id uuid)
returns uuid[] language plpgsql security definer set search_path = public as $$
declare ev public.events; n int; r uuid; promoted uuid[] := '{}';
begin
  select * into ev from public.events where id = p_event_id for update;
  if not found or not ev.waitlist_enabled then return promoted; end if;
  loop
    select count(*) into n from public.event_registrations where event_id = p_event_id and status = 'confirmed';
    exit when ev.capacity is not null and n >= ev.capacity;
    select id into r from public.event_registrations where event_id = p_event_id and status = 'waitlisted' order by created_at limit 1;
    exit when r is null;
    update public.event_registrations set status = 'confirmed' where id = r;
    promoted := promoted || r;
  end loop;
  return promoted;
end $$;
revoke all on function public.promote_waitlist from public, anon, authenticated;
