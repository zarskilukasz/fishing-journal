-- Migration: Make lure_id and groundbait_id optional in catches table
-- This allows catches to be recorded without specifying lure or groundbait

-- 1. Make columns nullable
alter table public.catches
  alter column lure_id drop not null,
  alter column groundbait_id drop not null,
  alter column lure_name_snapshot drop not null,
  alter column groundbait_name_snapshot drop not null;

-- 2. Update trigger to handle nullable lure_id and groundbait_id
create or replace function public.fill_snapshots_for_catches()
returns trigger
language plpgsql
as $$
declare
  v_lure_name text;
  v_groundbait_name text;
begin
  -- Handle lure snapshot (only if lure_id is provided)
  if new.lure_id is not null then
    select name into v_lure_name
    from public.lures
    where id = new.lure_id;

    if v_lure_name is null then
      raise exception 'lure not found for snapshot: %', new.lure_id;
    end if;

    new.lure_name_snapshot = v_lure_name;
  else
    new.lure_name_snapshot = null;
  end if;

  -- Handle groundbait snapshot (only if groundbait_id is provided)
  if new.groundbait_id is not null then
    select name into v_groundbait_name
    from public.groundbaits
    where id = new.groundbait_id;

    if v_groundbait_name is null then
      raise exception 'groundbait not found for snapshot: %', new.groundbait_id;
    end if;

    new.groundbait_name_snapshot = v_groundbait_name;
  else
    new.groundbait_name_snapshot = null;
  end if;

  return new;
end;
$$;

-- 3. Update validate_catch_equipment trigger to handle nullable values
create or replace function public.validate_catch_equipment()
returns trigger
language plpgsql
as $$
declare
  v_trip_user_id uuid;
  v_lure_user_id uuid;
  v_groundbait_user_id uuid;
  v_lure_deleted_at timestamptz;
  v_groundbait_deleted_at timestamptz;
begin
  -- Get trip owner
  select user_id into v_trip_user_id
  from public.trips
  where id = new.trip_id;

  if v_trip_user_id is null then
    raise exception 'trip does not exist: %', new.trip_id;
  end if;

  -- Validate lure (only if provided)
  if new.lure_id is not null then
    select user_id, deleted_at into v_lure_user_id, v_lure_deleted_at
    from public.lures
    where id = new.lure_id;

    if v_lure_user_id is null then
      raise exception 'lure does not exist: %', new.lure_id;
    end if;

    if v_lure_user_id <> v_trip_user_id then
      raise exception 'equipment_owner_mismatch: lure belongs to different user';
    end if;

    -- Only validate soft-delete for new catches or when lure is changed
    if tg_op = 'INSERT' or (tg_op = 'UPDATE' and old.lure_id is distinct from new.lure_id) then
      if v_lure_deleted_at is not null then
        raise exception 'equipment_soft_deleted: lure has been deleted';
      end if;
    end if;
  end if;

  -- Validate groundbait (only if provided)
  if new.groundbait_id is not null then
    select user_id, deleted_at into v_groundbait_user_id, v_groundbait_deleted_at
    from public.groundbaits
    where id = new.groundbait_id;

    if v_groundbait_user_id is null then
      raise exception 'groundbait does not exist: %', new.groundbait_id;
    end if;

    if v_groundbait_user_id <> v_trip_user_id then
      raise exception 'equipment_owner_mismatch: groundbait belongs to different user';
    end if;

    -- Only validate soft-delete for new catches or when groundbait is changed
    if tg_op = 'INSERT' or (tg_op = 'UPDATE' and old.groundbait_id is distinct from new.groundbait_id) then
      if v_groundbait_deleted_at is not null then
        raise exception 'equipment_soft_deleted: groundbait has been deleted';
      end if;
    end if;
  end if;

  return new;
end;
$$;

comment on column public.catches.lure_id is 'Optional reference to the lure used for this catch';
comment on column public.catches.groundbait_id is 'Optional reference to the groundbait used for this catch';

