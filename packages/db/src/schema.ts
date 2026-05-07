import {
  pgTable,
  pgEnum,
  uuid,
  varchar,
  text,
  boolean,
  integer,
  timestamp,
  numeric,
  jsonb,
  index,
  uniqueIndex,
  check,
} from 'drizzle-orm/pg-core';
import { sql, type InferSelectModel, type InferInsertModel } from 'drizzle-orm';

/* -------------------------------------------------------------------------- */
/* Enums                                                                      */
/* -------------------------------------------------------------------------- */

export const bookingStatusEnum = pgEnum('booking_status', [
  'pending_payment',
  'confirmed',
  'dispatching',
  'dispatched',
  'on_site',
  'completed',
  'cancelled',
  'refunded',
  'failed',
]);

export const paymentStatusEnum = pgEnum('payment_status', [
  'unpaid',
  'requires_payment_method',
  'requires_action',
  'processing',
  'succeeded',
  'failed',
  'cancelled',
  'refunded',
  'deposit_paid',
]);

export const checkoutPaymentModeEnum = pgEnum('checkout_payment_mode', ['FULL', 'DEPOSIT']);

export const lockingWheelNutStatusEnum = pgEnum('locking_wheel_nut_status', [
  'HAVE_KEY',
  'NO_KEY',
  'STANDARD_ONLY',
]);

export const tyreTierEnum = pgEnum('tyre_tier', ['budget', 'mid_range', 'premium']);

export const tyreTypeEnum = pgEnum('tyre_type', [
  'summer',
  'winter',
  'all_season',
  'run_flat',
  'commercial',
]);

export const locationCaptureMethodEnum = pgEnum('location_capture_method', [
  'manual_address',
  'mapbox_autocomplete',
  'sms_link',
  'email_link',
  'browser_geolocation',
]);

export const pricingRuleKeyEnum = pgEnum('pricing_rule_key', [
  'time_night',
  'time_peak_morning',
  'weather_moderate',
  'weather_severe',
  'date_weekend',
  'date_bank_holiday',
  'distance_free_miles',
  'distance_per_mile_gbp',
  'demand_open_jobs_threshold',
  'demand_high_multiplier',
  'vat_rate',
  'emergency_assessment_fee_gbp',
]);

export const tyreProblemTypeEnum = pgEnum('tyre_problem_type', [
  'PUNCTURE_OR_FLAT',
  'DAMAGED_OR_BLOWN_OUT',
  'SLOW_PRESSURE_LOSS',
  'NEEDS_REPLACEMENT',
  'NOT_SURE',
]);

export const quoteJobTypeEnum = pgEnum('quote_job_type', ['ASSESSMENT', 'REPLACEMENT']);

export const pricingOverrideTypeEnum = pgEnum('pricing_override_type', ['surge', 'discount']);

export const pricingOverrideStatusEnum = pgEnum('pricing_override_status', [
  'active',
  'inactive',
  'expired',
]);

export const adminRoleEnum = pgEnum('admin_role', ['owner', 'admin']);

export const visitorEventTypeEnum = pgEnum('visitor_event_type', [
  'page_view',
  'quote_started',
  'quote_step_changed',
  'cart_updated',
  'checkout_started',
  'booking_completed',
]);

/* -------------------------------------------------------------------------- */
/* Tables                                                                     */
/* -------------------------------------------------------------------------- */

export const admins = pgTable(
  'admins',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    email: varchar('email', { length: 320 }).notNull().unique(),
    passwordHash: text('password_hash').notNull(),
    fullName: varchar('full_name', { length: 160 }).notNull(),
    role: adminRoleEnum('role').notNull().default('owner'),
    isActive: boolean('is_active').notNull().default(true),
    lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
    passwordResetTokenHash: text('password_reset_token_hash'),
    passwordResetExpiresAt: timestamp('password_reset_expires_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('admins_email_unique_idx').on(t.email),
    index('admins_is_active_idx').on(t.isActive),
  ],
);

export const tyreCatalog = pgTable(
  'tyre_catalog',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sku: varchar('sku', { length: 64 }).notNull().unique(),
    brand: varchar('brand', { length: 120 }).notNull(),
    model: varchar('model', { length: 160 }).notNull(),
    width: integer('width').notNull(),
    profile: integer('profile').notNull(),
    rim: integer('rim').notNull(),
    sizeLabel: varchar('size_label', { length: 32 }).notNull(),
    speedRating: varchar('speed_rating', { length: 8 }).notNull(),
    loadIndex: varchar('load_index', { length: 8 }).notNull(),
    tier: tyreTierEnum('tier').notNull(),
    type: tyreTypeEnum('type').notNull().default('summer'),
    basePriceGbp: numeric('base_price_gbp', { precision: 10, scale: 2 }).notNull(),
    isActive: boolean('is_active').notNull().default(true),
    description: text('description'),
    /** Admin Efficiency Pack F7 — flag for "fastest available" public badge. */
    fastFitAvailable: boolean('fast_fit_available').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('tyre_catalog_sku_unique_idx').on(t.sku),
    index('tyre_catalog_size_label_idx').on(t.sizeLabel),
    index('tyre_catalog_tier_idx').on(t.tier),
    index('tyre_catalog_type_idx').on(t.type),
    index('tyre_catalog_is_active_idx').on(t.isActive),
    index('tyre_catalog_size_idx').on(t.width, t.profile, t.rim),
    check('tyre_catalog_width_positive', sql`${t.width} > 0`),
    check('tyre_catalog_profile_positive', sql`${t.profile} > 0`),
    check('tyre_catalog_rim_positive', sql`${t.rim} > 0`),
    check('tyre_catalog_base_price_positive', sql`${t.basePriceGbp} > 0`),
  ],
);

