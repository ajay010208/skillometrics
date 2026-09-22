-- ============================================================================
-- SkilloMetrics — Supabase RLS lockdown (public anon key hardening)
-- Run once in: Supabase dashboard → SQL Editor → New query → paste → Run
--
-- Architecture context (why "default deny" is correct here):
--   Browser → supabase-js uses the ANON key for AUTH ONLY (OAuth sign-in).
--   It never queries tables directly (verified: zero supabase.from() calls).
--   All data access goes through Express/Prisma with a privileged connection
--   string (direct Postgres / pooler), which BYPASSES RLS entirely.
--   Therefore: deny everything to anon/authenticated is safe today AND
--   future-proofs the day someone adds a direct supabase.from() call.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Helper: map a Supabase auth user (email) to this app's Profile.role
--    Profile.id is a cuid, NOT the Supabase auth UID, so we match on email.
-- ----------------------------------------------------------------------------
create or replace function public.app_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select p.role
  from "Profile" p
  where p.email = coalesce(
    (select auth.jwt() ->> 'email'),
    (select u.email from auth.users u where u.id = auth.uid())
  )
  limit 1;
$$;

-- ----------------------------------------------------------------------------
-- 2. Default deny: RLS on, no policies for anon/authenticated anywhere.
--    (Prisma keeps working: it connects as the postgres/pooler role.)
-- ----------------------------------------------------------------------------
do $$
declare t record;
begin
  for t in
    select tablename from pg_tables
    where schemaname = 'public'
      and tablename in (
        'Profile','Trainee','ConsentLog','Skill','TargetJob','Resume',
        'TraineeSkill','LearningResource','RoadmapItem','Assessment',
        'ProjectSubmission','Recruiter','Job','Match','Shortlist',
        'Placement','CompanyReview','FollowUp','Provider','Course',
        'Enrollment','ChatMessage','AuditLog'
      )
  loop
    execute format('alter table public.%I enable row level security', t.tablename);
    execute format('drop policy if exists public_read_%I on public.%I', t.tablename, t.tablename);
  end loop;
end $$;

-- ----------------------------------------------------------------------------
-- 3. Reference data (Skill, TargetJob, LearningResource): world-readable.
--    These power roadmaps/analysis; no personal data. INSERT/UPDATE/DELETE
--    restricted to admin.
-- ----------------------------------------------------------------------------
create policy ref_read on public.Skill        for select using (true);
create policy ref_read on public.TargetJob    for select using (true);
create policy ref_read on public.LearningResource for select using (true);

create policy ref_admin_write on public.Skill            for all using (public.app_role() = 'admin') with check (public.app_role() = 'admin');
create policy ref_admin_write on public.TargetJob        for all using (public.app_role() = 'admin') with check (public.app_role() = 'admin');
create policy ref_admin_write on public.LearningResource for all using (public.app_role() = 'admin') with check (public.app_role() = 'admin');

-- ----------------------------------------------------------------------------
-- 4. Trainee personal data: owner-only (email match on the owning Profile).
--    Recruiters can see trainees only via consentRecruiterVisible = true.
-- ----------------------------------------------------------------------------
create policy trainee_owner on public.Trainee
  for all
  using (
    exists (
      select 1 from public.Profile p
      join public.Trainee tr on tr."profileId" = p.id
      where p.email = coalesce(
        (select auth.jwt() ->> 'email'),
        (select u.email from auth.users u where u.id = auth.uid())
      )
      and tr.id = Trainee.id
    )
    or public.app_role() = 'admin'
  )
  with check (
    exists (
      select 1 from public.Profile p
      join public.Trainee tr on tr."profileId" = p.id
      where p.email = coalesce(
        (select auth.jwt() ->> 'email'),
        (select u.email from auth.users u where u.id = auth.uid())
      )
      and tr.id = Trainee.id
    )
    or public.app_role() = 'admin'
  );

create policy trainee_recruiter_read on public.Trainee
  for select
  using (
    public.app_role() in ('recruiter','admin')
    and "consentRecruiterVisible" = true
  );

