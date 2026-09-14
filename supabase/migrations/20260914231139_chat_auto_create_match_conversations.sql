-- Every active match becomes a conversation immediately.
--
-- Matching stays the source of truth and owns its own workflow; chat only
-- reacts to the row it commits. Whatever creates the match -- a client insert,
-- an RPC, or an Edge Function -- the conversation follows, so the two domains
-- never have to know about each other. This mirrors how team conversations
-- derive their roster from team_members.

create function public.create_conversation_for_match()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_conversation_id uuid;
begin
  if new.status is distinct from 'active' then
    return null;
  end if;

  -- matches_canonical_user_order_check already guarantees user_1_id < user_2_id,
  -- which is the same canonical ordering conversations store.
  insert into public.conversations (type, direct_user_1_id, direct_user_2_id)
  values ('direct', new.user_1_id, new.user_2_id)
  on conflict (direct_user_1_id, direct_user_2_id) where type = 'direct'
  do nothing
  returning id into target_conversation_id;

  -- Already created, most likely by start_direct_conversation moments earlier.
  if target_conversation_id is null then
    select id
      into target_conversation_id
      from public.conversations
      where type = 'direct'
        and direct_user_1_id = new.user_1_id
        and direct_user_2_id = new.user_2_id;
  end if;

  if target_conversation_id is null then
    raise exception 'Could not create a conversation for match %', new.id;
  end if;

  insert into public.conversation_participants (conversation_id, user_id)
  values (target_conversation_id, new.user_1_id), (target_conversation_id, new.user_2_id)
  on conflict (conversation_id, user_id) do nothing;

  return null;
end;
$$;

-- `update of status` covers a matching implementation that stores a pending row
-- first and activates it later.
create trigger matches_create_conversation
after insert or update of status on public.matches
for each row execute function public.create_conversation_for_match();

revoke execute on function public.create_conversation_for_match()
from public, anon, authenticated;

-- Backfill matches that already existed before this trigger. Both statements are
-- idempotent, so re-running this migration cannot duplicate anything.
insert into public.conversations (type, direct_user_1_id, direct_user_2_id)
select 'direct', existing_match.user_1_id, existing_match.user_2_id
from public.matches existing_match
where existing_match.status = 'active'
on conflict (direct_user_1_id, direct_user_2_id) where type = 'direct'
do nothing;

insert into public.conversation_participants (conversation_id, user_id)
select conversation.id, participant.user_id
from public.conversations conversation
join public.matches existing_match
  on existing_match.status = 'active'
  and existing_match.user_1_id = conversation.direct_user_1_id
  and existing_match.user_2_id = conversation.direct_user_2_id
cross join lateral (
  values (conversation.direct_user_1_id), (conversation.direct_user_2_id)
) as participant (user_id)
where conversation.type = 'direct'
on conflict (conversation_id, user_id) do nothing;