export const stock = pgTable(
  'stock',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tyreId: uuid('tyre_id')
      .notNull()
      .references(() => tyreCatalog.id, { onDelete: 'cascade' }),
    quantityAvailable: integer('quantity_available').notNull().default(0),
    lowStockThreshold: integer('low_stock_threshold').notNull().default(2),
    reservedQuantity: integer('reserved_quantity').notNull().default(0),
    locationName: varchar('location_name', { length: 120 }).notNull().default('Glasgow HQ'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('stock_tyre_id_unique_idx').on(t.tyreId),
    index('stock_quantity_available_idx').on(t.quantityAvailable),
    check('stock_quantity_available_non_negative', sql`${t.quantityAvailable} >= 0`),
    check('stock_reserved_non_negative', sql`${t.reservedQuantity} >= 0`),
    check('stock_low_threshold_non_negative', sql`${t.lowStockThreshold} >= 0`),
    check('stock_reserved_lte_available', sql`${t.reservedQuantity} <= ${t.quantityAvailable}`),
  ],
);

export const customers = pgTable(
  'customers',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    fullName: varchar('full_name', { length: 160 }).notNull(),
    email: varchar('email', { length: 320 }),
    phone: varchar('phone', { length: 32 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('customers_phone_idx').on(t.phone),
    index('customers_email_idx').on(t.email),
  ],
);

export const customerLocations = pgTable(
  'customer_locations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    customerId: uuid('customer_id').references(() => customers.id, { onDelete: 'set null' }),
    captureMethod: locationCaptureMethodEnum('capture_method').notNull(),
    addressLine1: varchar('address_line1', { length: 240 }),
    addressLine2: varchar('address_line2', { length: 240 }),
    city: varchar('city', { length: 120 }),
    postcode: varchar('postcode', { length: 20 }),
    country: varchar('country', { length: 80 }).notNull().default('United Kingdom'),
    latitude: numeric('latitude', { precision: 10, scale: 7 }),
    longitude: numeric('longitude', { precision: 10, scale: 7 }),
    mapboxPlaceId: varchar('mapbox_place_id', { length: 160 }),
    accuracyMeters: integer('accuracy_meters'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('customer_locations_customer_id_idx').on(t.customerId),
    index('customer_locations_postcode_idx').on(t.postcode),
    index('customer_locations_lat_lng_idx').on(t.latitude, t.longitude),
    check(
      'customer_locations_latitude_range',
      sql`${t.latitude} IS NULL OR (${t.latitude} >= -90 AND ${t.latitude} <= 90)`,
    ),
    check(
      'customer_locations_longitude_range',
      sql`${t.longitude} IS NULL OR (${t.longitude} >= -180 AND ${t.longitude} <= 180)`,
    ),
  ],
);

export const quotes = pgTable(
  'quotes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    customerId: uuid('customer_id').references(() => customers.id, { onDelete: 'set null' }),
    locationId: uuid('location_id').references(() => customerLocations.id, {
      onDelete: 'set null',
    }),
    tyreId: uuid('tyre_id').references(() => tyreCatalog.id, { onDelete: 'set null' }),
    vehicleRegistration: varchar('vehicle_registration', { length: 16 }),
    vehicleMake: varchar('vehicle_make', { length: 80 }),
    vehicleModel: varchar('vehicle_model', { length: 120 }),
    vehicleYear: integer('vehicle_year'),
    basePriceGbp: numeric('base_price_gbp', { precision: 10, scale: 2 }).notNull(),
    finalPriceGbp: numeric('final_price_gbp', { precision: 10, scale: 2 }).notNull(),
    vatAmountGbp: numeric('vat_amount_gbp', { precision: 10, scale: 2 }).notNull(),
    totalPriceGbp: numeric('total_price_gbp', { precision: 10, scale: 2 }).notNull(),
    distanceMiles: numeric('distance_miles', { precision: 8, scale: 2 }),
    pricingBreakdown: jsonb('pricing_breakdown').notNull().default(sql`'{}'::jsonb`),
    jobType: quoteJobTypeEnum('job_type').notNull().default('REPLACEMENT'),
    tyreProblemType: tyreProblemTypeEnum('tyre_problem_type'),
    assessmentFeeGbp: numeric('assessment_fee_gbp', { precision: 10, scale: 2 }),
    backupTyreId: uuid('backup_tyre_id').references(() => tyreCatalog.id, {
      onDelete: 'set null',
    }),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    /** Admin Efficiency Pack F9 — booking source tracking. */
    source: varchar('source', { length: 40 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('quotes_customer_id_idx').on(t.customerId),
    index('quotes_location_id_idx').on(t.locationId),
    index('quotes_tyre_id_idx').on(t.tyreId),
    index('quotes_vehicle_registration_idx').on(t.vehicleRegistration),
    index('quotes_created_at_idx').on(t.createdAt),
    index('quotes_job_type_idx').on(t.jobType),
    index('quotes_tyre_problem_type_idx').on(t.tyreProblemType),
    check('quotes_base_price_non_negative', sql`${t.basePriceGbp} >= 0`),
    check('quotes_final_price_non_negative', sql`${t.finalPriceGbp} >= 0`),
    check('quotes_vat_non_negative', sql`${t.vatAmountGbp} >= 0`),
    check('quotes_total_non_negative', sql`${t.totalPriceGbp} >= 0`),
    check(
      'quotes_distance_non_negative',
      sql`${t.distanceMiles} IS NULL OR ${t.distanceMiles} >= 0`,
    ),
  ],
);

export const bookings = pgTable(
  'bookings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    trackingId: varchar('tracking_id', { length: 9 }).notNull().unique(),
    quoteId: uuid('quote_id').references(() => quotes.id, { onDelete: 'set null' }),
    customerId: uuid('customer_id')
      .notNull()
      .references(() => customers.id, { onDelete: 'restrict' }),
    locationId: uuid('location_id').references(() => customerLocations.id, {
      onDelete: 'set null',
    }),
    tyreId: uuid('tyre_id').references(() => tyreCatalog.id, { onDelete: 'set null' }),
    backupTyreId: uuid('backup_tyre_id').references(() => tyreCatalog.id, {
      onDelete: 'set null',
    }),
    jobType: quoteJobTypeEnum('job_type').notNull().default('REPLACEMENT'),
    tyreProblemType: tyreProblemTypeEnum('tyre_problem_type'),
    assessmentFeeGbp: numeric('assessment_fee_gbp', { precision: 10, scale: 2 }),
    status: bookingStatusEnum('status').notNull().default('pending_payment'),
    paymentStatus: paymentStatusEnum('payment_status').notNull().default('unpaid'),
    lockingWheelNutStatus: lockingWheelNutStatusEnum('locking_wheel_nut_status')
      .notNull()
      .default('STANDARD_ONLY'),
    customerNotes: text('customer_notes'),
    adminNotes: text('admin_notes'),
    checkoutPaymentMode: checkoutPaymentModeEnum('checkout_payment_mode')
      .notNull()
      .default('FULL'),
    depositPercentage: numeric('deposit_percentage', { precision: 5, scale: 4 }),
    depositAmountGbp: numeric('deposit_amount_gbp', { precision: 10, scale: 2 }),
    balanceDueGbp: numeric('balance_due_gbp', { precision: 10, scale: 2 }),
    depositPaidAt: timestamp('deposit_paid_at', { withTimezone: true }),
    customerAcceptedDepositTermsAt: timestamp('customer_accepted_deposit_terms_at', {
      withTimezone: true,
    }),
    stockDecrementedAt: timestamp('stock_decremented_at', { withTimezone: true }),
    emergencyDetectedAt: timestamp('emergency_detected_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    confirmedAt: timestamp('confirmed_at', { withTimezone: true }),
    dispatchedAt: timestamp('dispatched_at', { withTimezone: true }),
    onSiteAt: timestamp('on_site_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
    refundedAt: timestamp('refunded_at', { withTimezone: true }),
    /** Admin Efficiency Pack F9 — booking source tracking. */
    source: varchar('source', { length: 40 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('bookings_tracking_id_unique_idx').on(t.trackingId),
    index('bookings_status_idx').on(t.status),
    index('bookings_payment_status_idx').on(t.paymentStatus),
    index('bookings_customer_id_idx').on(t.customerId),
    index('bookings_created_at_idx').on(t.createdAt),
    index('bookings_emergency_detected_at_idx').on(t.emergencyDetectedAt),
    index('bookings_job_type_idx').on(t.jobType),
    index('bookings_tyre_problem_type_idx').on(t.tyreProblemType),
    check(
      'bookings_tracking_id_format',
      sql`${t.trackingId} ~ '^TR-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$'`,
    ),
  ],
);

export const bookingEvents = pgTable(
  'booking_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    bookingId: uuid('booking_id')
      .notNull()
      .references(() => bookings.id, { onDelete: 'cascade' }),
    fromStatus: bookingStatusEnum('from_status'),
    toStatus: bookingStatusEnum('to_status').notNull(),
    message: text('message'),
    createdByAdminId: uuid('created_by_admin_id').references(() => admins.id, {
      onDelete: 'set null',
    }),
    metadata: jsonb('metadata').notNull().default(sql`'{}'::jsonb`),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('booking_events_booking_id_idx').on(t.bookingId),
    index('booking_events_to_status_idx').on(t.toStatus),
    index('booking_events_created_at_idx').on(t.createdAt),
  ],
);

export const payments = pgTable(
  'payments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    bookingId: uuid('booking_id').references(() => bookings.id, { onDelete: 'set null' }),
    quoteId: uuid('quote_id').references(() => quotes.id, { onDelete: 'set null' }),
    stripePaymentIntentId: varchar('stripe_payment_intent_id', { length: 255 })
      .notNull()
      .unique(),
    stripeCustomerId: varchar('stripe_customer_id', { length: 255 }),
    amountGbp: numeric('amount_gbp', { precision: 10, scale: 2 }).notNull(),
    vatAmountGbp: numeric('vat_amount_gbp', { precision: 10, scale: 2 }).notNull(),
    currency: varchar('currency', { length: 3 }).notNull().default('gbp'),
    status: paymentStatusEnum('status').notNull().default('processing'),
    rawStripeEvent: jsonb('raw_stripe_event'),
    paymentKind: varchar('payment_kind', { length: 32 }).notNull().default('full'),
    paidAt: timestamp('paid_at', { withTimezone: true }),
    failedAt: timestamp('failed_at', { withTimezone: true }),
    refundedAt: timestamp('refunded_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('payments_stripe_pi_unique_idx').on(t.stripePaymentIntentId),
    index('payments_booking_id_idx').on(t.bookingId),
    index('payments_quote_id_idx').on(t.quoteId),
    index('payments_status_idx').on(t.status),
    check('payments_amount_non_negative', sql`${t.amountGbp} >= 0`),
    check('payments_vat_non_negative', sql`${t.vatAmountGbp} >= 0`),
    check('payments_currency_gbp', sql`${t.currency} = 'gbp'`),
  ],
);

export const pricingRules = pgTable(
  'pricing_rules',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    key: pricingRuleKeyEnum('key').notNull().unique(),
    label: varchar('label', { length: 160 }).notNull(),
    description: text('description'),
    numericValue: numeric('numeric_value', { precision: 10, scale: 4 }).notNull(),
    isMultiplier: boolean('is_multiplier').notNull().default(true),
    isActive: boolean('is_active').notNull().default(true),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('pricing_rules_key_unique_idx').on(t.key),
    index('pricing_rules_is_active_idx').on(t.isActive),
    index('pricing_rules_sort_order_idx').on(t.sortOrder),
    check('pricing_rules_numeric_non_negative', sql`${t.numericValue} >= 0`),
  ],
);

export const pricingOverrides = pgTable(
  'pricing_overrides',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    type: pricingOverrideTypeEnum('type').notNull(),
    status: pricingOverrideStatusEnum('status').notNull().default('active'),
    label: varchar('label', { length: 160 }).notNull(),
    multiplier: numeric('multiplier', { precision: 10, scale: 4 }).notNull(),
    reason: text('reason'),
    startsAt: timestamp('starts_at', { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    createdByAdminId: uuid('created_by_admin_id').references(() => admins.id, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('pricing_overrides_status_idx').on(t.status),
    index('pricing_overrides_type_idx').on(t.type),
    index('pricing_overrides_starts_at_idx').on(t.startsAt),
    index('pricing_overrides_expires_at_idx').on(t.expiresAt),
    check('pricing_overrides_multiplier_positive', sql`${t.multiplier} > 0`),
  ],
);

export const liveVisitors = pgTable(
  'live_visitors',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    visitorTokenHash: varchar('visitor_token_hash', { length: 128 }).notNull().unique(),
    consentGiven: boolean('consent_given').notNull().default(false),
    currentPage: varchar('current_page', { length: 240 }),
    approxCity: varchar('approx_city', { length: 120 }),
    approxRegion: varchar('approx_region', { length: 120 }),
    approxCountry: varchar('approx_country', { length: 120 }),
    latitudeApprox: numeric('latitude_approx', { precision: 10, scale: 7 }),
    longitudeApprox: numeric('longitude_approx', { precision: 10, scale: 7 }),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('live_visitors_token_hash_unique_idx').on(t.visitorTokenHash),
    index('live_visitors_consent_given_idx').on(t.consentGiven),
    index('live_visitors_last_seen_at_idx').on(t.lastSeenAt),
  ],
);

export const visitorEvents = pgTable(
  'visitor_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    visitorId: uuid('visitor_id').references(() => liveVisitors.id, { onDelete: 'set null' }),
    type: visitorEventTypeEnum('type').notNull(),
    page: varchar('page', { length: 240 }),
    metadata: jsonb('metadata').notNull().default(sql`'{}'::jsonb`),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('visitor_events_visitor_id_idx').on(t.visitorId),
    index('visitor_events_type_idx').on(t.type),
    index('visitor_events_created_at_idx').on(t.createdAt),
  ],
);

export const notificationPreferences = pgTable(
  'notification_preferences',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    adminId: uuid('admin_id')
      .notNull()
      .references(() => admins.id, { onDelete: 'cascade' }),
    pushEnabled: boolean('push_enabled').notNull().default(true),
    soundEnabled: boolean('sound_enabled').notNull().default(true),
    bookingAlertsEnabled: boolean('booking_alerts_enabled').notNull().default(true),
    stockAlertsEnabled: boolean('stock_alerts_enabled').notNull().default(true),
    pricingAlertsEnabled: boolean('pricing_alerts_enabled').notNull().default(true),
    visitorAlertsEnabled: boolean('visitor_alerts_enabled').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('notification_preferences_admin_id_unique_idx').on(t.adminId)],
);

export const pushTokens = pgTable(
  'push_tokens',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    adminId: uuid('admin_id')
      .notNull()
      .references(() => admins.id, { onDelete: 'cascade' }),
    expoPushToken: varchar('expo_push_token', { length: 255 }).notNull().unique(),
    platform: varchar('platform', { length: 32 }).notNull().default('android'),
    deviceName: varchar('device_name', { length: 160 }),
    isActive: boolean('is_active').notNull().default(true),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('push_tokens_expo_token_unique_idx').on(t.expoPushToken),
    index('push_tokens_admin_id_idx').on(t.adminId),
    index('push_tokens_is_active_idx').on(t.isActive),
  ],
);

/* -------------------------------------------------------------------------- */
/* Callback requests (Phase 11 — Call Me Back rescue lead)                    */
/* -------------------------------------------------------------------------- */

export const callbackRequests = pgTable(
  'callback_requests',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    fullName: varchar('full_name', { length: 160 }),
    phone: varchar('phone', { length: 32 }).notNull(),
    email: varchar('email', { length: 320 }),
    tyreProblemType: tyreProblemTypeEnum('tyre_problem_type'),
    message: text('message'),
    sourcePage: varchar('source_page', { length: 160 }),
    /** Admin Efficiency Pack F9/F12 — simple lead source enum-ish + free-text location label. */
    source: varchar('source', { length: 40 }),
    locationLabel: varchar('location_label', { length: 240 }),
    latitude: numeric('latitude', { precision: 10, scale: 7 }),
    longitude: numeric('longitude', { precision: 10, scale: 7 }),
    status: varchar('status', { length: 32 }).notNull().default('new'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('callback_requests_phone_idx').on(t.phone),
    index('callback_requests_status_idx').on(t.status),
    index('callback_requests_created_at_idx').on(t.createdAt),
  ],
);

/* -------------------------------------------------------------------------- */
/* Booking adjustments (Phase 11 — Convert assessment to replacement)         */
/* -------------------------------------------------------------------------- */

export const bookingAdjustments = pgTable(
  'booking_adjustments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    bookingId: uuid('booking_id')
      .notNull()
      .references(() => bookings.id, { onDelete: 'cascade' }),
    type: varchar('type', { length: 64 }).notNull(),
    status: varchar('status', { length: 32 }).notNull().default('pending_payment'),
    originalPaidAmountGbp: numeric('original_paid_amount_gbp', { precision: 10, scale: 2 })
      .notNull()
      .default('0.00'),
    additionalAmountGbp: numeric('additional_amount_gbp', { precision: 10, scale: 2 })
      .notNull()
      .default('0.00'),
    totalReplacementAmountGbp: numeric('total_replacement_amount_gbp', { precision: 10, scale: 2 })
      .notNull()
      .default('0.00'),
    tyreId: uuid('tyre_id').references(() => tyreCatalog.id, { onDelete: 'set null' }),
    stripePaymentIntentId: varchar('stripe_payment_intent_id', { length: 255 }).unique(),
    paymentLinkUrl: text('payment_link_url'),
    notes: text('notes'),
    createdByAdminId: uuid('created_by_admin_id').references(() => admins.id, {
      onDelete: 'set null',
    }),
    paidAt: timestamp('paid_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('booking_adjustments_booking_id_idx').on(t.bookingId),
    index('booking_adjustments_status_idx').on(t.status),
    index('booking_adjustments_type_idx').on(t.type),
    index('booking_adjustments_created_at_idx').on(t.createdAt),
    check('booking_adjustments_amounts_non_negative', sql`${t.additionalAmountGbp} >= 0 AND ${t.originalPaidAmountGbp} >= 0 AND ${t.totalReplacementAmountGbp} >= 0`),
  ],
);

/* -------------------------------------------------------------------------- */
/* Admin reminders (Bundle 2 — No Answer follow-up)                           */
/* -------------------------------------------------------------------------- */

export const adminReminders = pgTable(
  'admin_reminders',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    adminId: uuid('admin_id').references(() => admins.id, { onDelete: 'set null' }),
    bookingId: uuid('booking_id').references(() => bookings.id, { onDelete: 'set null' }),
    callbackRequestId: uuid('callback_request_id').references(() => callbackRequests.id, {
      onDelete: 'set null',
    }),
    title: varchar('title', { length: 160 }).notNull(),
    message: text('message'),
    remindAt: timestamp('remind_at', { withTimezone: true }).notNull(),
    status: varchar('status', { length: 32 }).notNull().default('pending'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('admin_reminders_admin_id_idx').on(t.adminId),
    index('admin_reminders_booking_id_idx').on(t.bookingId),
    index('admin_reminders_status_idx').on(t.status),
    index('admin_reminders_remind_at_idx').on(t.remindAt),
  ],
);

/* -------------------------------------------------------------------------- */
/* Admin notifications inbox (Bundle 4)                                       */
/* -------------------------------------------------------------------------- */

export const adminNotifications = pgTable(
  'admin_notifications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    adminId: uuid('admin_id').references(() => admins.id, { onDelete: 'cascade' }),
    type: varchar('type', { length: 100 }).notNull(),
    priority: varchar('priority', { length: 16 }).notNull().default('normal'),
    title: varchar('title', { length: 160 }).notNull(),
    body: text('body').notNull(),
    data: jsonb('data').notNull().default(sql`'{}'::jsonb`),
    bookingId: uuid('booking_id').references(() => bookings.id, { onDelete: 'set null' }),
    trackingId: varchar('tracking_id', { length: 16 }),
    callbackRequestId: uuid('callback_request_id').references(() => callbackRequests.id, {
      onDelete: 'set null',
    }),
    stockId: uuid('stock_id').references(() => stock.id, { onDelete: 'set null' }),
    actionTarget: varchar('action_target', { length: 160 }),
    readAt: timestamp('read_at', { withTimezone: true }),
    handledAt: timestamp('handled_at', { withTimezone: true }),
    handledByAdminId: uuid('handled_by_admin_id').references(() => admins.id, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('admin_notifications_admin_id_idx').on(t.adminId),
    index('admin_notifications_type_idx').on(t.type),
    index('admin_notifications_priority_idx').on(t.priority),
    index('admin_notifications_read_at_idx').on(t.readAt),
    index('admin_notifications_handled_at_idx').on(t.handledAt),
    index('admin_notifications_booking_id_idx').on(t.bookingId),
    index('admin_notifications_callback_request_id_idx').on(t.callbackRequestId),
    index('admin_notifications_stock_id_idx').on(t.stockId),
    index('admin_notifications_created_at_idx').on(t.createdAt),
  ],
);

/* -------------------------------------------------------------------------- */
/* Stock notes (Bundle 3 — supplier note / Mark ordered)                      */
/* -------------------------------------------------------------------------- */

export const stockNotes = pgTable(
  'stock_notes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    stockId: uuid('stock_id')
      .notNull()
      .references(() => stock.id, { onDelete: 'cascade' }),
    adminId: uuid('admin_id').references(() => admins.id, { onDelete: 'set null' }),
    note: text('note').notNull(),
    status: varchar('status', { length: 32 }).notNull().default('open'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('stock_notes_stock_id_idx').on(t.stockId),
    index('stock_notes_status_idx').on(t.status),
    index('stock_notes_created_at_idx').on(t.createdAt),
  ],
);

/* -------------------------------------------------------------------------- */
/* Call click events (Bundle 5 Part A — website call button intent)           */
/* -------------------------------------------------------------------------- */

/**
 * Allowed values for `call_click_events.handled_action`.
 *
 * Stored as plain text (no Postgres enum) so the admin app can extend the set
 * without a migration if recovery actions evolve. The TypeScript union is the
 * source of truth and is exported below as `CallClickHandledAction`.
 */
export type CallClickHandledAction =
  | 'DISMISSED'
  | 'STARTED_QUICK_BOOKING'
  | 'CALLED_CUSTOMER'
  | 'OPENED_QUICK_BOOKING';

export const CALL_CLICK_HANDLED_ACTIONS: readonly CallClickHandledAction[] = [
  'DISMISSED',
  'STARTED_QUICK_BOOKING',
  'CALLED_CUSTOMER',
  'OPENED_QUICK_BOOKING',
];

export const callClickEvents = pgTable(
  'call_click_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sessionId: varchar('session_id', { length: 160 }),
    sourcePage: varchar('source_page', { length: 240 }),
    sourceComponent: varchar('source_component', { length: 160 }),
    quoteId: uuid('quote_id').references(() => quotes.id, { onDelete: 'set null' }),
    bookingId: uuid('booking_id').references(() => bookings.id, { onDelete: 'set null' }),
    phone: varchar('phone', { length: 32 }),
    customerName: varchar('customer_name', { length: 160 }),
    tyreProblemType: tyreProblemTypeEnum('tyre_problem_type'),
    jobType: quoteJobTypeEnum('job_type'),
    locationSummary: varchar('location_summary', { length: 240 }),
    userAgent: text('user_agent'),
    /** Full URL the customer was on when they tapped the call button. */
    href: text('href'),
    /** document.referrer at click time, if present. */
    referrer: text('referrer'),
    /** Set when an admin first sees / opens the popup or queue card. */
    acknowledgedAt: timestamp('acknowledged_at', { withTimezone: true }),
    acknowledgedByAdminId: uuid('acknowledged_by_admin_id').references(() => admins.id, {
      onDelete: 'set null',
    }),
    /** Set when an admin takes a final action (dismiss / open quick booking / etc). */
    handledAt: timestamp('handled_at', { withTimezone: true }),
    handledByAdminId: uuid('handled_by_admin_id').references(() => admins.id, {
      onDelete: 'set null',
    }),
    /** One of CALL_CLICK_HANDLED_ACTIONS. */
    handledAction: text('handled_action'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('call_click_events_created_at_idx').on(t.createdAt),
    index('call_click_events_source_page_idx').on(t.sourcePage),
    index('call_click_events_quote_id_idx').on(t.quoteId),
    index('call_click_events_booking_id_idx').on(t.bookingId),
    index('call_click_events_handled_at_idx').on(t.handledAt),
  ],
);

/* -------------------------------------------------------------------------- */
/* Emergency assist events — lightweight pre-booking lead signal              */
/* -------------------------------------------------------------------------- */

export const emergencyAssistStatusEnum = pgEnum('emergency_assist_status', [
  'NEW',
  'ACKNOWLEDGED',
  'CONTINUED_TO_LOCATION',
  'CONVERTED_TO_QUOTE',
  'EXPIRED',
]);

export const emergencyAssistEvents = pgTable(
  'emergency_assist_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    anonymousSessionId: varchar('anonymous_session_id', { length: 160 }),
    quoteProgressId: varchar('quote_progress_id', { length: 160 }),
    visitorId: uuid('visitor_id').references(() => liveVisitors.id, { onDelete: 'set null' }),
    source: varchar('source', { length: 64 }).notNull().default('QUOTE_EMERGENCY_BUTTON'),
    page: varchar('page', { length: 240 }).notNull().default('/quote'),
    status: emergencyAssistStatusEnum('status').notNull().default('NEW'),
    vehicleRegistration: varchar('vehicle_registration', { length: 32 }),
    tyreProblemType: tyreProblemTypeEnum('tyre_problem_type'),
    jobType: quoteJobTypeEnum('job_type'),
    customerPhone: varchar('customer_phone', { length: 32 }),
    locationLabel: varchar('location_label', { length: 240 }),
    latitude: numeric('latitude', { precision: 10, scale: 7 }),
    longitude: numeric('longitude', { precision: 10, scale: 7 }),
    locationConfidence: varchar('location_confidence', { length: 32 }),
    userAgent: text('user_agent'),
    referrer: text('referrer'),
    metadata: jsonb('metadata').notNull().default(sql`'{}'::jsonb`),
    acknowledgedAt: timestamp('acknowledged_at', { withTimezone: true }),
    acknowledgedByAdminId: uuid('acknowledged_by_admin_id').references(() => admins.id, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('emergency_assist_events_status_idx').on(t.status),
    index('emergency_assist_events_created_at_idx').on(t.createdAt),
    index('emergency_assist_events_phone_idx').on(t.customerPhone),
  ],
);

export const appSettings = pgTable(
  'app_settings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    key: varchar('key', { length: 120 }).notNull().unique(),
    value: jsonb('value').notNull(),
    description: text('description'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('app_settings_key_unique_idx').on(t.key)],
);

/* -------------------------------------------------------------------------- */
/* Audit logs (Final Safety Pack — Bundle A)                                  */
/* -------------------------------------------------------------------------- */

export const auditLogs = pgTable(
  'audit_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    actorType: varchar('actor_type', { length: 32 }).notNull(),
    actorAdminId: uuid('actor_admin_id').references(() => admins.id, {
      onDelete: 'set null',
    }),
    actorLabel: varchar('actor_label', { length: 160 }),
    action: varchar('action', { length: 120 }).notNull(),
    entityType: varchar('entity_type', { length: 80 }).notNull(),
    entityId: uuid('entity_id'),
    bookingId: uuid('booking_id').references(() => bookings.id, { onDelete: 'set null' }),
    paymentId: uuid('payment_id').references(() => payments.id, { onDelete: 'set null' }),
    adjustmentId: uuid('adjustment_id').references(() => bookingAdjustments.id, {
      onDelete: 'set null',
    }),
    stockId: uuid('stock_id').references(() => stock.id, { onDelete: 'set null' }),
    callbackRequestId: uuid('callback_request_id').references(() => callbackRequests.id, {
      onDelete: 'set null',
    }),
    before: jsonb('before'),
    after: jsonb('after'),
    metadata: jsonb('metadata').notNull().default(sql`'{}'::jsonb`),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('audit_logs_actor_type_idx').on(t.actorType),
    index('audit_logs_actor_admin_id_idx').on(t.actorAdminId),
    index('audit_logs_action_idx').on(t.action),
    index('audit_logs_entity_type_idx').on(t.entityType),
    index('audit_logs_entity_id_idx').on(t.entityId),
    index('audit_logs_booking_id_idx').on(t.bookingId),
    index('audit_logs_payment_id_idx').on(t.paymentId),
    index('audit_logs_adjustment_id_idx').on(t.adjustmentId),
    index('audit_logs_stock_id_idx').on(t.stockId),
    index('audit_logs_created_at_idx').on(t.createdAt),
  ],
);

