CREATE TYPE "public"."booking_attachment_type" AS ENUM('DAMAGE_PHOTO', 'TYRE_SIZE_PHOTO', 'LOCKING_NUT_PHOTO', 'AFTER_REPAIR_PHOTO', 'RECEIPT_PHOTO', 'OTHER');--> statement-breakpoint
ALTER TYPE "public"."admin_role" ADD VALUE 'dispatcher';--> statement-breakpoint
ALTER TYPE "public"."admin_role" ADD VALUE 'operator';--> statement-breakpoint
ALTER TYPE "public"."admin_role" ADD VALUE 'viewer';--> statement-breakpoint
CREATE TABLE "booking_attachments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booking_id" uuid NOT NULL,
	"uploaded_by_admin_id" uuid,
	"type" "booking_attachment_type" DEFAULT 'OTHER' NOT NULL,
	"file_url" text NOT NULL,
	"file_key" text,
	"mime_type" varchar(120) NOT NULL,
	"size_bytes" integer DEFAULT 0 NOT NULL,
	"caption" varchar(280),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "booking_attachments_size_non_negative" CHECK ("booking_attachments"."size_bytes" >= 0)
);
--> statement-breakpoint
ALTER TABLE "booking_attachments" ADD CONSTRAINT "booking_attachments_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_attachments" ADD CONSTRAINT "booking_attachments_uploaded_by_admin_id_admins_id_fk" FOREIGN KEY ("uploaded_by_admin_id") REFERENCES "public"."admins"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "booking_attachments_booking_id_idx" ON "booking_attachments" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX "booking_attachments_type_idx" ON "booking_attachments" USING btree ("type");--> statement-breakpoint
CREATE INDEX "booking_attachments_created_at_idx" ON "booking_attachments" USING btree ("created_at");