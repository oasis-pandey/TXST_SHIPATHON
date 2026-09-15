## Parent PRD

`issues/prd-mutual-match.md`

## What to build

Complete the user-facing mutual-match path from the parent PRD. After any positive Discover interaction receives a successful result with `matched = true`, preserve the submitted developer's presentation data, advance the card exactly once through the existing success path, and show an accessible, dismissible “It’s a Match” overlay above the advanced deck.

The overlay identifies the matched developer and offers one keep-swiping action. It must use the backend's stable `matched` result rather than `matchCreated`, so a retry after a lost response can still show the confirmation. One-sided Likes retain normal success advancement without an overlay, and failed Likes retain the current card and existing retry behavior. This slice does not create conversations, notifications, or Realtime behavior.

## Acceptance criteria

- [ ] Heart, Favorite, and right swipe continue to share one Like handler and can all produce the same match confirmation.
- [ ] The UI treats `matched` from the successful backend result as the sole authority for presenting the overlay.
- [ ] `matchCreated` is retained as contract metadata but is not required to show the overlay when `matched` is true.
- [ ] Before advancing, Discover captures only the matched profile presentation data needed by the overlay, including display name and available avatar.
- [ ] A successful mutual Like advances the submitted card through the existing queue/animation path exactly once.
- [ ] The overlay is shown for the captured developer after the successful card advancement without depending on the queue's new current profile.
- [ ] The overlay clearly presents an “It’s a Match” heading and identifies the matched developer.
- [ ] A missing avatar has an intentional fallback and does not prevent the overlay from rendering.
- [ ] The overlay provides one clear keep-swiping/dismiss action.
- [ ] Dismissing the overlay clears its retained match presentation state and reveals the already-advanced Discover deck.
- [ ] The overlay blocks accidental interaction with the underlying Discover controls while visible.
- [ ] A successful non-mutual Like advances normally and does not show the overlay.
- [ ] A failed Like does not advance the card, does not show the overlay, preserves the current card, and displays the existing inline retryable error.
- [ ] A stable retry result with `matched = true` and `matchCreated = false` still shows the overlay after successful advancement.
- [ ] Rapid taps and gestures while a Like is pending remain guarded and cannot produce duplicate advancement or overlapping overlays.
- [ ] Left swipe and Discard remain local advancement, do not invoke the Like backend, and never show the match overlay.
- [ ] Transitional cards without a real profile ID remain guarded and cannot show a match confirmation.
- [ ] The overlay exposes an appropriate modal/dialog accessibility role or equivalent platform behavior.
- [ ] The heading, matched developer identity, and dismiss action have meaningful screen-reader labels and announcement behavior.
- [ ] The keep-swiping action is keyboard operable on web, has an accessible touch target, and does not rely on color alone.
- [ ] Focus is handled predictably when the overlay opens and closes on supported platforms.
- [ ] The implementation uses APIs supported by Expo SDK 57 on Android, iOS, Expo Go, and web, verified against the exact versioned Expo documentation before coding.
- [ ] No visual component calls Supabase, queries `swipes` or `matches`, or reproduces reciprocal-Like logic.
- [ ] No Start Message action, direct-conversation creation, notification insert, Realtime publication, or Realtime subscription is added.
- [ ] Focused tests cover unmatched success advancement, matched success advancement plus overlay, exactly one advancement, retained matched identity after queue movement, and dismissal.
- [ ] Focused tests cover failed Like retention, stable retry presentation, duplicate-submit guards, local Pass behavior, missing avatar fallback, and accessibility semantics.
- [ ] Existing matching-service, Edge Function, swipe-intent, TypeScript, and Expo lint checks continue to pass.
- [ ] Manual verification covers heart, Favorite, and right swipe on at least one supported native target and web using controlled non-production profiles.
- [ ] Manual verification does not create production users, matches, notifications, conversations, or messages.

## Blocked by

- Blocked by `issues/008-create-atomic-mutual-match.md`

## User stories addressed

- User story 12
- User story 13
- User story 14
- User story 15
- User story 16
- User story 17
- User story 28
- User story 31
- User story 32
- User story 35
