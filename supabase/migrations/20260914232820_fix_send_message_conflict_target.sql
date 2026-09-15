-- Fix: sending a message raised 42P10 on every call.
--
-- messages_client_message_idx is a PARTIAL unique index:
--
--   create unique index messages_client_message_idx
--     on public.messages (conversation_id, client_message_id)
--     where client_message_id is not null;
--
-- Postgres only considers a partial index as an ON CONFLICT arbiter when the
-- index predicate is implied by the WHERE clause on the conflict target. The
-- previous definition named the columns but omitted the predicate, so no
-- arbiter matched and the insert raised
--   42P10: there is no unique or exclusion constraint matching the ON CONFLICT
--          specification
-- on the first send, not just on a retry.
--
-- Restating the predicate is the same thing the other conflict targets in this
-- schema already do for their partial indexes. Only that one line changes.

create or replace function public.send_message(
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
  on conflict (conversation_id, client_message_id)
    where client_message_id is not null
  do nothing
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
