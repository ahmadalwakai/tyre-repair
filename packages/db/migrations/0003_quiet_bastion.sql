CREATE TABLE "action_queue_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" varchar(64) NOT NULL,
	"booking_id" uuid,
	"reference_id" text,
	"title" text NOT NULL,
	"reasons" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"suggested_payment" varchar(32),
	"recommended_next_steps" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" varchar(16) DEFAULT 'OPEN' NOT NULL,
	"dedupe_key" text,
	"reviewed_at" timestamp with time zone,
	"reviewed_by" uuid,
	"review_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "call_click_events" ADD COLUMN "href" text;--> statement-breakpoint
ALTER TABLE "call_click_events" ADD COLUMN "referrer" text;--> statement-breakpoint
ALTER TABLE "call_click_events" ADD COLUMN "acknowledged_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "call_click_events" ADD COLUMN "acknowledged_by_admin_id" uuid;--> statement-breakpoint
ALTER TABLE "call_click_events" ADD COLUMN "handled_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "call_click_events" ADD COLUMN "handled_by_admin_id" uuid;--> statement-breakpoint
ALTER TABLE "call_click_events" ADD COLUMN "handled_action" text;--> statement-breakpoint
ALTER TABLE "emergency_assist_events" ADD COLUMN "location_confidence" varchar(32);--> statement-breakpoint
ALTER TABLE "action_queue_items" ADD CONSTRAINT "action_queue_items_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "action_queue_items" ADD CONSTRAINT "action_queue_items_reviewed_by_admins_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."admins"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "action_queue_items_type_idx" ON "action_queue_items" USING btree ("type");--> statement-breakpoint
CREATE INDEX "action_queue_items_status_idx" ON "action_queue_items" USING btree ("status");--> statement-breakpoint
CREATE INDEX "action_queue_items_booking_id_idx" ON "action_queue_items" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX "action_queue_items_updated_at_idx" ON "action_queue_items" USING btree ("updated_at");--> statement-breakpoint
CREATE UNIQUE INDEX "action_queue_items_open_dedupe_unique_idx" ON "action_queue_items" USING btree ("dedupe_key") WHERE "action_queue_items"."status" = 'OPEN' AND "action_queue_items"."dedupe_key" IS NOT NULL;--> statement-breakpoint
ALTER TABLE "call_click_events" ADD CONSTRAINT "call_click_events_acknowledged_by_admin_id_admins_id_fk" FOREIGN KEY ("acknowledged_by_admin_id") REFERENCES "public"."admins"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "call_click_events" ADD CONSTRAINT "call_click_events_handled_by_admin_id_admins_id_fk" FOREIGN KEY ("handled_by_admin_id") REFERENCES "public"."admins"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "call_click_events_handled_at_idx" ON "call_click_events" USING btree ("handled_at");