/* -------------------------------------------------------------------------- */
/* Booking cancellations (Final Safety Pack — Bundle B)                       */
/* -------------------------------------------------------------------------- */

export const bookingCancellations = pgTable(
  'booking_cancellations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    bookingId: uuid('booking_id')
      .notNull()
      .references(() => bookings.id, { onDelete: 'cascade' }),
    cancelledByAdminId: uuid('cancelled_by_admin_id').references(() => admins.id, {
      onDelete: 'set null',
    }),
    reason: varchar('reason', { length: 160 }).notNull(),
    stage: varchar('stage', { length: 64 }).notNull(),
    depositDecision: varchar('deposit_decision', { length: 64 })
      .notNull()
      .default('not_applicable'),
    depositAmountGbp: numeric('deposit_amount_gbp', { precision: 10, scale: 2 }),
    retainedAmountGbp: numeric('retained_amount_gbp', { precision: 10, scale: 2 }),
    refundDueGbp: numeric('refund_due_gbp', { precision: 10, scale: 2 }),
    balanceDueGbp: numeric('balance_due_gbp', { precision: 10, scale: 2 }),
    customerMessage: text('customer_message'),
    internalNotes: text('internal_notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('booking_cancellations_booking_id_idx').on(t.bookingId),
    index('booking_cancellations_stage_idx').on(t.stage),
    index('booking_cancellations_deposit_decision_idx').on(t.depositDecision),
    index('booking_cancellations_created_at_idx').on(t.createdAt),
  ],
);

