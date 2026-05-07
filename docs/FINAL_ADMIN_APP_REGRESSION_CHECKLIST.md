# Final Admin App Regression Checklist — Mobile Android Financial Safety Pack

This checklist verifies the **Final Admin Mobile Android Financial Safety + Audit Pack**
without breaking any previously shipped feature. Run through each section before
release. Anything ❌ blocks release. ✅ = verified.

> **Hard rules — must remain true at all times**
>
> - No VAT calculations or VAT lines anywhere on web or admin.
> - No date or time pickers in the customer quote/checkout flow.
> - No customer accounts, login, or address book.
> - No iOS app, no driver portal, no admin web app.
> - No Stripe webhook signature changes.
> - No Stripe automatic refunds — refunds are manual only.
> - No Stripe automatic stock restore on cancellation.
> - No Tailwind on the public website. No Prisma anywhere.
> - No Google Maps SDK.

---

## 1. Auth (admin app)

- [ ] Login with valid credentials succeeds; `admin.login.success` audit row.
- [ ] Login with wrong password → `admin.login.failed` (`bad_password`).
- [ ] Login with disabled admin → `admin.login.failed` (`inactive`).
- [ ] Logout → `admin.logout` audit row.
- [ ] Forgot password → email sent, `admin.password_reset.requested` row.
- [ ] Reset password → success, `admin.password_reset.completed` row.
- [ ] No password, JWT, reset token, or cookie ever appears in `audit_logs.metadata`.

## 2. Command Center / Dashboard

- [ ] Dashboard renders without runtime errors.
- [ ] Realtime events still arrive (booking.created, payment.succeeded).
- [ ] Push notifications still register and fire on key events.

## 3. Bookings — Lifecycle

- [ ] List loads, paginates, search works.
- [ ] Status transitions (pending_payment → confirmed → dispatching → dispatched → on_site → completed)
      all succeed and emit `booking.status.changed` / `booking.completed` audit rows.
- [ ] Disallowed transitions are rejected with 400.
- [ ] Manual booking creation by admin succeeds and writes
      `booking.created.by_admin` audit row.

## 4. Deposit & Balance Flow

- [ ] Customer pays 15% deposit → webhook handles `payment.deposit.succeeded`,
      stock decrement is **skipped** with reason `deposit_only` and
      `stock.skipped.deposit_only` audit row.
- [ ] Booking shows `paymentStatus = deposit_paid`.
- [ ] Send-balance-payment-link delivers SMS + email (per channels available)
      and writes `booking.payment_link.sent` (kind=balance) audit row.
- [ ] Customer pays balance → `payment.balance.paid` audit row, stock
      decrement runs (`stock.decremented.by_webhook` source=balance) unless
      special order.
- [ ] Booking shows `paymentStatus = paid` and `stockDecrementedAt` set.

## 5. Cancellation Workflow (Bundle B)

- [ ] `POST /api/admin/bookings/:id/cancel` requires JWT (401 without).
- [ ] If deposit paid and `depositDecision === 'not_applicable'` → 400
      with “choose a deposit decision” error.
- [ ] Successful cancellation:
  - booking.status = `cancelled`, `cancelledAt` set
  - `booking_cancellations` row inserted with stage + decision + amounts
  - `booking_events` row inserted
  - admin + tracking Pusher events fired
  - `cancellation.created` audit row written
  - `cancellation.deposit.retained` written when decision = retain
  - `cancellation.refund.review_required` written when refund/partial/manual
- [ ] Cancellation email sent to customer (only when email on file). Email
      contains: tracking ID, reason, deposit retained / refund-review wording,
      cancellation policy URL. **Never claims refund has been processed.**
- [ ] No Stripe refund call is made.
- [ ] No stock change on cancellation.
- [ ] Cannot cancel a booking already in `cancelled`, `refunded`, `failed`,
      or `completed` (409).

## 6. Assessment → Replacement Conversion

- [ ] Convert succeeds for ASSESSMENT bookings in valid statuses.
- [ ] Adjustment row created, payment link sent.
- [ ] `booking.assessment.converted` audit row recorded with
      `originalPaidAmountGbp`, `additionalAmountGbp`, `totalReplacementAmountGbp`.

## 7. Stock

- [ ] Manual stock update → `stock.updated.by_admin` audit row with before/after.
- [ ] CSV import → `stock.csv.imported` audit row with `updated/skipped/totalRows`.
- [ ] Special-order tyres never decrement: webhook writes
      `stock.skipped.special_order`.
- [ ] Race-lost stock decrement writes `stock.decrement.failed`.
- [ ] Low-stock alert still fires `stock.low_stock.alert_triggered` once
      per booking.
