CREATE TYPE "public"."checkout_payment_mode" AS ENUM('FULL', 'DEPOSIT');--> statement-breakpoint
CREATE TYPE "public"."emergency_assist_status" AS ENUM('NEW', 'ACKNOWLEDGED', 'CONTINUED_TO_LOCATION', 'CONVERTED_TO_QUOTE', 'EXPIRED');--> statement-breakpoint
CREATE TYPE "public"."quote_job_type" AS ENUM('ASSESSMENT', 'REPLACEMENT');--> statement-breakpoint
CREATE TYPE "public"."tyre_problem_type" AS ENUM('PUNCTURE_OR_FLAT', 'DAMAGED_OR_BLOWN_OUT', 'SLOW_PRESSURE_LOSS', 'NEEDS_REPLACEMENT', 'NOT_SURE');--> statement-breakpoint
ALTER TYPE "public"."payment_status" ADD VALUE 'deposit_paid';--> statement-breakpoint
ALTER TYPE "public"."pricing_rule_key" ADD VALUE 'emergency_assessment_fee_gbp';--> statement-breakpoint
CREATE TABLE "admin_notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"admin_id" uuid,
	"type" varchar(100) NOT NULL,
	"priority" varchar(16) DEFAULT 'normal' NOT NULL,
	"title" varchar(160) NOT NULL,
	"body" text NOT NULL,
	"data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"booking_id" uuid,
	"tracking_id" varchar(16),
	"callback_request_id" uuid,
	"stock_id" uuid,
	"action_target" varchar(160),
	"read_at" timestamp with time zone,
	"handled_at" timestamp with time zone,
	"handled_by_admin_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "admin_reminders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"admin_id" uuid,
	"booking_id" uuid,
	"callback_request_id" uuid,
	"title" varchar(160) NOT NULL,
	"message" text,
	"remind_at" timestamp with time zone NOT NULL,
	"status" varchar(32) DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_type" varchar(32) NOT NULL,
	"actor_admin_id" uuid,
	"actor_label" varchar(160),
	"action" varchar(120) NOT NULL,
	"entity_type" varchar(80) NOT NULL,
	"entity_id" uuid,
	"booking_id" uuid,
	"payment_id" uuid,
	"adjustment_id" uuid,
	"stock_id" uuid,
	"callback_request_id" uuid,
	"before" jsonb,
	"after" jsonb,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "booking_adjustments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booking_id" uuid NOT NULL,
	"type" varchar(64) NOT NULL,
	"status" varchar(32) DEFAULT 'pending_payment' NOT NULL,
	"original_paid_amount_gbp" numeric(10, 2) DEFAULT '0.00' NOT NULL,
	"additional_amount_gbp" numeric(10, 2) DEFAULT '0.00' NOT NULL,
	"total_replacement_amount_gbp" numeric(10, 2) DEFAULT '0.00' NOT NULL,
	"tyre_id" uuid,
	"stripe_payment_intent_id" varchar(255),
	"payment_link_url" text,
	"notes" text,
	"created_by_admin_id" uuid,
	"paid_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "booking_adjustments_stripe_payment_intent_id_unique" UNIQUE("stripe_payment_intent_id"),
	CONSTRAINT "booking_adjustments_amounts_non_negative" CHECK ("booking_adjustments"."additional_amount_gbp" >= 0 AND "booking_adjustments"."original_paid_amount_gbp" >= 0 AND "booking_adjustments"."total_replacement_amount_gbp" >= 0)
);
--> statement-breakpoint
CREATE TABLE "booking_cancellations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booking_id" uuid NOT NULL,
	"cancelled_by_admin_id" uuid,
	"reason" varchar(160) NOT NULL,
	"stage" varchar(64) NOT NULL,
	"deposit_decision" varchar(64) DEFAULT 'not_applicable' NOT NULL,
	"deposit_amount_gbp" numeric(10, 2),
	"retained_amount_gbp" numeric(10, 2),
	"refund_due_gbp" numeric(10, 2),
	"balance_due_gbp" numeric(10, 2),
	"customer_message" text,
	"internal_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "booking_internal_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booking_id" uuid NOT NULL,
	"admin_id" uuid,
	"note_type" varchar(32) DEFAULT 'GENERAL' NOT NULL,
	"body" text NOT NULL,
	"pinned" boolean DEFAULT false NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "call_click_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" varchar(160),
	"source_page" varchar(240),
	"source_component" varchar(160),
	"quote_id" uuid,
	"booking_id" uuid,
	"phone" varchar(32),
	"customer_name" varchar(160),
	"tyre_problem_type" "tyre_problem_type",
	"job_type" "quote_job_type",
	"location_summary" varchar(240),
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "callback_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"full_name" varchar(160),
	"phone" varchar(32) NOT NULL,
	"email" varchar(320),
	"tyre_problem_type" "tyre_problem_type",
	"message" text,
	"source_page" varchar(160),
	"source" varchar(40),
	"location_label" varchar(240),
	"latitude" numeric(10, 7),
	"longitude" numeric(10, 7),
	"status" varchar(32) DEFAULT 'new' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customer_risk_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_phone" varchar(32) NOT NULL,
	"customer_id" uuid,
	"note_type" varchar(40) DEFAULT 'GENERAL_NOTE' NOT NULL,
	"body" text NOT NULL,
	"created_by_admin_id" uuid,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "emergency_assist_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"anonymous_session_id" varchar(160),
	"quote_progress_id" varchar(160),
	"visitor_id" uuid,
	"source" varchar(64) DEFAULT 'QUOTE_EMERGENCY_BUTTON' NOT NULL,
	"page" varchar(240) DEFAULT '/quote' NOT NULL,
	"status" "emergency_assist_status" DEFAULT 'NEW' NOT NULL,
	"vehicle_registration" varchar(32),
	"tyre_problem_type" "tyre_problem_type",
	"job_type" "quote_job_type",
	"customer_phone" varchar(32),
	"location_label" varchar(240),
	"latitude" numeric(10, 7),
	"longitude" numeric(10, 7),
	"user_agent" text,
	"referrer" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"acknowledged_at" timestamp with time zone,
	"acknowledged_by_admin_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stock_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"stock_id" uuid NOT NULL,
	"admin_id" uuid,
	"note" text NOT NULL,
	"status" varchar(32) DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "backup_tyre_id" uuid;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "job_type" "quote_job_type" DEFAULT 'REPLACEMENT' NOT NULL;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "tyre_problem_type" "tyre_problem_type";--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "assessment_fee_gbp" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "checkout_payment_mode" "checkout_payment_mode" DEFAULT 'FULL' NOT NULL;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "deposit_percentage" numeric(5, 4);--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "deposit_amount_gbp" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "balance_due_gbp" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "deposit_paid_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "customer_accepted_deposit_terms_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "stock_decremented_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "source" varchar(40);--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "payment_kind" varchar(32) DEFAULT 'full' NOT NULL;--> statement-breakpoint