/* -------------------------------------------------------------------------- */
/* Admin Efficiency Pack F5 — Booking internal notes                          */
/* -------------------------------------------------------------------------- */

export const bookingInternalNotes = pgTable(
  'booking_internal_notes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    bookingId: uuid('booking_id')
      .notNull()
      .references(() => bookings.id, { onDelete: 'cascade' }),
    adminId: uuid('admin_id').references(() => admins.id, { onDelete: 'set null' }),
    noteType: varchar('note_type', { length: 32 }).notNull().default('GENERAL'),
    body: text('body').notNull(),
    pinned: boolean('pinned').notNull().default(false),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('booking_internal_notes_booking_id_idx').on(t.bookingId),
    index('booking_internal_notes_pinned_idx').on(t.pinned),
    index('booking_internal_notes_created_at_idx').on(t.createdAt),
  ],
);

/* -------------------------------------------------------------------------- */
/* Admin Efficiency Pack F8 — Customer risk notes (admin-only, by phone)      */
/* -------------------------------------------------------------------------- */

export const customerRiskNotes = pgTable(
  'customer_risk_notes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    customerPhone: varchar('customer_phone', { length: 32 }).notNull(),
    customerId: uuid('customer_id').references(() => customers.id, { onDelete: 'set null' }),
    noteType: varchar('note_type', { length: 40 }).notNull().default('GENERAL_NOTE'),
    body: text('body').notNull(),
    createdByAdminId: uuid('created_by_admin_id').references(() => admins.id, {
      onDelete: 'set null',
    }),
    archivedAt: timestamp('archived_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('customer_risk_notes_phone_idx').on(t.customerPhone),
    index('customer_risk_notes_customer_id_idx').on(t.customerId),
    index('customer_risk_notes_created_at_idx').on(t.createdAt),
  ],
);

