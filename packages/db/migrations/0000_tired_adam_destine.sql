CREATE TYPE "public"."admin_role" AS ENUM('owner', 'admin');--> statement-breakpoint
CREATE TYPE "public"."booking_status" AS ENUM('pending_payment', 'confirmed', 'dispatching', 'dispatched', 'on_site', 'completed', 'cancelled', 'refunded', 'failed');--> statement-breakpoint
CREATE TYPE "public"."location_capture_method" AS ENUM('manual_address', 'mapbox_autocomplete', 'sms_link', 'email_link', 'browser_geolocation');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('unpaid', 'requires_payment_method', 'requires_action', 'processing', 'succeeded', 'failed', 'cancelled', 'refunded');--> statement-breakpoint
CREATE TYPE "public"."pricing_override_status" AS ENUM('active', 'inactive', 'expired');--> statement-breakpoint
CREATE TYPE "public"."pricing_override_type" AS ENUM('surge', 'discount');--> statement-breakpoint
CREATE TYPE "public"."pricing_rule_key" AS ENUM('time_night', 'time_peak_morning', 'weather_moderate', 'weather_severe', 'date_weekend', 'date_bank_holiday', 'distance_free_miles', 'distance_per_mile_gbp', 'demand_open_jobs_threshold', 'demand_high_multiplier', 'vat_rate');--> statement-breakpoint
CREATE TYPE "public"."tyre_tier" AS ENUM('budget', 'mid_range', 'premium');--> statement-breakpoint
CREATE TYPE "public"."tyre_type" AS ENUM('summer', 'winter', 'all_season', 'run_flat', 'commercial');--> statement-breakpoint
CREATE TYPE "public"."visitor_event_type" AS ENUM('page_view', 'quote_started', 'quote_step_changed', 'cart_updated', 'checkout_started', 'booking_completed');--> statement-breakpoint
CREATE TABLE "admins" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(320) NOT NULL,
	"password_hash" text NOT NULL,
	"full_name" varchar(160) NOT NULL,
	"role" "admin_role" DEFAULT 'owner' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_login_at" timestamp with time zone,
	"password_reset_token_hash" text,
	"password_reset_expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "admins_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "app_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" varchar(120) NOT NULL,
	"value" jsonb NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "app_settings_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "booking_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booking_id" uuid NOT NULL,
	"from_status" "booking_status",
	"to_status" "booking_status" NOT NULL,
	"message" text,
	"created_by_admin_id" uuid,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bookings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tracking_id" varchar(9) NOT NULL,
	"quote_id" uuid,
	"customer_id" uuid NOT NULL,
	"location_id" uuid,
	"tyre_id" uuid,
	"status" "booking_status" DEFAULT 'pending_payment' NOT NULL,
	"payment_status" "payment_status" DEFAULT 'unpaid' NOT NULL,
	"customer_notes" text,
	"admin_notes" text,
	"emergency_detected_at" timestamp with time zone DEFAULT now() NOT NULL,
	"confirmed_at" timestamp with time zone,
	"dispatched_at" timestamp with time zone,
	"on_site_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"refunded_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bookings_tracking_id_unique" UNIQUE("tracking_id"),
	CONSTRAINT "bookings_tracking_id_format" CHECK ("bookings"."tracking_id" ~ '^TR-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$')
);
--> statement-breakpoint
CREATE TABLE "customer_locations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" uuid,
	"capture_method" "location_capture_method" NOT NULL,
	"address_line1" varchar(240),
	"address_line2" varchar(240),
	"city" varchar(120),
	"postcode" varchar(20),
	"country" varchar(80) DEFAULT 'United Kingdom' NOT NULL,
	"latitude" numeric(10, 7),
	"longitude" numeric(10, 7),
	"mapbox_place_id" varchar(160),
	"accuracy_meters" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "customer_locations_latitude_range" CHECK ("customer_locations"."latitude" IS NULL OR ("customer_locations"."latitude" >= -90 AND "customer_locations"."latitude" <= 90)),
	CONSTRAINT "customer_locations_longitude_range" CHECK ("customer_locations"."longitude" IS NULL OR ("customer_locations"."longitude" >= -180 AND "customer_locations"."longitude" <= 180))
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"full_name" varchar(160) NOT NULL,
	"email" varchar(320),
	"phone" varchar(32) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "live_visitors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"visitor_token_hash" varchar(128) NOT NULL,
	"consent_given" boolean DEFAULT false NOT NULL,
	"current_page" varchar(240),
	"approx_city" varchar(120),
	"approx_region" varchar(120),
	"approx_country" varchar(120),
	"latitude_approx" numeric(10, 7),
	"longitude_approx" numeric(10, 7),
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "live_visitors_visitor_token_hash_unique" UNIQUE("visitor_token_hash")
);
--> statement-breakpoint
CREATE TABLE "notification_preferences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"admin_id" uuid NOT NULL,
	"push_enabled" boolean DEFAULT true NOT NULL,
	"sound_enabled" boolean DEFAULT true NOT NULL,
	"booking_alerts_enabled" boolean DEFAULT true NOT NULL,
	"stock_alerts_enabled" boolean DEFAULT true NOT NULL,
	"pricing_alerts_enabled" boolean DEFAULT true NOT NULL,
	"visitor_alerts_enabled" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booking_id" uuid,
	"quote_id" uuid,
	"stripe_payment_intent_id" varchar(255) NOT NULL,
	"stripe_customer_id" varchar(255),
	"amount_gbp" numeric(10, 2) NOT NULL,
	"vat_amount_gbp" numeric(10, 2) NOT NULL,
	"currency" varchar(3) DEFAULT 'gbp' NOT NULL,
	"status" "payment_status" DEFAULT 'processing' NOT NULL,
	"raw_stripe_event" jsonb,
	"paid_at" timestamp with time zone,
	"failed_at" timestamp with time zone,
	"refunded_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payments_stripe_payment_intent_id_unique" UNIQUE("stripe_payment_intent_id"),
	CONSTRAINT "payments_amount_non_negative" CHECK ("payments"."amount_gbp" >= 0),
	CONSTRAINT "payments_vat_non_negative" CHECK ("payments"."vat_amount_gbp" >= 0),
	CONSTRAINT "payments_currency_gbp" CHECK ("payments"."currency" = 'gbp')
);
--> statement-breakpoint
CREATE TABLE "pricing_overrides" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" "pricing_override_type" NOT NULL,
	"status" "pricing_override_status" DEFAULT 'active' NOT NULL,
	"label" varchar(160) NOT NULL,
	"multiplier" numeric(10, 4) NOT NULL,
	"reason" text,
	"starts_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone,
	"created_by_admin_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pricing_overrides_multiplier_positive" CHECK ("pricing_overrides"."multiplier" > 0)
);
--> statement-breakpoint
CREATE TABLE "pricing_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" "pricing_rule_key" NOT NULL,
	"label" varchar(160) NOT NULL,
	"description" text,
	"numeric_value" numeric(10, 4) NOT NULL,
	"is_multiplier" boolean DEFAULT true NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pricing_rules_key_unique" UNIQUE("key"),
	CONSTRAINT "pricing_rules_numeric_non_negative" CHECK ("pricing_rules"."numeric_value" >= 0)
);
--> statement-breakpoint
CREATE TABLE "push_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"admin_id" uuid NOT NULL,
	"expo_push_token" varchar(255) NOT NULL,
	"platform" varchar(32) DEFAULT 'android' NOT NULL,
	"device_name" varchar(160),
	"is_active" boolean DEFAULT true NOT NULL,
	"last_seen_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "push_tokens_expo_push_token_unique" UNIQUE("expo_push_token")
);
--> statement-breakpoint
CREATE TABLE "quotes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" uuid,
	"location_id" uuid,
	"tyre_id" uuid,
	"vehicle_registration" varchar(16),
	"vehicle_make" varchar(80),
	"vehicle_model" varchar(120),
	"vehicle_year" integer,
	"base_price_gbp" numeric(10, 2) NOT NULL,
	"final_price_gbp" numeric(10, 2) NOT NULL,
	"vat_amount_gbp" numeric(10, 2) NOT NULL,
	"total_price_gbp" numeric(10, 2) NOT NULL,
	"distance_miles" numeric(8, 2),
	"pricing_breakdown" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "quotes_base_price_non_negative" CHECK ("quotes"."base_price_gbp" >= 0),
	CONSTRAINT "quotes_final_price_non_negative" CHECK ("quotes"."final_price_gbp" >= 0),
	CONSTRAINT "quotes_vat_non_negative" CHECK ("quotes"."vat_amount_gbp" >= 0),
	CONSTRAINT "quotes_total_non_negative" CHECK ("quotes"."total_price_gbp" >= 0),
	CONSTRAINT "quotes_distance_non_negative" CHECK ("quotes"."distance_miles" IS NULL OR "quotes"."distance_miles" >= 0)
);
--> statement-breakpoint
CREATE TABLE "stock" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tyre_id" uuid NOT NULL,
	"quantity_available" integer DEFAULT 0 NOT NULL,
	"low_stock_threshold" integer DEFAULT 2 NOT NULL,
	"reserved_quantity" integer DEFAULT 0 NOT NULL,
	"location_name" varchar(120) DEFAULT 'Glasgow HQ' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "stock_quantity_available_non_negative" CHECK ("stock"."quantity_available" >= 0),
	CONSTRAINT "stock_reserved_non_negative" CHECK ("stock"."reserved_quantity" >= 0),
	CONSTRAINT "stock_low_threshold_non_negative" CHECK ("stock"."low_stock_threshold" >= 0),
	CONSTRAINT "stock_reserved_lte_available" CHECK ("stock"."reserved_quantity" <= "stock"."quantity_available")
);
--> statement-breakpoint
CREATE TABLE "tyre_catalog" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sku" varchar(64) NOT NULL,
	"brand" varchar(120) NOT NULL,
	"model" varchar(160) NOT NULL,
	"width" integer NOT NULL,
	"profile" integer NOT NULL,
	"rim" integer NOT NULL,
	"size_label" varchar(32) NOT NULL,
	"speed_rating" varchar(8) NOT NULL,
	"load_index" varchar(8) NOT NULL,
	"tier" "tyre_tier" NOT NULL,
	"type" "tyre_type" DEFAULT 'summer' NOT NULL,
	"base_price_gbp" numeric(10, 2) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tyre_catalog_sku_unique" UNIQUE("sku"),
	CONSTRAINT "tyre_catalog_width_positive" CHECK ("tyre_catalog"."width" > 0),
	CONSTRAINT "tyre_catalog_profile_positive" CHECK ("tyre_catalog"."profile" > 0),
	CONSTRAINT "tyre_catalog_rim_positive" CHECK ("tyre_catalog"."rim" > 0),
	CONSTRAINT "tyre_catalog_base_price_positive" CHECK ("tyre_catalog"."base_price_gbp" > 0)
);
--> statement-breakpoint
CREATE TABLE "visitor_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"visitor_id" uuid,
	"type" "visitor_event_type" NOT NULL,
	"page" varchar(240),
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "booking_events" ADD CONSTRAINT "booking_events_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_events" ADD CONSTRAINT "booking_events_created_by_admin_id_admins_id_fk" FOREIGN KEY ("created_by_admin_id") REFERENCES "public"."admins"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_quote_id_quotes_id_fk" FOREIGN KEY ("quote_id") REFERENCES "public"."quotes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_location_id_customer_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."customer_locations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_tyre_id_tyre_catalog_id_fk" FOREIGN KEY ("tyre_id") REFERENCES "public"."tyre_catalog"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_locations" ADD CONSTRAINT "customer_locations_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_admin_id_admins_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."admins"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_quote_id_quotes_id_fk" FOREIGN KEY ("quote_id") REFERENCES "public"."quotes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pricing_overrides" ADD CONSTRAINT "pricing_overrides_created_by_admin_id_admins_id_fk" FOREIGN KEY ("created_by_admin_id") REFERENCES "public"."admins"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push_tokens" ADD CONSTRAINT "push_tokens_admin_id_admins_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."admins"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_location_id_customer_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."customer_locations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_tyre_id_tyre_catalog_id_fk" FOREIGN KEY ("tyre_id") REFERENCES "public"."tyre_catalog"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock" ADD CONSTRAINT "stock_tyre_id_tyre_catalog_id_fk" FOREIGN KEY ("tyre_id") REFERENCES "public"."tyre_catalog"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visitor_events" ADD CONSTRAINT "visitor_events_visitor_id_live_visitors_id_fk" FOREIGN KEY ("visitor_id") REFERENCES "public"."live_visitors"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "admins_email_unique_idx" ON "admins" USING btree ("email");--> statement-breakpoint
CREATE INDEX "admins_is_active_idx" ON "admins" USING btree ("is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "app_settings_key_unique_idx" ON "app_settings" USING btree ("key");--> statement-breakpoint
CREATE INDEX "booking_events_booking_id_idx" ON "booking_events" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX "booking_events_to_status_idx" ON "booking_events" USING btree ("to_status");--> statement-breakpoint
CREATE INDEX "booking_events_created_at_idx" ON "booking_events" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "bookings_tracking_id_unique_idx" ON "bookings" USING btree ("tracking_id");--> statement-breakpoint
CREATE INDEX "bookings_status_idx" ON "bookings" USING btree ("status");--> statement-breakpoint
CREATE INDEX "bookings_payment_status_idx" ON "bookings" USING btree ("payment_status");--> statement-breakpoint
CREATE INDEX "bookings_customer_id_idx" ON "bookings" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "bookings_created_at_idx" ON "bookings" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "bookings_emergency_detected_at_idx" ON "bookings" USING btree ("emergency_detected_at");--> statement-breakpoint
CREATE INDEX "customer_locations_customer_id_idx" ON "customer_locations" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "customer_locations_postcode_idx" ON "customer_locations" USING btree ("postcode");--> statement-breakpoint
CREATE INDEX "customer_locations_lat_lng_idx" ON "customer_locations" USING btree ("latitude","longitude");--> statement-breakpoint
CREATE INDEX "customers_phone_idx" ON "customers" USING btree ("phone");--> statement-breakpoint
CREATE INDEX "customers_email_idx" ON "customers" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "live_visitors_token_hash_unique_idx" ON "live_visitors" USING btree ("visitor_token_hash");--> statement-breakpoint
CREATE INDEX "live_visitors_consent_given_idx" ON "live_visitors" USING btree ("consent_given");--> statement-breakpoint
CREATE INDEX "live_visitors_last_seen_at_idx" ON "live_visitors" USING btree ("last_seen_at");--> statement-breakpoint
CREATE UNIQUE INDEX "notification_preferences_admin_id_unique_idx" ON "notification_preferences" USING btree ("admin_id");--> statement-breakpoint
CREATE UNIQUE INDEX "payments_stripe_pi_unique_idx" ON "payments" USING btree ("stripe_payment_intent_id");--> statement-breakpoint
CREATE INDEX "payments_booking_id_idx" ON "payments" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX "payments_quote_id_idx" ON "payments" USING btree ("quote_id");--> statement-breakpoint
CREATE INDEX "payments_status_idx" ON "payments" USING btree ("status");--> statement-breakpoint
CREATE INDEX "pricing_overrides_status_idx" ON "pricing_overrides" USING btree ("status");--> statement-breakpoint
CREATE INDEX "pricing_overrides_type_idx" ON "pricing_overrides" USING btree ("type");--> statement-breakpoint
CREATE INDEX "pricing_overrides_starts_at_idx" ON "pricing_overrides" USING btree ("starts_at");--> statement-breakpoint
CREATE INDEX "pricing_overrides_expires_at_idx" ON "pricing_overrides" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "pricing_rules_key_unique_idx" ON "pricing_rules" USING btree ("key");--> statement-breakpoint
CREATE INDEX "pricing_rules_is_active_idx" ON "pricing_rules" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "pricing_rules_sort_order_idx" ON "pricing_rules" USING btree ("sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "push_tokens_expo_token_unique_idx" ON "push_tokens" USING btree ("expo_push_token");--> statement-breakpoint
CREATE INDEX "push_tokens_admin_id_idx" ON "push_tokens" USING btree ("admin_id");--> statement-breakpoint
CREATE INDEX "push_tokens_is_active_idx" ON "push_tokens" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "quotes_customer_id_idx" ON "quotes" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "quotes_location_id_idx" ON "quotes" USING btree ("location_id");--> statement-breakpoint
CREATE INDEX "quotes_tyre_id_idx" ON "quotes" USING btree ("tyre_id");--> statement-breakpoint
CREATE INDEX "quotes_vehicle_registration_idx" ON "quotes" USING btree ("vehicle_registration");--> statement-breakpoint
CREATE INDEX "quotes_created_at_idx" ON "quotes" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "stock_tyre_id_unique_idx" ON "stock" USING btree ("tyre_id");--> statement-breakpoint
CREATE INDEX "stock_quantity_available_idx" ON "stock" USING btree ("quantity_available");--> statement-breakpoint
CREATE UNIQUE INDEX "tyre_catalog_sku_unique_idx" ON "tyre_catalog" USING btree ("sku");--> statement-breakpoint
CREATE INDEX "tyre_catalog_size_label_idx" ON "tyre_catalog" USING btree ("size_label");--> statement-breakpoint
CREATE INDEX "tyre_catalog_tier_idx" ON "tyre_catalog" USING btree ("tier");--> statement-breakpoint
CREATE INDEX "tyre_catalog_type_idx" ON "tyre_catalog" USING btree ("type");--> statement-breakpoint
CREATE INDEX "tyre_catalog_is_active_idx" ON "tyre_catalog" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "tyre_catalog_size_idx" ON "tyre_catalog" USING btree ("width","profile","rim");--> statement-breakpoint
CREATE INDEX "visitor_events_visitor_id_idx" ON "visitor_events" USING btree ("visitor_id");--> statement-breakpoint
CREATE INDEX "visitor_events_type_idx" ON "visitor_events" USING btree ("type");--> statement-breakpoint
CREATE INDEX "visitor_events_created_at_idx" ON "visitor_events" USING btree ("created_at");