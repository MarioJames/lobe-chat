DROP INDEX "knowledge_bases_user_id_unique";--> statement-breakpoint
DROP INDEX "knowledge_bases_type_unique";--> statement-breakpoint
DROP INDEX "knowledge_bases_enabled_unique";--> statement-breakpoint
ALTER TABLE "knowledge_bases" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "agents" ADD COLUMN "deleted" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "agents" ADD COLUMN "source_agent_id" text;--> statement-breakpoint
CREATE INDEX "agents_deleted_idx" ON "agents" USING btree ("deleted");--> statement-breakpoint
CREATE INDEX "agents_source_agent_id_idx" ON "agents" USING btree ("source_agent_id");--> statement-breakpoint
CREATE UNIQUE INDEX "agents_source_user_unique" ON "agents" USING btree ("source_agent_id","user_id");--> statement-breakpoint
CREATE INDEX "agents_grants_grantee_role_id_idx" ON "agents_grants" USING btree ("grantee_role_id");--> statement-breakpoint
CREATE INDEX "knowledge_bases_user_type_enabled_idx" ON "knowledge_bases" USING btree ("user_id","type","enabled");
