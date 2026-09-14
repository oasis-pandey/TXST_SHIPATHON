## Parent PRD

`issues/prd-user-like-action.md`

## What to build

Complete positive-interaction parity for the Like flow established in `issues/006-persist-heart-likes.md`. Right swipe and the existing Favorite star must invoke the same persisted Like action as the heart, wait for backend success before animating and advancing, and share duplicate-submission and inline-error behavior.

This slice must exercise the existing end-to-end path rather than introduce a second service or backend workflow. Left swipe and Discard remain local queue advancement and must not write Pass rows.

## Acceptance criteria

- [ ] Heart, Favorite, and right swipe call one shared Like handler with the current card's real profile ID.
- [ ] None of the positive interactions duplicates Edge Function, matching-service, authentication, validation, or persistence logic.
- [ ] Crossing the right-swipe threshold settles or holds the current card while the Like request is pending.
- [ ] A successful right-swipe Like animates the card out and advances exactly once.
- [ ] A failed right-swipe Like restores or retains the current card and shows the same inline retryable error as the heart action.
- [ ] Favorite follows the same pending, success, failure, retry, and advancement behavior as heart and right swipe.
- [ ] All positive controls and gesture submission are disabled or guarded while a Like is pending.
- [ ] A positive gesture on a transitional card without a real profile ID does not invoke the backend or advance the deck.
- [ ] Left swipe and Discard continue to advance locally without invoking create-swipe or writing a Pass.
- [ ] Focused tests or deterministic behavior checks cover shared-handler parity, one advancement after success, no advancement after failure, and unchanged local Pass behavior.
- [ ] An existing signed-in PairUp session can exercise each positive interaction against a real loaded developer profile and produce the same user-to-user Like contract.
- [ ] Existing tests, TypeScript checking, and Expo lint pass.

## Blocked by

- Blocked by `issues/006-persist-heart-likes.md`

## User stories addressed

- User story 4
- User story 5
- User story 6
- User story 7
- User story 8
- User story 9
- User story 10
- User story 11
- User story 21
- User story 22
- User story 23
- User story 24
- User story 25
