begin;

create table if not exists public.users (
  id uuid primary key,
  username text not null,
  normalized text not null unique,
  salt text not null,
  hash text not null,
  role text not null check (role in ('admin', 'user')),
  legacy_owner boolean not null default false,
  created bigint not null
);

-- The project library only needs metadata. Audio and notes stay in data until opened.
create or replace function public.lyes_project_metadata(project jsonb)
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select jsonb_build_object(
    'id', project->'id',
    'name', project->'name',
    'bpm', project->'bpm',
    'status', project->'status',
    'kind', project->'kind',
    'updated', project->'updated',
    'trackCount', jsonb_array_length(project->'tracks'),
    'durationSeconds', greatest(
      (project->>'bars')::double precision * 4,
      (select max((clip->>'start')::double precision + (clip->>'length')::double precision)
       from jsonb_array_elements(project->'tracks') as track
       cross join lateral jsonb_array_elements(track->'clips') as clip)
    ) * 60 / (project->>'bpm')::double precision
  );
$$;

create table if not exists public.projects (
  id text not null,
  user_id uuid not null references public.users(id) on delete cascade,
  data jsonb not null,
  updated bigint not null,
  metadata jsonb generated always as (public.lyes_project_metadata(data)) stored,
  primary key (user_id, id)
);

alter table public.users enable row level security;
alter table public.projects enable row level security;
revoke all on table public.users, public.projects from public, anon, authenticated;
grant select, insert on table public.users to service_role;
grant select, insert, update, delete on table public.projects to service_role;

-- Serialize signups across all server instances so only the first account is admin.
create or replace function public.lyes_register(candidate jsonb, account_limit integer)
returns setof public.users
language plpgsql
set search_path = ''
as $$
declare
  first_account boolean;
begin
  perform pg_catalog.pg_advisory_xact_lock(67768001323286201);
  if exists (select 1 from public.users where normalized = candidate->>'normalized') then
    raise unique_violation;
  end if;
  if (select count(*) from public.users) >= account_limit then
    raise sqlstate 'PT403' using message = 'LYES account limit reached';
  end if;
  first_account := not exists (select 1 from public.users);
  return query
    insert into public.users (id, username, normalized, salt, hash, role, legacy_owner, created)
    values ((candidate->>'id')::uuid, candidate->>'username', candidate->>'normalized',
            candidate->>'salt', candidate->>'hash',
            case when first_account then 'admin' else 'user' end,
            first_account, (candidate->>'created')::bigint)
    returning *;
end;
$$;

revoke execute on function public.lyes_register(jsonb, integer) from public, anon, authenticated;
revoke execute on function public.lyes_project_metadata(jsonb) from public, anon, authenticated;
grant execute on function public.lyes_register(jsonb, integer) to service_role;
grant execute on function public.lyes_project_metadata(jsonb) to service_role;

commit;
