-- Enrichment data is scoped to the signed-in Supabase Auth user.
-- The API sends that user's JWT. The anon role has no grants on these tables.
-- Run this in the Supabase SQL editor (or via the Supabase CLI) before using /api/enrich.

do $$ begin
  create type job_status as enum ('pending', 'processing', 'completed', 'failed');
exception
  when duplicate_object then null;
end $$;

create table if not exists enrichment_jobs (
  id uuid primary key default gen_random_uuid(),
  company_name text not null,
  status job_status default 'pending',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  user_id uuid references auth.users (id) on delete cascade
);

create table if not exists pipeline_telemetry (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references enrichment_jobs (id) on delete cascade,
  step_name text not null,
  log_level text not null default 'INFO',
  message text not null,
  execution_time_ms integer default 0,
  created_at timestamptz default now()
);

create table if not exists enriched_leads (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references enrichment_jobs (id) on delete set null,
  company_name text not null,
  tech_stack jsonb,
  recent_news text,
  lead_score integer,
  -- Left unused. The pipeline does not invent a confidence score.
  confidence_percentage numeric,
  processed_at timestamptz default now(),
  user_id uuid references auth.users (id) on delete cascade
);

alter table enrichment_jobs
  add column if not exists user_id uuid references auth.users (id) on delete cascade;

alter table enriched_leads
  add column if not exists user_id uuid references auth.users (id) on delete cascade;

-- One account must not overwrite another account's lead for the same company name.
alter table enriched_leads drop constraint if exists enriched_leads_company_name_key;

create unique index if not exists enriched_leads_user_id_company_name_key
  on enriched_leads (user_id, company_name);

create index if not exists idx_telemetry_job_id on pipeline_telemetry (job_id);
create index if not exists idx_enrichment_jobs_status on enrichment_jobs (status);
create index if not exists idx_enrichment_jobs_user_created
  on enrichment_jobs (user_id, created_at desc);

alter table enrichment_jobs enable row level security;
alter table pipeline_telemetry enable row level security;
alter table enriched_leads enable row level security;

revoke all on table enrichment_jobs from anon;
revoke all on table pipeline_telemetry from anon;
revoke all on table enriched_leads from anon;

-- Default privileges often grant ALL to authenticated. Revoke first so the
-- grants below are the whole allow-list.
revoke all on table enrichment_jobs from authenticated;
revoke all on table pipeline_telemetry from authenticated;
revoke all on table enriched_leads from authenticated;

grant select, insert on table enrichment_jobs to authenticated;
-- Status changes only. created_at stays server-controlled so a user cannot
-- rewrite timestamps to slip past the per-user rate limit.
grant update (status, updated_at) on table enrichment_jobs to authenticated;
grant select, insert on table pipeline_telemetry to authenticated;
grant select, insert, update on table enriched_leads to authenticated;

drop policy if exists enrichment_jobs_select_own on enrichment_jobs;
create policy enrichment_jobs_select_own
  on enrichment_jobs
  for select
  to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists enrichment_jobs_insert_own on enrichment_jobs;
create policy enrichment_jobs_insert_own
  on enrichment_jobs
  for insert
  to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists enrichment_jobs_update_own on enrichment_jobs;
create policy enrichment_jobs_update_own
  on enrichment_jobs
  for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists pipeline_telemetry_select_own on pipeline_telemetry;
create policy pipeline_telemetry_select_own
  on pipeline_telemetry
  for select
  to authenticated
  using (
    exists (
      select 1
      from enrichment_jobs
      where enrichment_jobs.id = pipeline_telemetry.job_id
        and enrichment_jobs.user_id = (select auth.uid())
    )
  );

drop policy if exists pipeline_telemetry_insert_own on pipeline_telemetry;
create policy pipeline_telemetry_insert_own
  on pipeline_telemetry
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from enrichment_jobs
      where enrichment_jobs.id = pipeline_telemetry.job_id
        and enrichment_jobs.user_id = (select auth.uid())
    )
  );

drop policy if exists enriched_leads_select_own on enriched_leads;
create policy enriched_leads_select_own
  on enriched_leads
  for select
  to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists enriched_leads_insert_own on enriched_leads;
create policy enriched_leads_insert_own
  on enriched_leads
  for insert
  to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists enriched_leads_update_own on enriched_leads;
create policy enriched_leads_update_own
  on enriched_leads
  for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
