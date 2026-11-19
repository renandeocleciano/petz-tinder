CREATE TYPE "public"."interest" AS ENUM('play', 'walks', 'beach', 'treats', 'other_pets', 'adventures');--> statement-breakpoint
CREATE TYPE "public"."personality_trait" AS ENUM('playful', 'calm', 'sociable', 'loves_park', 'energetic', 'shy');--> statement-breakpoint
CREATE TYPE "public"."pet_gender" AS ENUM('male', 'female');--> statement-breakpoint
CREATE TYPE "public"."pet_size" AS ENUM('small', 'medium', 'large');--> statement-breakpoint
CREATE TYPE "public"."pet_status" AS ENUM('active', 'hidden', 'suspended');--> statement-breakpoint
CREATE TYPE "public"."species" AS ENUM('dog', 'cat', 'other');--> statement-breakpoint
CREATE TABLE "pet_interests" (
	"pet_id" uuid NOT NULL,
	"interest" "interest" NOT NULL,
	CONSTRAINT "pet_interests_pet_id_interest_pk" PRIMARY KEY("pet_id","interest")
);
--> statement-breakpoint
ALTER TABLE "pet_interests" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "pet_photos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pet_id" uuid NOT NULL,
	"storage_path" text NOT NULL,
	"position" smallint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pet_photos_storagePath_unique" UNIQUE("storage_path")
);
--> statement-breakpoint
ALTER TABLE "pet_photos" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "pet_traits" (
	"pet_id" uuid NOT NULL,
	"trait" "personality_trait" NOT NULL,
	CONSTRAINT "pet_traits_pet_id_trait_pk" PRIMARY KEY("pet_id","trait")
);
--> statement-breakpoint
ALTER TABLE "pet_traits" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "pets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"name" varchar(50) NOT NULL,
	"species" "species" NOT NULL,
	"breed" varchar(80) NOT NULL,
	"birth_date" date NOT NULL,
	"birth_date_approximate" boolean DEFAULT false NOT NULL,
	"gender" "pet_gender" NOT NULL,
	"size" "pet_size" NOT NULL,
	"neutered" boolean NOT NULL,
	"bio" varchar(500) DEFAULT '' NOT NULL,
	"city" varchar(80) NOT NULL,
	"location" extensions.geography(Point, 4326) NOT NULL,
	"availability" jsonb,
	"preferences" text[] DEFAULT '{}'::text[] NOT NULL,
	"verified" boolean DEFAULT false NOT NULL,
	"status" "pet_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pets_preferences_max" CHECK (cardinality("pets"."preferences") <= 10)
);
--> statement-breakpoint
ALTER TABLE "pets" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "pet_interests" ADD CONSTRAINT "pet_interests_pet_id_pets_id_fk" FOREIGN KEY ("pet_id") REFERENCES "public"."pets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pet_photos" ADD CONSTRAINT "pet_photos_pet_id_pets_id_fk" FOREIGN KEY ("pet_id") REFERENCES "public"."pets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pet_traits" ADD CONSTRAINT "pet_traits_pet_id_pets_id_fk" FOREIGN KEY ("pet_id") REFERENCES "public"."pets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pets" ADD CONSTRAINT "pets_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "pet_photos_pet_id_position_index" ON "pet_photos" USING btree ("pet_id","position");--> statement-breakpoint
CREATE INDEX "pets_owner_id_index" ON "pets" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "pets_location_gist" ON "pets" USING gist ("location");