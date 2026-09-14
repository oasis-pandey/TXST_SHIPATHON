export type SwipeIntent = "like" | "pass" | "reset";

export function getSwipeIntent(
  horizontalDistance: number,
  threshold: number,
): SwipeIntent {
  if (horizontalDistance > threshold) return "like";
  if (horizontalDistance < -threshold) return "pass";
  return "reset";
}
