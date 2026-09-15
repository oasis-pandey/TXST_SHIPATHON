-- A Like retry updates the existing swipe row. Dequeue on both paths so a
-- decided profile cannot remain in the disposable recommendation queue.
drop trigger if exists swipes_dequeue_recommendation
on public.swipes;

create trigger swipes_dequeue_recommendation
after insert or update of decision on public.swipes
for each row execute function public.dequeue_recommendation_on_swipe();

-- Repair queue rows inserted by the previous refill implementation after a
-- decision already existed. The queue is explicitly disposable domain state.
delete from public.recommendation_queue as queued
using public.swipes as decided
where queued.actor_type = decided.actor_type
  and queued.actor_id = decided.actor_id
  and queued.target_type = decided.target_type
  and queued.target_id = decided.target_id;
