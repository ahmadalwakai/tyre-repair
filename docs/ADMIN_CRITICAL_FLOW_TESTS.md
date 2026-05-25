# Admin App — Critical-Flow Manual Test Checklist

> Source: Admin Stability & Field Operations Pack — Part 5
>
> No automated test framework (Jest / Playwright / Detox) is currently
> configured in this monorepo. Adding one was deliberately deferred to avoid
> destabilising the Expo/React Native build. This checklist is the contract
> until a runner is introduced.
>
> Run each scenario manually before deploying changes that touch
> pricing-safety, attachments, permissions, diagnostics, or the offline
> outbox.

---

## A. Public checkout — pricing safety blocks

These are the highest-business-risk paths. Use real `apps/web` against a
test database.

### A.1 Long-distance assessment must block public payment

- Customer location ~35 miles from Glasgow HQ.
- `quoteJobType = ASSESSMENT`.
- Submit `POST /api/checkout/session` with the quote.
- Expected:
  - HTTP `409`.
  - Body `{ "code": "pricing_safety_call_first", "error": "We need to confirm availability for this location. Please call us to complete your emergency booking." }`.
  - No PaymentIntent created in Stripe.
  - No booking row marked paid.
  - No stock decrement.
  - Audit log entry `pricing.safety.public_payment_blocked` written.

### A.2 Locking wheel nut NO_KEY must block public payment

- Replacement quote, customer selects `lockingWheelNutStatus = NO_KEY`.
- Submit checkout session.
- Expected: `409 pricing_safety_call_first` with the same customer-safe
  message. No PaymentIntent.

### A.3 Public never sees internal language

- Inspect every `409` response body.
- Forbidden words anywhere in body: `risk`, `loss`, `manual review`,
  `demand multiplier`, `profit`, `Call-first only`.
- Allowed wording: `confirm availability`, `please call us`.

---

## B. Admin diagnostics endpoint — `/api/admin/diagnostics`

### B.1 Requires JWT

- Call without `Authorization` header → `401`.
- Call with malformed bearer → `401`.

### B.2 Returns safe booleans only

- Call with valid admin JWT.
- Response body MUST contain only:
  - booleans for env presence (no values),
  - admin identity (id, email, fullName, role, permissions[]),
  - `service`, `version`, `timestamp`, `database.ok`.
- Response body MUST NOT contain any of: `PUSHER_SECRET`, `ADMIN_JWT_SECRET`,
  `STORAGE_SECRET_ACCESS_KEY`, `STORAGE_ACCESS_KEY_ID`, `BLOB_READ_WRITE_TOKEN`,
  raw URLs containing tokens, or any value that looks like base64+ secret.

### B.3 Diagnostics screen renders

- Open admin app → More → Diagnostics.
- All 7 cards render without crash.
- "Test API" button shows ping result with status + duration.
- "Send test notification" disables when offline; succeeds when device is
  registered.
- "Play test sound" plays the bundled `admin-alert.mp3`.
- Missing-env rows show a red `Missing` badge.

---

## C. Offline outbox — `apps/admin/src/lib/offline/outbox.ts`

### C.1 Dangerous actions are blocked offline

For each of the following types, calling `enqueueOutboxAction({ type, ... })`
MUST throw `OutboxRefusedError` with reason `'dangerous'` and message
`"Internet required for this action."`:

- `booking.create`
- `booking.cancel`
- `booking.refund`
- `booking.send_payment_link`
- `booking.send_balance_link`
- `booking.send_location_link`
- `booking.send_tracking_link`
- `stock.update`
- `pricing.override`
- `payment.charge`
- `assessment.convert`

### C.2 Safe actions can queue

- Call `enqueueOutboxAction({ type: 'booking.note.add', endpoint: '/api/admin/bookings/<id>/notes', label: 'Add note', payload: { body: 'test' } })`.
- Open Outbox screen — item should appear with status `pending`.
- Toggle device online — auto-flush should send the note within ~5s and the
  item should disappear.
- If the endpoint returns 5xx, item retry count increments; after
  `MAX_RETRIES (5)` it stays as `failed` and admin can discard manually.

### C.3 No secrets persisted

- Pass payload `{ adminToken: 'abc', client_secret: 'pi_secret', body: 'note' }`.
- Inspect SecureStore key `admin_outbox_v1` — `adminToken` and `client_secret`
  MUST NOT be present. Only `body` survives.

---

## D. Booking attachments — `/api/admin/bookings/[bookingId]/attachments`

### D.1 Requires JWT

- `GET` and `POST` without bearer → `401`.

### D.2 Returns 503 when storage is not configured

- Ensure `STORAGE_PROVIDER` env is unset (or `none`).
- `POST` with a valid payload as an admin with `booking.attachments.upload`.
- Expected: `503` with body
  `{ "error": "Photo upload is not configured.", "code": "storage_not_configured", "missing": [...] }`.
- No DB row inserted.

### D.3 Permission enforcement on delete

- As `viewer` role: `DELETE` → `403` with `code: "permission_denied"`.
- As `owner` role: `DELETE` → `200`, audit log
  `booking.attachment.deleted` written.

### D.4 Admin app panel renders without storage

- Open booking detail → "Attachments" panel renders the
  "Photo upload is not configured" amber notice.
- No crash; existing attachments (if any) still listed.

---

## E. Role-based permissions

### E.1 Existing admins keep access

- Existing seed admin has `role = 'owner'` (or legacy `'admin'`).
- All sensitive endpoints (`/cancel`, `/attachments`, etc.) MUST still
  succeed. No regression on existing flows.

### E.2 Sensitive endpoints enforce permission

- Create a test admin with `role = 'viewer'`.
- `POST /api/admin/bookings/<id>/cancel` → `403`,
  `code: "permission_denied"`, `permission: "booking.cancel"`.
- `POST /api/admin/bookings/<id>/attachments` → `403`.

### E.3 UI hides disallowed actions

- Sign in as `viewer`. Booking detail must not show Cancel button
  (or it must be visibly disabled with the message
  "Owner permission required.").

---

## F. Pricing safety admin copy regression

- `PricingSafetySignal` for `pricingSafety: BLOCK_PUBLIC_PAYMENT` in admin
  channel must NOT render the strings:
  - `Call-first only`
  - `Call the customer first`
  - `Public should call first`
- It MUST render `Manual handling required` (or
  "Confirm price, payment and dispatch with the customer before creating
  the booking.").

---

## G. Recommended next steps for automation

When time permits, add:

1. **Vitest + supertest** for `apps/web` route handlers (no browser needed):
   - 1 file for diagnostics auth + shape.
   - 1 file for attachments storage-not-configured.
   - 1 file for cancel-permission gate.
2. **Jest + @testing-library/react-native** for the admin app:
   - `outbox.spec.ts` — refusal of every dangerous type.
   - `PricingSafetySignal.spec.tsx` — no "Call-first" string in admin copy.

Do NOT add Detox until the team agrees to the build-time cost.
