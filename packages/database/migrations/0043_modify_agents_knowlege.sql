ALTER TABLE "agents" ADD COLUMN IF NOT EXISTS "deleted" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "agents" ADD COLUMN IF NOT EXISTS "source_agent_id" text;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agents_deleted_idx" ON "agents" USING btree ("deleted");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agents_source_agent_id_idx" ON "agents" USING btree ("source_agent_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "agents_source_user_unique" ON "agents" USING btree ("source_agent_id","user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agents_grants_grantee_role_id_idx" ON "agents_grants" USING btree ("grantee_role_id");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "agents" ADD CONSTRAINT "agents_source_agent_id_fk" FOREIGN KEY ("source_agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
