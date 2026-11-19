CREATE TABLE "push_receipts" (
	"ticket_id" text PRIMARY KEY NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "push_receipts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE INDEX "push_receipts_created_at_index" ON "push_receipts" USING btree ("created_at");