- [ ] No automatic stock restore on cancellation or refund.

## 8. Pricing

- [ ] Pricing rule update → `pricing.rule.updated` audit row including
      `changedKeys` array.
- [ ] Pricing override create / update / deactivate audit rows recorded.

## 9. Notifications & Realtime

- [ ] Push notifications still register and unregister.
- [ ] Realtime events arrive on admin (`private-admin`) and customer
      (`tracking-{trackingId}`) channels.
- [ ] Failure of either channel never breaks the API request.

## 10. Offline-Tolerant Behaviour

- [ ] Admin app does not crash when offline.
- [ ] Booking list and dashboard fall back gracefully on API error.

## 11. Public Tracking Page (Bundle C)

- [ ] Tracking endpoint returns `paymentSummary` with calm wording.
- [ ] Customer-safe payment summary **never** includes:
  - `internalNotes`
  - admin emails / IDs
  - deposit decision text
  - `retainedAmountGbp` / `refundDueGbp`
  - raw payment IDs or Stripe IDs
- [ ] Cancelled booking shows the cancelled headline with calm wording only.
- [ ] No date or time UI on quote / checkout.

## 12. Email & SMS

- [ ] Confirmation email for FULL payment is unchanged.
- [ ] Confirmation email for DEPOSIT shows: deposit paid, balance due,
      cancellation policy link, no refund claims.
- [ ] Cancellation email subject: “TyreRepair UK booking cancellation update”.
- [ ] No emails contain VAT lines.

## 13. Audit Log (Bundle A)

- [ ] `audit_logs` table populated with every sensitive action listed in this
      doc.
- [ ] `GET /api/admin/audit-logs` requires JWT, supports filters
      (`bookingId`, `entityType`, `action`, `actorAdminId`, `from`, `to`,
      `cursor`, `limit`).
- [ ] Booking detail view exposes a per-booking audit log.
- [ ] Audit log UI never displays raw secrets — verified via the
      `SENSITIVE_KEY_PATTERNS` redaction.
- [ ] `actorType ∈ {'admin','system','stripe_webhook','customer','pusher','notification'}`.

## 14. Cash Reconciliation (Bundle D)

- [ ] `GET /api/admin/reports/cash-reconciliation?date=YYYY-MM-DD` requires JWT.
- [ ] Defaults to today (Europe/London) when no date supplied; respects BST/GMT.
- [ ] Only payments with `status = 'succeeded'` count toward `collectedTotalGbp`.
- [ ] Splits: full / deposit / balance / adjustment.
- [ ] `refundMarkedGbp` and `depositRetainedGbp` come from
      `booking_cancellations`, not Stripe.
- [ ] `outstandingBalanceGbp` derived from `bookings.balanceDueGbp` for
      bookings created that day with `paymentStatus = deposit_paid`.
- [ ] Booking counts: paid / deposit / assessment / replacement / cancelled.
- [ ] `items[]` lists every booking touched on that day with succeeded amounts.
- [ ] Cash Reconciliation tab renders for the selected day, with day arrows
      working across DST boundaries.

## 15. No-VAT, No-Date/Time Verification

- [ ] grep the codebase for `vat`, `VAT`, `tax_rate` — no customer-facing
      references; all stored `vat_amount_gbp` values remain `0.00`.
- [ ] grep the customer flows for `DatePicker`, `TimePicker`, `react-datepicker` —
      no occurrences in `apps/web/src/app/quote` or `apps/web/src/app/checkout`.

## 16. Final Build Sanity

- [ ] `npm --workspace apps/web run type-check` → no errors.
- [ ] `npm --workspace apps/admin run type-check` → no errors.
- [ ] `npm --workspace apps/web run build` → success.
- [ ] No new prerender warnings introduced by Bundles A–E.

---

## Optional E2E (gated, manual)

Playwright is **not** installed by default. Mutation tests are gated on
`E2E_ALLOW_MUTATION_TESTS=true` so smoke runs are read-only.

```bash
npm i -D @playwright/test
npx playwright install chromium
E2E_ALLOW_MUTATION_TESTS=false npx playwright test tests/e2e/admin-financial-safety.spec.ts
```

Suggested coverage:

1. `GET /api/admin/audit-logs` returns 401 without JWT.
2. `POST /api/admin/bookings/:id/cancel` returns 401 without JWT.
3. `GET /api/admin/reports/cash-reconciliation` returns 401 without JWT.
4. Customer tracking page never renders the strings:
   `"internal notes"`, `"refund processed"`, `"VAT"`, `"deposit retained"`.
5. Quote and checkout pages contain no `<input type="date">` or
   `<input type="time">`.
