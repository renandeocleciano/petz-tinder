CREATE TYPE "public"."message_type" AS ENUM('text', 'image', 'playdate_invite');--> statement-breakpoint
CREATE TYPE "public"."playdate_status" AS ENUM('pending', 'accepted', 'declined');--> statement-breakpoint
CREATE TABLE "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"sender_pet_id" uuid NOT NULL,
	"sender_user_id" uuid NOT NULL,
	"type" "message_type" NOT NULL,
	"text" varchar(2000),
	"image_path" text,
	"playdate" jsonb,
	"playdate_status" "playdate_status",
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "messages_payload_matches_type" CHECK (case "messages"."type"
        when 'text' then "messages"."text" is not null
        when 'image' then "messages"."image_path" is not null
        when 'playdate_invite' then "messages"."playdate" is not null and "messages"."playdate_status" is not null
      end)
);
--> statement-breakpoint
ALTER TABLE "messages" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_pet_id_pets_id_fk" FOREIGN KEY ("sender_pet_id") REFERENCES "public"."pets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_user_id_users_id_fk" FOREIGN KEY ("sender_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "messages_conversation_id_created_at_index" ON "messages" USING btree ("conversation_id","created_at");