ALTER TABLE "quotes" ADD COLUMN "job_type" "quote_job_type" DEFAULT 'REPLACEMENT' NOT NULL;--> statement-breakpoint
ALTER TABLE "quotes" ADD COLUMN "tyre_problem_type" "tyre_problem_type";--> statement-breakpoint
ALTER TABLE "quotes" ADD COLUMN "assessment_fee_gbp" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "quotes" ADD COLUMN "backup_tyre_id" uuid;--> statement-breakpoint
ALTER TABLE "quotes" ADD COLUMN "source" varchar(40);--> statement-breakpoint
ALTER TABLE "tyre_catalog" ADD COLUMN "fast_fit_available" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "admin_notifications" ADD CONSTRAINT "admin_notifications_admin_id_admins_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."admins"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_notifications" ADD CONSTRAINT "admin_notifications_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_notifications" ADD CONSTRAINT "admin_notifications_callback_request_id_callback_requests_id_fk" FOREIGN KEY ("callback_request_id") REFERENCES "public"."callback_requests"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_notifications" ADD CONSTRAINT "admin_notifications_stock_id_stock_id_fk" FOREIGN KEY ("stock_id") REFERENCES "public"."stock"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_notifications" ADD CONSTRAINT "admin_notifications_handled_by_admin_id_admins_id_fk" FOREIGN KEY ("handled_by_admin_id") REFERENCES "public"."admins"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_reminders" ADD CONSTRAINT "admin_reminders_admin_id_admins_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."admins"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_reminders" ADD CONSTRAINT "admin_reminders_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_reminders" ADD CONSTRAINT "admin_reminders_callback_request_id_callback_requests_id_fk" FOREIGN KEY ("callback_request_id") REFERENCES "public"."callback_requests"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_admin_id_admins_id_fk" FOREIGN KEY ("actor_admin_id") REFERENCES "public"."admins"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_adjustment_id_booking_adjustments_id_fk" FOREIGN KEY ("adjustment_id") REFERENCES "public"."booking_adjustments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_stock_id_stock_id_fk" FOREIGN KEY ("stock_id") REFERENCES "public"."stock"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_callback_request_id_callback_requests_id_fk" FOREIGN KEY ("callback_request_id") REFERENCES "public"."callback_requests"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_adjustments" ADD CONSTRAINT "booking_adjustments_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_adjustments" ADD CONSTRAINT "booking_adjustments_tyre_id_tyre_catalog_id_fk" FOREIGN KEY ("tyre_id") REFERENCES "public"."tyre_catalog"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_adjustments" ADD CONSTRAINT "booking_adjustments_created_by_admin_id_admins_id_fk" FOREIGN KEY ("created_by_admin_id") REFERENCES "public"."admins"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_cancellations" ADD CONSTRAINT "booking_cancellations_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_cancellations" ADD CONSTRAINT "booking_cancellations_cancelled_by_admin_id_admins_id_fk" FOREIGN KEY ("cancelled_by_admin_id") REFERENCES "public"."admins"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_internal_notes" ADD CONSTRAINT "booking_internal_notes_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_internal_notes" ADD CONSTRAINT "booking_internal_notes_admin_id_admins_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."admins"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "call_click_events" ADD CONSTRAINT "call_click_events_quote_id_quotes_id_fk" FOREIGN KEY ("quote_id") REFERENCES "public"."quotes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "call_click_events" ADD CONSTRAINT "call_click_events_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_risk_notes" ADD CONSTRAINT "customer_risk_notes_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_risk_notes" ADD CONSTRAINT "customer_risk_notes_created_by_admin_id_admins_id_fk" FOREIGN KEY ("created_by_admin_id") REFERENCES "public"."admins"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "emergency_assist_events" ADD CONSTRAINT "emergency_assist_events_visitor_id_live_visitors_id_fk" FOREIGN KEY ("visitor_id") REFERENCES "public"."live_visitors"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "emergency_assist_events" ADD CONSTRAINT "emergency_assist_events_acknowledged_by_admin_id_admins_id_fk" FOREIGN KEY ("acknowledged_by_admin_id") REFERENCES "public"."admins"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_notes" ADD CONSTRAINT "stock_notes_stock_id_stock_id_fk" FOREIGN KEY ("stock_id") REFERENCES "public"."stock"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_notes" ADD CONSTRAINT "stock_notes_admin_id_admins_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."admins"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "admin_notifications_admin_id_idx" ON "admin_notifications" USING btree ("admin_id");--> statement-breakpoint
CREATE INDEX "admin_notifications_type_idx" ON "admin_notifications" USING btree ("type");--> statement-breakpoint
CREATE INDEX "admin_notifications_priority_idx" ON "admin_notifications" USING btree ("priority");--> statement-breakpoint
CREATE INDEX "admin_notifications_read_at_idx" ON "admin_notifications" USING btree ("read_at");--> statement-breakpoint
CREATE INDEX "admin_notifications_handled_at_idx" ON "admin_notifications" USING btree ("handled_at");--> statement-breakpoint
CREATE INDEX "admin_notifications_booking_id_idx" ON "admin_notifications" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX "admin_notifications_callback_request_id_idx" ON "admin_notifications" USING btree ("callback_request_id");--> statement-breakpoint
CREATE INDEX "admin_notifications_stock_id_idx" ON "admin_notifications" USING btree ("stock_id");--> statement-breakpoint
CREATE INDEX "admin_notifications_created_at_idx" ON "admin_notifications" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "admin_reminders_admin_id_idx" ON "admin_reminders" USING btree ("admin_id");--> statement-breakpoint
CREATE INDEX "admin_reminders_booking_id_idx" ON "admin_reminders" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX "admin_reminders_status_idx" ON "admin_reminders" USING btree ("status");--> statement-breakpoint
CREATE INDEX "admin_reminders_remind_at_idx" ON "admin_reminders" USING btree ("remind_at");--> statement-breakpoint
CREATE INDEX "audit_logs_actor_type_idx" ON "audit_logs" USING btree ("actor_type");--> statement-breakpoint
CREATE INDEX "audit_logs_actor_admin_id_idx" ON "audit_logs" USING btree ("actor_admin_id");--> statement-breakpoint
CREATE INDEX "audit_logs_action_idx" ON "audit_logs" USING btree ("action");--> statement-breakpoint
CREATE INDEX "audit_logs_entity_type_idx" ON "audit_logs" USING btree ("entity_type");--> statement-breakpoint
CREATE INDEX "audit_logs_entity_id_idx" ON "audit_logs" USING btree ("entity_id");--> statement-breakpoint
CREATE INDEX "audit_logs_booking_id_idx" ON "audit_logs" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX "audit_logs_payment_id_idx" ON "audit_logs" USING btree ("payment_id");--> statement-breakpoint
CREATE INDEX "audit_logs_adjustment_id_idx" ON "audit_logs" USING btree ("adjustment_id");--> statement-breakpoint
CREATE INDEX "audit_logs_stock_id_idx" ON "audit_logs" USING btree ("stock_id");--> statement-breakpoint
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "booking_adjustments_booking_id_idx" ON "booking_adjustments" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX "booking_adjustments_status_idx" ON "booking_adjustments" USING btree ("status");--> statement-breakpoint
CREATE INDEX "booking_adjustments_type_idx" ON "booking_adjustments" USING btree ("type");--> statement-breakpoint
CREATE INDEX "booking_adjustments_created_at_idx" ON "booking_adjustments" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "booking_cancellations_booking_id_idx" ON "booking_cancellations" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX "booking_cancellations_stage_idx" ON "booking_cancellations" USING btree ("stage");--> statement-breakpoint
CREATE INDEX "booking_cancellations_deposit_decision_idx" ON "booking_cancellations" USING btree ("deposit_decision");--> statement-breakpoint
CREATE INDEX "booking_cancellations_created_at_idx" ON "booking_cancellations" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "booking_internal_notes_booking_id_idx" ON "booking_internal_notes" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX "booking_internal_notes_pinned_idx" ON "booking_internal_notes" USING btree ("pinned");--> statement-breakpoint
CREATE INDEX "booking_internal_notes_created_at_idx" ON "booking_internal_notes" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "call_click_events_created_at_idx" ON "call_click_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "call_click_events_source_page_idx" ON "call_click_events" USING btree ("source_page");--> statement-breakpoint
CREATE INDEX "call_click_events_quote_id_idx" ON "call_click_events" USING btree ("quote_id");--> statement-breakpoint
CREATE INDEX "call_click_events_booking_id_idx" ON "call_click_events" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX "callback_requests_phone_idx" ON "callback_requests" USING btree ("phone");--> statement-breakpoint
CREATE INDEX "callback_requests_status_idx" ON "callback_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "callback_requests_created_at_idx" ON "callback_requests" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "customer_risk_notes_phone_idx" ON "customer_risk_notes" USING btree ("customer_phone");--> statement-breakpoint
CREATE INDEX "customer_risk_notes_customer_id_idx" ON "customer_risk_notes" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "customer_risk_notes_created_at_idx" ON "customer_risk_notes" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "emergency_assist_events_status_idx" ON "emergency_assist_events" USING btree ("status");--> statement-breakpoint
CREATE INDEX "emergency_assist_events_created_at_idx" ON "emergency_assist_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "emergency_assist_events_phone_idx" ON "emergency_assist_events" USING btree ("customer_phone");--> statement-breakpoint
CREATE INDEX "stock_notes_stock_id_idx" ON "stock_notes" USING btree ("stock_id");--> statement-breakpoint
CREATE INDEX "stock_notes_status_idx" ON "stock_notes" USING btree ("status");--> statement-breakpoint
CREATE INDEX "stock_notes_created_at_idx" ON "stock_notes" USING btree ("created_at");--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_backup_tyre_id_tyre_catalog_id_fk" FOREIGN KEY ("backup_tyre_id") REFERENCES "public"."tyre_catalog"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_backup_tyre_id_tyre_catalog_id_fk" FOREIGN KEY ("backup_tyre_id") REFERENCES "public"."tyre_catalog"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "bookings_job_type_idx" ON "bookings" USING btree ("job_type");--> statement-breakpoint
CREATE INDEX "bookings_tyre_problem_type_idx" ON "bookings" USING btree ("tyre_problem_type");--> statement-breakpoint
CREATE INDEX "quotes_job_type_idx" ON "quotes" USING btree ("job_type");--> statement-breakpoint
CREATE INDEX "quotes_tyre_problem_type_idx" ON "quotes" USING btree ("tyre_problem_type");