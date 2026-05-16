CREATE INDEX "user_id_idx" ON "messageReads" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "message_id_idx" ON "messageReads" USING btree ("message_id");--> statement-breakpoint
CREATE INDEX "room_id_idx" ON "messages" USING btree ("room_id");--> statement-breakpoint
CREATE INDEX "created_at_idx" ON "messages" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "room_name_idx" ON "rooms" USING btree ("room_name");