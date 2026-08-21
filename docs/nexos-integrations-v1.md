# NexOS integrations v1

## Personal profile

- Display name: G. Tadeu
- Wake: 05:30
- Sleep: 23:00
- Current academic priority: UFG + ENEM; UnB/PAS secondary
- Adaptive behavior: proactive, but every consequential suggestion requires confirmation
- Interface contract: do not alter established density, animation language, Liquid Glass, or cosmic environment; additions must inherit the existing system

## Integration priority

1. Google Calendar ~ bidirectional sync
2. Notification Core ~ proactive, user-controlled
3. Notion
4. WhatsApp command layer
5. Gmail + Google Drive ~ analysis/retrieval
6. Deezer

## Calendar contract

Google Calendar is the canonical external calendar. Apple Calendar is treated as a mirror of Google Calendar, so the first integration is Google-only.

The existing `calendar_commitments` table is the local normalized representation. External event identity must remain stable through `external_id`; sync must be idempotent and must never duplicate events.

The NexOS UI should expose connection status, last sync, and sync errors, but should not change the existing visual language.

## Adaptive assistant contract

The assistant may:

1. read context;
2. identify conflicts, deadlines, overload, or opportunities;
3. propose an action;
4. explain why;
5. wait for confirmation;
6. execute only after confirmation.

No automatic structural change to calendar, tasks, projects, finances, or routines without explicit confirmation.

## Notification contract

Allowed categories for this user:

- commitments
- tasks
- overdue tasks
- study
- reviews
- habits
- finances
- daily summary
- weekly summary

Projects and goals are not recurring notification categories by default.

There is no global quiet-hours block configured.

## Privacy / cost

Prefer official APIs and free tiers whenever practical. OAuth tokens must stay server-side and never be exposed to the client. External integrations should be independently revocable.
