-- Generic conversation-based messaging.
--
-- One messaging capability serves every context. A conversation is 'direct',
-- 'team', or (later) 'group'. The context decides who may join and how the
-- conversation is named; everything after that -- participants, messages,
-- ordering, realtime -- is identical for all contexts.
--
-- Other domains stay the source of truth for their own rules:
--   matching     -> whether two users may direct message at all
--   team_members -> who belongs to a team conversation
-- Chat never re-implements those rules; it reads them through the two helper
-- functions and the membership sync trigger below.

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('direct', 'team', 'group')),
  context_id uuid,
  title text,
  direct_user_1_id uuid references public.profiles (id) on delete cascade,
  direct_user_2_id uuid references public.profiles (id) on delete cascade,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_message_at timestamptz,
  last_message_preview text,
  last_message_sender_id uuid references public.profiles (id) on delete set null,
  constraint conversations_direct_pair_check check (
    (
      type = 'direct'
      and direct_user_1_id is not null
      and direct_user_2_id is not null
      and direct_user_1_id < direct_user_2_id
    )
    or (
      type <> 'direct'
      and direct_user_1_id is null
      and direct_user_2_id is null
    )
  ),
  constraint conversations_context_check check (
    (type = 'team' and context_id is not null)
    or (type <> 'team' and context_id is null)
  )
);

comment on table public.conversations is
  'One conversation per context. Direct conversations store the canonical user pair (lower UUID first); team conversations point at teams.id through context_id.';
comment on column public.conversations.context_id is
  'Polymorphic reference to the external entity that owns the conversation, interpreted from type and validated by the trusted functions in this migration.';
comment on column public.conversations.last_message_preview is
  'Denormalized latest-activity summary so the conversation list is one query instead of one query per conversation.';

-- Database-level guarantee that two people can only ever have one direct
-- conversation, however many clients race to create it.
create unique index conversations_direct_pair_idx
  on public.conversations (direct_user_1_id, direct_user_2_id)
  where type = 'direct';

create unique index conversations_team_context_idx
  on public.conversations (context_id)
  where type = 'team';

create index conversations_recent_activity_idx
  on public.conversations (last_message_at desc nulls last);

create table public.conversation_participants (
  conversation_id uuid not null
    references public.conversations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text,
  joined_at timestamptz not null default now(),
  last_read_at timestamptz,
  primary key (conversation_id, user_id)
);

comment on table public.conversation_participants is
  'Membership for every conversation type. Team rows are derived from team_members by sync_team_conversation_membership so the team domain stays authoritative.';

create index conversation_participants_user_idx
  on public.conversation_participants (user_id);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null
    references public.conversations (id) on delete cascade,
  sender_id uuid references public.profiles (id) on delete set null,
  sender_display_name text not null,
  content text not null check (
    length(btrim(content)) > 0 and length(content) <= 4000
  ),
  client_message_id uuid,
  created_at timestamptz not null default now()
);

comment on column public.messages.sender_display_name is
  'Sender name snapshot. History stays readable after a profile is renamed or deleted.';
comment on column public.messages.client_message_id is
  'Client-generated idempotency key. A retried send resolves to the same row instead of a duplicate message.';

create unique index messages_client_message_idx
  on public.messages (conversation_id, client_message_id)
  where client_message_id is not null;

-- Ordering and pagination both read newest-first within a conversation; id
-- breaks ties when two messages share a timestamp.
create index messages_conversation_created_idx
  on public.messages (conversation_id, created_at desc, id desc);

create index messages_sender_idx
  on public.messages (sender_id);

-- Membership check used by every chat policy. It is security definer so the
-- policies on conversations and conversation_participants never recurse into
-- each other, and it only ever answers for the calling user.
create function public.is_conversation_member(p_conversation_id uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1
    from public.conversation_participants participant
    where participant.conversation_id = p_conversation_id
      and participant.user_id = auth.uid()
  );
$$;

