ALTER TABLE "messageReads" DROP CONSTRAINT "messageReads_message_id_messages_id_fk";
--> statement-breakpoint
ALTER TABLE "messages" DROP CONSTRAINT "messages_room_id_rooms_id_fk";
--> statement-breakpoint
ALTER TABLE "room_member" DROP CONSTRAINT "room_member_room_id_rooms_id_fk";
--> statement-breakpoint
DROP INDEX "user_email_idx";--> statement-breakpoint
ALTER TABLE "messageReads" ADD CONSTRAINT "messageReads_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "room_member" ADD CONSTRAINT "room_member_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "users_status_idx" ON "users" USING btree ("status");--> statement-breakpoint
CREATE INDEX "users_created_at_idx" ON "users" USING btree ("created_at");