/* -------------------------------------------------------------------------- */
/* Action queue items — persistent admin work queue (Cmd 2)                   */
/*                                                                            */
/* Backs the Android admin Action Queue with rows that have explicit lifecycle*/
/* (OPEN / REVIEWED / DISMISSED) and dedupe so repeat saves of the same       */
/* booking do not spam the queue.                                             */
/*                                                                            */
/* `type` mirrors the TypeScript union ActionQueueItemType (see               */
/* apps/web/src/lib/action-queue/types.ts). Stored as text instead of an      */
/* enum so adding new types does not require a migration.                     */
/* -------------------------------------------------------------------------- */

export const actionQueueItems = pgTable(
  'action_queue_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    type: varchar('type', { length: 64 }).notNull(),
    bookingId: uuid('booking_id').references(() => bookings.id, { onDelete: 'cascade' }),
    referenceId: text('reference_id'),
    title: text('title').notNull(),
    reasons: jsonb('reasons').notNull().default(sql`'[]'::jsonb`),
    suggestedPayment: varchar('suggested_payment', { length: 32 }),
    recommendedNextSteps: jsonb('recommended_next_steps').notNull().default(sql`'[]'::jsonb`),
    status: varchar('status', { length: 16 }).notNull().default('OPEN'),
    /**
     * Stable dedupe key for this item (e.g. `pricing_review:${bookingId}`).
     * Combined with the partial unique index below, guarantees at most one
     * OPEN item per logical source.
     */
    dedupeKey: text('dedupe_key'),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
    reviewedBy: uuid('reviewed_by').references(() => admins.id, { onDelete: 'set null' }),
    reviewNote: text('review_note'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('action_queue_items_type_idx').on(t.type),
    index('action_queue_items_status_idx').on(t.status),
    index('action_queue_items_booking_id_idx').on(t.bookingId),
    index('action_queue_items_updated_at_idx').on(t.updatedAt),
    uniqueIndex('action_queue_items_open_dedupe_unique_idx')
      .on(t.dedupeKey)
      .where(sql`${t.status} = 'OPEN' AND ${t.dedupeKey} IS NOT NULL`),
  ],
);