-- The single place where the matching rule "can these two users talk" lives.
create function public.can_users_direct_message(p_user_a uuid, p_user_b uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select p_user_a is distinct from p_user_b
    and exists (
      select 1
      from public.matches
      where status = 'active'
        and user_1_id = least(p_user_a, p_user_b)
        and user_2_id = greatest(p_user_a, p_user_b)
    );
$$;

-- Senders, names, timestamps, and whitespace are decided by the database, not
-- by the client payload.
create function public.prepare_message()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  sender_name text;
begin
  if caller_id is not null then
    new.sender_id := caller_id;
  elsif new.sender_id is null then
    raise exception 'A message requires a sender';
  end if;

  select display_name
    into sender_name
    from public.profiles
    where id = new.sender_id;

  new.sender_display_name := coalesce(sender_name, 'PairUp member');
  new.content := btrim(new.content);
  new.created_at := now();
  return new;
end;
$$;

create trigger messages_prepare
before insert on public.messages
for each row execute function public.prepare_message();

create function public.touch_conversation_on_message()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- The guard keeps a late-arriving older message from rewinding the preview.
  update public.conversations
    set last_message_at = new.created_at,
      last_message_preview = left(new.content, 140),
      last_message_sender_id = new.sender_id,
      updated_at = now()
    where id = new.conversation_id
      and (last_message_at is null or last_message_at <= new.created_at);

  return null;
end;
$$;

create trigger messages_touch_conversation
after insert on public.messages
for each row execute function public.touch_conversation_on_message();

-- Team membership is owned by the team domain. Chat mirrors it so that losing
-- a team seat immediately removes read access and realtime delivery.
create function public.sync_team_conversation_membership()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.conversation_participants (conversation_id, user_id)
    select conversation.id, new.user_id
    from public.conversations conversation
    where conversation.type = 'team'
      and conversation.context_id = new.team_id
    on conflict (conversation_id, user_id) do nothing;

    return new;
  end if;

  delete from public.conversation_participants participant
  using public.conversations conversation
  where participant.conversation_id = conversation.id
    and conversation.type = 'team'
    and conversation.context_id = old.team_id
    and participant.user_id = old.user_id;

  return old;
end;
$$;

create trigger team_members_sync_conversation
after insert or delete on public.team_members
for each row execute function public.sync_team_conversation_membership();

create function public.delete_team_conversations()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.conversations
  where type = 'team' and context_id = old.id;

  return old;
end;
$$;

create trigger teams_delete_conversations
after delete on public.teams
for each row execute function public.delete_team_conversations();

-- Opening a direct conversation: matching decides permission, chat creates or
-- reuses the conversation.
create function public.start_direct_conversation(p_other_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  first_user_id uuid;
  second_user_id uuid;
  target_conversation_id uuid;
begin
  if caller_id is null then
    raise exception 'Authentication is required';
  end if;

  if p_other_user_id is null or p_other_user_id = caller_id then
    raise exception 'Choose someone else to start a conversation with';
  end if;

  if not exists (select 1 from public.profiles where id = p_other_user_id) then
    raise exception 'That person no longer has a PairUp profile';
  end if;

  if not public.can_users_direct_message(caller_id, p_other_user_id) then
    raise exception 'You can only message people you have matched with';
  end if;

  first_user_id := least(caller_id, p_other_user_id);
  second_user_id := greatest(caller_id, p_other_user_id);

  select id
    into target_conversation_id
    from public.conversations
    where type = 'direct'
      and direct_user_1_id = first_user_id
      and direct_user_2_id = second_user_id;

  if target_conversation_id is null then
    -- Concurrent creation resolves here: the loser of the race skips the
    -- insert and re-reads the row the winner committed.
    insert into public.conversations (
      type,
      direct_user_1_id,
      direct_user_2_id,
      created_by
    ) values (
      'direct',
      first_user_id,
      second_user_id,
      caller_id
    )
    on conflict (direct_user_1_id, direct_user_2_id) where type = 'direct'
    do nothing
    returning id into target_conversation_id;

    if target_conversation_id is null then
      select id
        into target_conversation_id
        from public.conversations
        where type = 'direct'
          and direct_user_1_id = first_user_id
          and direct_user_2_id = second_user_id;
    end if;
  end if;

  if target_conversation_id is null then
    raise exception 'Could not open that conversation. Please try again';
  end if;

  insert into public.conversation_participants (conversation_id, user_id)
  values (target_conversation_id, first_user_id), (target_conversation_id, second_user_id)
  on conflict (conversation_id, user_id) do nothing;

  return target_conversation_id;
end;
$$;

-- Opening a team conversation: the team domain decides membership, chat
-- creates the conversation on first use and backfills the roster.
create function public.ensure_team_conversation(p_team_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  target_conversation_id uuid;
begin
  if caller_id is null then
    raise exception 'Authentication is required';
  end if;

  if not exists (select 1 from public.teams where id = p_team_id) then
    raise exception 'That team no longer exists';
  end if;

  if not exists (
    select 1
    from public.team_members
    where team_id = p_team_id and user_id = caller_id
  ) then
    raise exception 'Only members of this team can open its conversation';
  end if;

  select id
    into target_conversation_id
    from public.conversations
    where type = 'team' and context_id = p_team_id;

  if target_conversation_id is null then
    insert into public.conversations (type, context_id, created_by)
    values ('team', p_team_id, caller_id)
    on conflict (context_id) where type = 'team'
    do nothing
    returning id into target_conversation_id;

    if target_conversation_id is null then
      select id
        into target_conversation_id
        from public.conversations
        where type = 'team' and context_id = p_team_id;
    end if;
  end if;

  if target_conversation_id is null then
    raise exception 'Could not open that conversation. Please try again';
  end if;

  insert into public.conversation_participants (conversation_id, user_id)
  select target_conversation_id, member.user_id
  from public.team_members member
  where member.team_id = p_team_id
  on conflict (conversation_id, user_id) do nothing;

  return target_conversation_id;
end;
$$;

-- Sending is idempotent: the same client_message_id always resolves to the
-- same row, so a retry after a dropped response cannot duplicate a message.
create function public.send_message(
  p_conversation_id uuid,
  p_content text,
  p_client_message_id uuid default null
)
returns public.messages
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  trimmed_content text := btrim(coalesce(p_content, ''));
  sent_message public.messages%rowtype;
begin
  if caller_id is null then
    raise exception 'Authentication is required';
  end if;

  if not public.is_conversation_member(p_conversation_id) then
    raise exception 'This conversation is no longer available to you';
  end if;

  if trimmed_content = '' then
    raise exception 'Enter a message before sending';
  end if;

  if length(trimmed_content) > 4000 then
    raise exception 'Messages are limited to 4000 characters';
  end if;

  if p_client_message_id is not null then
    select *
      into sent_message
      from public.messages
      where conversation_id = p_conversation_id
        and client_message_id = p_client_message_id;

    if found then
      return sent_message;
    end if;
  end if;

  insert into public.messages (
    conversation_id,
    sender_id,
    content,
    client_message_id
  ) values (
    p_conversation_id,
    caller_id,
    trimmed_content,
    p_client_message_id
  )
  on conflict (conversation_id, client_message_id) do nothing
  returning * into sent_message;

  if sent_message.id is null and p_client_message_id is not null then
    select *
      into sent_message
      from public.messages
      where conversation_id = p_conversation_id
        and client_message_id = p_client_message_id;
  end if;

  if sent_message.id is null then
    raise exception 'Could not send that message. Please try again';
  end if;

  return sent_message;
end;
$$;

-- One query for the whole conversation list, including the context-specific
-- display metadata. Pass p_conversation_id to read a single conversation
-- header with the same shape.
create function public.list_my_conversations(p_conversation_id uuid default null)
returns table (
  conversation_id uuid,
  conversation_type text,
  context_id uuid,
  title text,
  avatar_url text,
  counterpart_user_id uuid,
  last_message_at timestamptz,
  last_message_preview text,
  last_message_sender_id uuid,
  last_message_sender_name text,
  unread_count integer,
  created_at timestamptz
)
language sql
security definer
stable
set search_path = ''
as $$
  select
    conversation.id,
    conversation.type,
    conversation.context_id,
    case conversation.type
      when 'direct' then coalesce(counterpart.display_name, 'PairUp member')
      when 'team' then coalesce(team.name, 'Team conversation')
      else coalesce(conversation.title, 'Group conversation')
    end,
    case when conversation.type = 'direct' then counterpart.avatar_url end,
    counterpart.id,
    conversation.last_message_at,
    conversation.last_message_preview,
    conversation.last_message_sender_id,
    last_sender.display_name,
    (
      select count(*)::integer
      from public.messages message
      where message.conversation_id = conversation.id
        and message.sender_id is distinct from auth.uid()
        and message.created_at > coalesce(
          participant.last_read_at,
          '-infinity'::timestamptz
        )
    ),
    conversation.created_at
  from public.conversation_participants participant
  join public.conversations conversation
    on conversation.id = participant.conversation_id
  left join public.teams team
    on conversation.type = 'team' and team.id = conversation.context_id
  left join public.profiles counterpart
    on conversation.type = 'direct'
    and counterpart.id = case
      when conversation.direct_user_1_id = participant.user_id
        then conversation.direct_user_2_id
      else conversation.direct_user_1_id
    end
  left join public.profiles last_sender
    on last_sender.id = conversation.last_message_sender_id
  where participant.user_id = auth.uid()
    and (p_conversation_id is null or conversation.id = p_conversation_id)
  order by coalesce(conversation.last_message_at, conversation.created_at) desc;
$$;

-- Everyone the caller is currently allowed to start a conversation with, plus
-- the conversation that already exists for each of them. The matching and team
-- rules stay on the backend; the picker screen only renders the answer.
create function public.list_messageable_targets()
returns table (
  target_type text,
  target_id uuid,
  title text,
  subtitle text,
  avatar_url text,
  conversation_id uuid
)
language sql
security definer
stable
set search_path = ''
as $$
  select
    'person'::text,
    partner.id,
    partner.display_name,
    nullif(btrim(coalesce(partner.skill_level, '')), ''),
    partner.avatar_url,
    conversation.id
  from public.matches match
  join public.profiles partner
    on partner.id = case
      when match.user_1_id = auth.uid() then match.user_2_id
      else match.user_1_id
    end
  left join public.conversations conversation
    on conversation.type = 'direct'
    and conversation.direct_user_1_id = least(auth.uid(), partner.id)
    and conversation.direct_user_2_id = greatest(auth.uid(), partner.id)
  where match.status = 'active'
    and (match.user_1_id = auth.uid() or match.user_2_id = auth.uid())

  union all

  select
    'team'::text,
    team.id,
    team.name,
    nullif(btrim(coalesce(team.project_idea, team.description, '')), ''),
    null,
    conversation.id
  from public.team_members membership
  join public.teams team on team.id = membership.team_id
  left join public.conversations conversation
    on conversation.type = 'team' and conversation.context_id = team.id
  where membership.user_id = auth.uid()

  order by 1, 3;
$$;

revoke execute on function public.is_conversation_member(uuid)
  from public, anon;
revoke execute on function public.can_users_direct_message(uuid, uuid)
  from public, anon, authenticated;
revoke execute on function public.prepare_message()
  from public, anon, authenticated;
revoke execute on function public.touch_conversation_on_message()
  from public, anon, authenticated;
revoke execute on function public.sync_team_conversation_membership()
  from public, anon, authenticated;
revoke execute on function public.delete_team_conversations()
  from public, anon, authenticated;
revoke execute on function public.start_direct_conversation(uuid)
  from public, anon;
revoke execute on function public.ensure_team_conversation(uuid)
  from public, anon;
revoke execute on function public.send_message(uuid, text, uuid)
  from public, anon;
revoke execute on function public.list_my_conversations(uuid)
  from public, anon;
revoke execute on function public.list_messageable_targets()
  from public, anon;

grant execute on function public.is_conversation_member(uuid) to authenticated;
grant execute on function public.start_direct_conversation(uuid) to authenticated;
grant execute on function public.ensure_team_conversation(uuid) to authenticated;
grant execute on function public.send_message(uuid, text, uuid) to authenticated;
grant execute on function public.list_my_conversations(uuid) to authenticated;
grant execute on function public.list_messageable_targets() to authenticated;

alter table public.conversations enable row level security;
alter table public.conversation_participants enable row level security;
alter table public.messages enable row level security;

revoke all on table public.conversations from anon, authenticated;
revoke all on table public.conversation_participants from anon, authenticated;
revoke all on table public.messages from anon, authenticated;

-- Conversations and participants are only ever written by the trusted
-- functions above. Clients read them, and may only mark their own row read.
grant select on table public.conversations to authenticated;
grant select on table public.conversation_participants to authenticated;
grant update (last_read_at) on table public.conversation_participants to authenticated;
grant select on table public.messages to authenticated;

create policy conversations_read_participating
on public.conversations
for select
to authenticated
using (public.is_conversation_member(id));

create policy conversation_participants_read_participating
on public.conversation_participants
for select
to authenticated
using (public.is_conversation_member(conversation_id));

create policy conversation_participants_update_own_read_state
on public.conversation_participants
for update
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy messages_read_participating
on public.messages
for select
to authenticated
using (public.is_conversation_member(conversation_id));

-- Realtime evaluates these select policies per subscriber, so an unauthorized
-- client receives nothing even if it guesses a conversation id.
do $$
begin
  if exists (
    select 1 from pg_catalog.pg_publication where pubname = 'supabase_realtime'
  ) then
    if not exists (
      select 1
      from pg_catalog.pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'messages'
    ) then
      execute 'alter publication supabase_realtime add table public.messages';
    end if;

    if not exists (
      select 1
      from pg_catalog.pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'conversations'
    ) then
      execute 'alter publication supabase_realtime add table public.conversations';
    end if;
  end if;
end;
$$;