-- ----------------------------------------------------------------------------
-- 5. Child tables of Trainee: same owner rule via parent join.
--    (Resume, TraineeSkill, RoadmapItem, Assessment, ProjectSubmission,
--     Match, Shortlist, Enrollment, ChatMessage, ConsentLog)
-- ----------------------------------------------------------------------------
do $$
declare t record;
begin
  for t in
    select unnest(array[
      'Resume','TraineeSkill','RoadmapItem','Assessment',
      'ProjectSubmission','Match','Shortlist','Enrollment',
      'ChatMessage','ConsentLog'
    ]) as tablename
  loop
    execute format($f$
      create policy {0}_owner on public.{0}
        for all
        using (
          exists (
            select 1
            from public.{0} c
            join public.Trainee tr on tr.id = c."traineeId"
            join public.Profile p on p.id = tr."profileId"
            where p.email = coalesce(
              (select auth.jwt() ->> 'email'),
              (select u.email from auth.users u where u.id = auth.uid())
            )
            and c.id = {0}.id
          )
          or public.app_role() = 'admin'
        )
        with check (
          exists (
            select 1
            from public.{0} c
            join public.Trainee tr on tr.id = c."traineeId"
            join public.Profile p on p.id = tr."profileId"
            where p.email = coalesce(
              (select auth.jwt() ->> 'email'),
              (select u.email from auth.users u where u.id = auth.uid())
            )
            and c.id = {0}.id
          )
          or public.app_role() = 'admin'
        )
    $f$, t.tablename);
  end loop;
end $$;

-- ----------------------------------------------------------------------------
-- 6. Recruiter-side tables: recruiters see/manage their own rows.
--    (Recruiter, Job, Shortlist)
-- ----------------------------------------------------------------------------
create policy recruiter_owner on public.Recruiter
  for all
  using (
    exists (
      select 1 from public.Profile p
      join public.Recruiter r on r."profileId" = p.id
      where p.email = coalesce(
        (select auth.jwt() ->> 'email'),
        (select u.email from auth.users u where u.id = auth.uid())
      )
      and r.id = Recruiter.id
    )
    or public.app_role() = 'admin'
  )
  with check (
    exists (
      select 1 from public.Profile p
      join public.Recruiter r on r."profileId" = p.id
      where p.email = coalesce(
        (select auth.jwt() ->> 'email'),
        (select u.email from auth.users u where u.id = auth.uid())
      )
      and r.id = Recruiter.id
    )
    or public.app_role() = 'admin'
  );

create policy job_public_read on public.Job for select using ("active" = true or public.app_role() in ('recruiter','admin'));
create policy job_recruiter_write on public.Job
  for all
  using (public.app_role() in ('recruiter','admin'))
  with check (public.app_role() in ('recruiter','admin'));

create policy shortlist_owner on public.Shortlist
  for all
  using (
    exists (
      select 1 from public.Profile p
      join public.Recruiter r on r."profileId" = p.id
      where p.email = coalesce(
        (select auth.jwt() ->> 'email'),
        (select u.email from auth.users u where u.id = auth.uid())
      )
      and r.id = Shortlist."recruiterId"
    )
    or public.app_role() = 'admin'
  )
  with check (
    exists (
      select 1 from public.Profile p
      join public.Recruiter r on r."profileId" = p.id
      where p.email = coalesce(
        (select auth.jwt() ->> 'email'),
        (select u.email from auth.users u where u.id = auth.uid())
      )
      and r.id = Shortlist."recruiterId"
    )
    or public.app_role() = 'admin'
  );

-- ----------------------------------------------------------------------------
-- 7. Sensitive/aggregated data: NO anon/authenticated access at all.
--    Placement (salary), FollowUp (wage progression), CompanyReview,
--    Provider, Course, AuditLog — handled exclusively by the API.
--    No policy = default deny. Nothing to add here.
-- ----------------------------------------------------------------------------

-- ----------------------------------------------------------------------------
-- 8. Verification: list any table still writable by anon (should be ZERO rows)
-- ----------------------------------------------------------------------------
select c.relname as table_name
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'r'
  and exists (
    select 1 from pg_policy pol where pol.polrelid = c.oid
    and pol.polroles @> array[0::oid]  -- anon role
    and pol.polcmd in ('A','W','D')    -- insert/update/delete
  );
