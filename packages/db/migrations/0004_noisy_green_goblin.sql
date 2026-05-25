CREATE TYPE "public"."fitting_method" AS ENUM('GARAGE', 'HOME');--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "fitting_method" "fitting_method";--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "quantity" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "scheduled_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "slot_label" varchar(40);--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "is_backorder" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "backorder_eta_days" integer;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "fitting_fee_gbp" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "distance_fee_gbp" numeric(10, 2);--> statement-breakpoint
CREATE INDEX "bookings_fitting_method_idx" ON "bookings" USING btree ("fitting_method");--> statement-breakpoint
CREATE INDEX "bookings_scheduled_at_idx" ON "bookings" USING btree ("scheduled_at");--> statement-breakpoint
CREATE INDEX "bookings_is_backorder_idx" ON "bookings" USING btree ("is_backorder");--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_quantity_positive" CHECK ("bookings"."quantity" > 0);--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_backorder_eta_non_negative" CHECK ("bookings"."backorder_eta_days" IS NULL OR "bookings"."backorder_eta_days" >= 0);--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_fitting_fee_non_negative" CHECK ("bookings"."fitting_fee_gbp" IS NULL OR "bookings"."fitting_fee_gbp" >= 0);--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_distance_fee_non_negative" CHECK ("bookings"."distance_fee_gbp" IS NULL OR "bookings"."distance_fee_gbp" >= 0);