/* -------------------------------------------------------------------------- */
/* Inferred types                                                             */
/* -------------------------------------------------------------------------- */

export type Admin = InferSelectModel<typeof admins>;
export type NewAdmin = InferInsertModel<typeof admins>;

export type TyreCatalogItem = InferSelectModel<typeof tyreCatalog>;
export type NewTyreCatalogItem = InferInsertModel<typeof tyreCatalog>;

export type StockItem = InferSelectModel<typeof stock>;
export type NewStockItem = InferInsertModel<typeof stock>;

export type Customer = InferSelectModel<typeof customers>;
export type NewCustomer = InferInsertModel<typeof customers>;

export type CustomerLocation = InferSelectModel<typeof customerLocations>;
export type NewCustomerLocation = InferInsertModel<typeof customerLocations>;

export type Quote = InferSelectModel<typeof quotes>;
export type NewQuote = InferInsertModel<typeof quotes>;

export type Booking = InferSelectModel<typeof bookings>;
export type NewBooking = InferInsertModel<typeof bookings>;

export type BookingEvent = InferSelectModel<typeof bookingEvents>;
export type NewBookingEvent = InferInsertModel<typeof bookingEvents>;

export type Payment = InferSelectModel<typeof payments>;
export type NewPayment = InferInsertModel<typeof payments>;

