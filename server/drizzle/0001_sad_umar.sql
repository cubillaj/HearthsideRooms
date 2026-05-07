CREATE TYPE "public"."role" AS ENUM('super_admin', 'user');
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "role" "role" DEFAULT 'user' NOT NULL;
