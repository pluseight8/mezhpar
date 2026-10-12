-- Mezhpar shared-backend schema. Apply only in a Supabase project hosted in a
-- location approved for the data being processed. The public preview does not
-- connect to this schema.

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

create table public.universities (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  city text not null,
  created_at timestamptz not null default now(),
  unique (name, city)
);

create table public.faculties (
  id uuid primary key default gen_random_uuid(),
  university_id uuid not null references public.universities(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  unique (university_id, name)
);

create table public.study_groups (
  id uuid primary key default gen_random_uuid(),
  faculty_id uuid not null references public.faculties(id) on delete restrict,
  name text not null,
  academic_year smallint,
  timezone text not null default 'Europe/Moscow',
  created_at timestamptz not null default now(),
  unique (faculty_id, name)
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 40),
  handle text not null check (handle ~ '^[a-z0-9_]{3,24}$'),
  bio text not null default '' check (char_length(bio) <= 240),
  interests text[] not null default '{}',
  avatar_path text,
  discoverable boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index profiles_handle_lower_unique on public.profiles (lower(handle));

create table public.platform_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.group_members (
  group_id uuid not null references public.study_groups(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'student' check (role in ('student', 'moderator', 'group_admin')),
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);
create index group_members_user_idx on public.group_members (user_id, group_id);

create table public.group_invites (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.study_groups(id) on delete cascade,
  code_hash text not null unique,
  created_by uuid not null references public.profiles(id) on delete restrict,
  expires_at timestamptz,
  max_uses integer check (max_uses is null or max_uses > 0),
  uses integer not null default 0 check (uses >= 0),
  created_at timestamptz not null default now()
);

create table public.schedule_lessons (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.study_groups(id) on delete cascade,
  weekday smallint not null check (weekday between 1 and 6),
  pair_number smallint check (pair_number is null or pair_number > 0),
  starts_at time not null,
  ends_at time not null check (ends_at > starts_at),
  subject text not null check (char_length(subject) between 1 and 120),
  teacher_name text not null default '',
  room text not null default '',
  lesson_type text not null check (lesson_type in ('lecture', 'practice', 'seminar', 'lab', 'exam', 'other')),
  week_parity text not null default 'all' check (week_parity in ('all', 'odd', 'even')),
  is_cancelled boolean not null default false,
  note text not null default '' check (char_length(note) <= 500),
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now(),
  unique (id, group_id)
);
create index schedule_lessons_group_weekday_idx on public.schedule_lessons (group_id, weekday, starts_at);

create table public.schedule_change_log (
  id bigint generated always as identity primary key,
  group_id uuid not null references public.study_groups(id) on delete cascade,
  lesson_id uuid,
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null check (action in ('insert', 'update', 'delete')),
  before_data jsonb,
  after_data jsonb,
  changed_at timestamptz not null default now()
);
create index schedule_change_group_idx on public.schedule_change_log (group_id, changed_at desc);

create table public.assignments (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.study_groups(id) on delete cascade,
  lesson_id uuid,
  subject text not null check (char_length(subject) between 1 and 120),
  title text not null check (char_length(title) between 1 and 240),
  details text not null default '' check (char_length(details) <= 3000),
  kind text not null default 'homework' check (kind in ('homework', 'reading', 'preparation', 'other')),
  due_at timestamptz,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint assignments_lesson_group_fk foreign key (lesson_id, group_id)
    references public.schedule_lessons(id, group_id) on delete set null (lesson_id)
);
create index assignments_group_due_idx on public.assignments (group_id, due_at);

create table public.assignment_progress (
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  is_done boolean not null default false,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (assignment_id, user_id)
);

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.study_groups(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete restrict,
  body text not null check (char_length(body) between 1 and 5000),
  topic text not null default 'discussion' check (topic in ('discussion', 'announcement', 'study', 'materials', 'poll')),
  is_pinned boolean not null default false,
  edited_at timestamptz,
  created_at timestamptz not null default now(),
  unique (id, group_id)
);
create index posts_group_created_idx on public.posts (group_id, created_at desc);

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.study_groups(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete restrict,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now(),
  constraint comments_post_group_fk foreign key (post_id, group_id) references public.posts(id, group_id) on delete cascade
);
create index comments_post_created_idx on public.comments (post_id, created_at);

create table public.post_reactions (
  post_id uuid not null references public.posts(id) on delete cascade,
  group_id uuid not null references public.study_groups(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  reaction text not null default 'like' check (reaction in ('like', 'celebrate', 'support')),
  created_at timestamptz not null default now(),
  primary key (post_id, user_id),
  constraint reactions_post_group_fk foreign key (post_id, group_id) references public.posts(id, group_id) on delete cascade
);

create table public.materials (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.study_groups(id) on delete cascade,
  subject text not null check (char_length(subject) between 1 and 120),
  title text not null check (char_length(title) between 1 and 240),
  description text not null default '' check (char_length(description) <= 1000),
  storage_path text,
  external_url text,
  uploaded_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  check (storage_path is not null or external_url is not null),
  check (storage_path is null or split_part(storage_path, '/', 1) = group_id::text),
  check (external_url is null or external_url ~ '^https?://')
);
create index materials_group_subject_idx on public.materials (group_id, subject, created_at desc);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.study_groups(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete restrict,
  title text not null check (char_length(title) between 1 and 140),
  details text not null default '' check (char_length(details) <= 1000),
  starts_at timestamptz not null,
  place text not null default '' check (char_length(place) <= 240),
  created_at timestamptz not null default now()
);
create index events_group_starts_idx on public.events (group_id, starts_at);

create table public.event_attendees (
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (event_id, user_id)
);

create table public.moderation_reports (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.study_groups(id) on delete cascade,
  reporter_id uuid not null references public.profiles(id) on delete restrict,
  target_type text not null check (target_type in ('post', 'comment', 'profile', 'material', 'event')),
  target_id uuid not null,
  reason text not null check (char_length(reason) between 3 and 500),
  status text not null default 'open' check (status in ('open', 'reviewing', 'resolved', 'dismissed')),
  reviewed_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);
create index reports_group_status_idx on public.moderation_reports (group_id, status, created_at desc);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  group_id uuid references public.study_groups(id) on delete cascade,
  kind text not null check (kind in ('schedule_change', 'assignment', 'deadline', 'reply', 'mention', 'announcement', 'event')),
  title text not null check (char_length(title) between 1 and 160),
  body text not null default '' check (char_length(body) <= 500),
  target_path text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_created_idx on public.notifications (user_id, created_at desc);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_touch_updated_at before update on public.profiles
for each row execute function public.touch_updated_at();
create trigger assignments_touch_updated_at before update on public.assignments
for each row execute function public.touch_updated_at();

create or replace function public.create_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  display_name_value text;
  handle_value text;
begin
  display_name_value := coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''), 'Студент');
  handle_value := 's_' || left(replace(new.id::text, '-', ''), 18);
  insert into public.profiles (id, display_name, handle)
  values (new.id, left(display_name_value, 40), handle_value);
  return new;
end;
$$;

create trigger auth_user_profile_created after insert on auth.users
for each row execute function public.create_profile_for_new_user();

create or replace function public.is_group_member(target_group uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.group_members gm
    where gm.group_id = target_group and gm.user_id = auth.uid()
  );
$$;

create or replace function public.is_group_admin(target_group uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.platform_admins pa where pa.user_id = auth.uid())
    or exists (
      select 1 from public.group_members gm
      where gm.group_id = target_group and gm.user_id = auth.uid()
        and gm.role in ('group_admin', 'moderator')
    );
$$;

create or replace function public.can_view_profile(target_user uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select target_user = auth.uid() or exists (
    select 1
    from public.group_members mine
    join public.group_members theirs on theirs.group_id = mine.group_id
    where mine.user_id = auth.uid() and theirs.user_id = target_user
  );
$$;

create or replace function public.join_group_by_code(invite_code text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  invite_row public.group_invites%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;
  if invite_code is null or length(trim(invite_code)) < 8 or length(trim(invite_code)) > 80 then
    raise exception 'Invalid invitation code';
  end if;

  select * into invite_row
  from public.group_invites gi
  where gi.code_hash = encode(extensions.digest(upper(trim(invite_code)), 'sha256'), 'hex')
  for update;

  if not found or (invite_row.expires_at is not null and invite_row.expires_at <= now())
    or (invite_row.max_uses is not null and invite_row.uses >= invite_row.max_uses) then
    raise exception 'Invitation is invalid or expired';
  end if;

  insert into public.group_members (group_id, user_id, role)
  values (invite_row.group_id, auth.uid(), 'student')
  on conflict (group_id, user_id) do nothing;

  update public.group_invites set uses = uses + 1 where id = invite_row.id;
  return invite_row.group_id;
end;
$$;

create or replace function public.audit_schedule_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.schedule_change_log (group_id, lesson_id, actor_id, action, after_data)
    values (new.group_id, new.id, auth.uid(), 'insert', to_jsonb(new));
    return new;
  elsif tg_op = 'UPDATE' then
    insert into public.schedule_change_log (group_id, lesson_id, actor_id, action, before_data, after_data)
    values (new.group_id, new.id, auth.uid(), 'update', to_jsonb(old), to_jsonb(new));
    return new;
  else
    insert into public.schedule_change_log (group_id, lesson_id, actor_id, action, before_data)
    values (old.group_id, old.id, auth.uid(), 'delete', to_jsonb(old));
    return old;
  end if;
end;
$$;

create trigger schedule_lessons_audit after insert or update or delete on public.schedule_lessons
for each row execute function public.audit_schedule_change();

create or replace function public.create_invite_code(
  target_group uuid,
  invite_code text,
  valid_until timestamptz default null,
  use_limit integer default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_invite uuid;
begin
  if not public.is_group_admin(target_group) then
    raise exception 'Group administrator role required';
  end if;
  if invite_code is null or length(trim(invite_code)) < 8 or length(trim(invite_code)) > 80 then
    raise exception 'Invitation code must have 8 to 80 characters';
  end if;
  if use_limit is not null and use_limit < 1 then
    raise exception 'Use limit must be positive';
  end if;
  insert into public.group_invites (group_id, code_hash, created_by, expires_at, max_uses)
  values (
    target_group,
    encode(extensions.digest(upper(trim(invite_code)), 'sha256'), 'hex'),
    auth.uid(), valid_until, use_limit
  ) returning id into new_invite;
  return new_invite;
end;
$$;

create or replace function public.set_post_pinned(target_post uuid, should_pin boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_group uuid;
begin
  select p.group_id into target_group from public.posts p where p.id = target_post;
  if target_group is null or not public.is_group_admin(target_group) then
    raise exception 'Group moderator role required';
  end if;
  update public.posts set is_pinned = should_pin where id = target_post;
end;
$$;

alter table public.universities enable row level security;
alter table public.faculties enable row level security;
alter table public.study_groups enable row level security;
alter table public.profiles enable row level security;
alter table public.platform_admins enable row level security;
alter table public.group_members enable row level security;
alter table public.group_invites enable row level security;
alter table public.schedule_lessons enable row level security;
alter table public.schedule_change_log enable row level security;
alter table public.assignments enable row level security;
alter table public.assignment_progress enable row level security;
alter table public.posts enable row level security;
alter table public.comments enable row level security;
alter table public.post_reactions enable row level security;
alter table public.materials enable row level security;
alter table public.events enable row level security;
alter table public.event_attendees enable row level security;
alter table public.moderation_reports enable row level security;
alter table public.notifications enable row level security;

create policy "authenticated users can read universities" on public.universities
for select to authenticated using (true);
create policy "authenticated users can read faculties" on public.faculties
for select to authenticated using (true);
create policy "members can read their groups" on public.study_groups
for select to authenticated using (public.is_group_member(id));

create policy "users can read profiles in shared groups" on public.profiles
for select to authenticated using (public.can_view_profile(id));
create policy "users can update their profile" on public.profiles
for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy "members can view group membership" on public.group_members
for select to authenticated using (public.is_group_member(group_id));
create policy "group admins can add students" on public.group_members
for insert to authenticated with check (public.is_group_admin(group_id) and role = 'student');
create policy "group admins can update members" on public.group_members
for update to authenticated using (public.is_group_admin(group_id)) with check (public.is_group_admin(group_id));
create policy "group admins can remove members" on public.group_members
for delete to authenticated using (public.is_group_admin(group_id));

create policy "group admins can read invite metadata" on public.group_invites
for select to authenticated using (public.is_group_admin(group_id));
create policy "group admins can revoke invites" on public.group_invites
for delete to authenticated using (public.is_group_admin(group_id));

create policy "members can read schedule" on public.schedule_lessons
for select to authenticated using (public.is_group_member(group_id));
create policy "group admins can add lessons" on public.schedule_lessons
for insert to authenticated with check (public.is_group_admin(group_id) and updated_by = auth.uid());
create policy "group admins can update lessons" on public.schedule_lessons
for update to authenticated using (public.is_group_admin(group_id)) with check (public.is_group_admin(group_id) and updated_by = auth.uid());
create policy "group admins can delete lessons" on public.schedule_lessons
for delete to authenticated using (public.is_group_admin(group_id));
create policy "members can read schedule history" on public.schedule_change_log
for select to authenticated using (public.is_group_member(group_id));

create policy "members can read assignments" on public.assignments
for select to authenticated using (public.is_group_member(group_id));
create policy "group admins can create assignments" on public.assignments
for insert to authenticated with check (public.is_group_admin(group_id) and created_by = auth.uid());
create policy "group admins can update assignments" on public.assignments
for update to authenticated using (public.is_group_admin(group_id)) with check (public.is_group_admin(group_id));
create policy "group admins can delete assignments" on public.assignments
for delete to authenticated using (public.is_group_admin(group_id));

create policy "members can read their own assignment progress" on public.assignment_progress
for select to authenticated using (
  user_id = auth.uid() and exists (
    select 1 from public.assignments a where a.id = assignment_id and public.is_group_member(a.group_id)
  )
);
create policy "users can create their own assignment progress" on public.assignment_progress
for insert to authenticated with check (
  user_id = auth.uid() and exists (
    select 1 from public.assignments a where a.id = assignment_id and public.is_group_member(a.group_id)
  )
);
create policy "users can update their own assignment progress" on public.assignment_progress
for update to authenticated using (user_id = auth.uid()) with check (
  user_id = auth.uid() and exists (
    select 1 from public.assignments a where a.id = assignment_id and public.is_group_member(a.group_id)
  )
);
create policy "users can remove their own assignment progress" on public.assignment_progress
for delete to authenticated using (user_id = auth.uid());

create policy "members can read group posts" on public.posts
for select to authenticated using (public.is_group_member(group_id));
create policy "members can create posts as themselves" on public.posts
for insert to authenticated with check (public.is_group_member(group_id) and author_id = auth.uid() and is_pinned = false);
create policy "authors can edit own posts; admins can moderate" on public.posts
for update to authenticated using (author_id = auth.uid() or public.is_group_admin(group_id))
with check (public.is_group_member(group_id) and (author_id = auth.uid() or public.is_group_admin(group_id)));
create policy "authors or admins can delete posts" on public.posts
for delete to authenticated using (author_id = auth.uid() or public.is_group_admin(group_id));

create policy "members can read group comments" on public.comments
for select to authenticated using (public.is_group_member(group_id));
create policy "members can write own comments" on public.comments
for insert to authenticated with check (public.is_group_member(group_id) and author_id = auth.uid());
create policy "authors can edit own comments" on public.comments
for update to authenticated using (author_id = auth.uid() or public.is_group_admin(group_id))
with check (public.is_group_member(group_id) and (author_id = auth.uid() or public.is_group_admin(group_id)));
create policy "authors or admins can delete comments" on public.comments
for delete to authenticated using (author_id = auth.uid() or public.is_group_admin(group_id));

create policy "members can read reactions" on public.post_reactions
for select to authenticated using (public.is_group_member(group_id));
create policy "members can react as themselves" on public.post_reactions
for insert to authenticated with check (public.is_group_member(group_id) and user_id = auth.uid());
create policy "users can remove their own reactions" on public.post_reactions
for delete to authenticated using (user_id = auth.uid());

create policy "members can read materials" on public.materials
for select to authenticated using (public.is_group_member(group_id));
create policy "members can add materials" on public.materials
for insert to authenticated with check (public.is_group_member(group_id) and uploaded_by = auth.uid());
create policy "owners or admins can update materials" on public.materials
for update to authenticated using (uploaded_by = auth.uid() or public.is_group_admin(group_id))
with check (public.is_group_member(group_id) and (uploaded_by = auth.uid() or public.is_group_admin(group_id)));
create policy "owners or admins can delete materials" on public.materials
for delete to authenticated using (uploaded_by = auth.uid() or public.is_group_admin(group_id));

create policy "members can read events" on public.events
for select to authenticated using (public.is_group_member(group_id));
create policy "members can create events" on public.events
for insert to authenticated with check (public.is_group_member(group_id) and created_by = auth.uid());
create policy "authors or admins can update events" on public.events
for update to authenticated using (created_by = auth.uid() or public.is_group_admin(group_id))
with check (public.is_group_member(group_id) and (created_by = auth.uid() or public.is_group_admin(group_id)));
create policy "authors or admins can delete events" on public.events
for delete to authenticated using (created_by = auth.uid() or public.is_group_admin(group_id));

create policy "members can read event attendance" on public.event_attendees
for select to authenticated using (exists (select 1 from public.events e where e.id = event_id and public.is_group_member(e.group_id)));
create policy "users can manage their own event attendance" on public.event_attendees
for insert to authenticated with check (user_id = auth.uid() and exists (select 1 from public.events e where e.id = event_id and public.is_group_member(e.group_id)));
create policy "users can cancel their own attendance" on public.event_attendees
for delete to authenticated using (user_id = auth.uid());

create policy "users can submit reports for groups they belong to" on public.moderation_reports
for insert to authenticated with check (public.is_group_member(group_id) and reporter_id = auth.uid());
create policy "reporters can view their report and moderators can review" on public.moderation_reports
for select to authenticated using (reporter_id = auth.uid() or public.is_group_admin(group_id));
create policy "moderators can update reports" on public.moderation_reports
for update to authenticated using (public.is_group_admin(group_id)) with check (public.is_group_admin(group_id));

create policy "users can read their notifications" on public.notifications
for select to authenticated using (user_id = auth.uid());
create policy "users can mark their notifications read" on public.notifications
for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

revoke all on public.platform_admins from anon, authenticated;
revoke insert, update on public.profiles from anon, authenticated;
grant update (display_name, handle, bio, interests, avatar_path, discoverable, updated_at) on public.profiles to authenticated;
revoke update (is_pinned) on public.posts from authenticated;
grant execute on function public.is_group_member(uuid) to authenticated;
grant execute on function public.is_group_admin(uuid) to authenticated;
grant execute on function public.can_view_profile(uuid) to authenticated;
grant execute on function public.join_group_by_code(text) to authenticated;
grant execute on function public.create_invite_code(uuid, text, timestamptz, integer) to authenticated;
grant execute on function public.set_post_pinned(uuid, boolean) to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('group-materials', 'group-materials', false, 20971520, array['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'text/plain', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy "group members can read private materials" on storage.objects
for select to authenticated using (
  bucket_id = 'group-materials'
  and public.is_group_member((storage.foldername(name))[1]::uuid)
);
create policy "group members can upload private materials" on storage.objects
for insert to authenticated with check (
  bucket_id = 'group-materials'
  and public.is_group_member((storage.foldername(name))[1]::uuid)
  and owner_id = auth.uid()::text
);
create policy "owners or group admins can update private materials" on storage.objects
for update to authenticated using (
  bucket_id = 'group-materials'
  and (owner_id = auth.uid()::text or public.is_group_admin((storage.foldername(name))[1]::uuid))
) with check (
  bucket_id = 'group-materials'
  and public.is_group_member((storage.foldername(name))[1]::uuid)
);
create policy "owners or group admins can delete private materials" on storage.objects
for delete to authenticated using (
  bucket_id = 'group-materials'
  and (owner_id = auth.uid()::text or public.is_group_admin((storage.foldername(name))[1]::uuid))
);