export type PricingRule = InferSelectModel<typeof pricingRules>;
export type NewPricingRule = InferInsertModel<typeof pricingRules>;

export type PricingOverride = InferSelectModel<typeof pricingOverrides>;
export type NewPricingOverride = InferInsertModel<typeof pricingOverrides>;

export type LiveVisitor = InferSelectModel<typeof liveVisitors>;
export type NewLiveVisitor = InferInsertModel<typeof liveVisitors>;

export type VisitorEvent = InferSelectModel<typeof visitorEvents>;
export type NewVisitorEvent = InferInsertModel<typeof visitorEvents>;

export type NotificationPreference = InferSelectModel<typeof notificationPreferences>;
export type NewNotificationPreference = InferInsertModel<typeof notificationPreferences>;

export type PushToken = InferSelectModel<typeof pushTokens>;
export type NewPushToken = InferInsertModel<typeof pushTokens>;

export type AppSetting = InferSelectModel<typeof appSettings>;
export type NewAppSetting = InferInsertModel<typeof appSettings>;

export type CallbackRequest = InferSelectModel<typeof callbackRequests>;
export type NewCallbackRequest = InferInsertModel<typeof callbackRequests>;

export type BookingAdjustment = InferSelectModel<typeof bookingAdjustments>;
export type NewBookingAdjustment = InferInsertModel<typeof bookingAdjustments>;

