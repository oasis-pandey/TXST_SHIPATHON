-- Swipes are written under the caller's authenticated role, while the
-- recommendation queue is intentionally backend-owned and read-only to
-- clients. Let this narrowly scoped, non-callable trigger clean up only the
-- queue row corresponding to the RLS-authorized swipe that fired it.
alter function public.dequeue_recommendation_on_swipe() security definer;

revoke execute on function public.dequeue_recommendation_on_swipe()
from public, anon, authenticated;