export type AdminReminder = InferSelectModel<typeof adminReminders>;
export type NewAdminReminder = InferInsertModel<typeof adminReminders>;

export type AdminNotification = InferSelectModel<typeof adminNotifications>;
export type NewAdminNotification = InferInsertModel<typeof adminNotifications>;

export type StockNote = InferSelectModel<typeof stockNotes>;
export type NewStockNote = InferInsertModel<typeof stockNotes>;

export type CallClickEvent = InferSelectModel<typeof callClickEvents>;
export type NewCallClickEvent = InferInsertModel<typeof callClickEvents>;

export type AuditLog = InferSelectModel<typeof auditLogs>;
export type NewAuditLog = InferInsertModel<typeof auditLogs>;

export type BookingCancellation = InferSelectModel<typeof bookingCancellations>;
export type NewBookingCancellation = InferInsertModel<typeof bookingCancellations>;

export type BookingInternalNote = InferSelectModel<typeof bookingInternalNotes>;
export type NewBookingInternalNote = InferInsertModel<typeof bookingInternalNotes>;

export type CustomerRiskNote = InferSelectModel<typeof customerRiskNotes>;
export type NewCustomerRiskNote = InferInsertModel<typeof customerRiskNotes>;

export type EmergencyAssistEvent = InferSelectModel<typeof emergencyAssistEvents>;
export type NewEmergencyAssistEvent = InferInsertModel<typeof emergencyAssistEvents>;
