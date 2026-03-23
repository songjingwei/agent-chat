CREATE TABLE "agent_personas" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"user_id" varchar(64) NOT NULL,
	"name" varchar(100) NOT NULL,
	"bio" text,
	"system_prompt" text,
	"traits" jsonb DEFAULT '[]'::jsonb,
	"version" integer DEFAULT 1 NOT NULL,
	"status" varchar(20) DEFAULT 'draft' NOT NULL,
	"created_by" varchar(64),
	"updated_by" varchar(64),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "agent_personas_status_check" CHECK ("agent_personas"."status" IN ('draft', 'active', 'archived'))
);
--> statement-breakpoint
CREATE TABLE "chat_messages" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"session_id" varchar(64) NOT NULL,
	"sender_persona_id" varchar(64) NOT NULL,
	"role" varchar(20) NOT NULL,
	"content" text NOT NULL,
	"round" integer DEFAULT 0 NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chat_messages_role_check" CHECK ("chat_messages"."role" IN ('agent', 'human', 'system'))
);
--> statement-breakpoint
CREATE TABLE "chat_sessions" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"initiator_persona_id" varchar(64) NOT NULL,
	"target_persona_id" varchar(64) NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"current_round" integer DEFAULT 0 NOT NULL,
	"max_rounds" integer DEFAULT 20 NOT NULL,
	"created_by" varchar(64),
	"updated_by" varchar(64),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "chat_sessions_status_check" CHECK ("chat_sessions"."status" IN ('pending', 'active', 'paused', 'completed', 'failed'))
);
--> statement-breakpoint
CREATE TABLE "match_reports" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"session_id" varchar(64) NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"compatibility_score" real,
	"summary" text,
	"recommendation" text,
	"analysis_data" jsonb,
	"created_by" varchar(64),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "match_reports_status_check" CHECK ("match_reports"."status" IN ('pending', 'generating', 'completed', 'failed')),
	CONSTRAINT "match_reports_score_check" CHECK ("match_reports"."compatibility_score" IS NULL OR ("match_reports"."compatibility_score" >= 0 AND "match_reports"."compatibility_score" <= 1))
);
--> statement-breakpoint
CREATE TABLE "memory_items" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"persona_id" varchar(64) NOT NULL,
	"session_id" varchar(64),
	"category" varchar(30) NOT NULL,
	"content" text NOT NULL,
	"weight" real DEFAULT 0.5 NOT NULL,
	"source" varchar(30) NOT NULL,
	"embedding" jsonb,
	"metadata" jsonb,
	"created_by" varchar(64),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "memory_items_category_check" CHECK ("memory_items"."category" IN ('fact', 'preference', 'experience', 'instruction')),
	CONSTRAINT "memory_items_source_check" CHECK ("memory_items"."source" IN ('agent_inferred', 'human_override', 'system')),
	CONSTRAINT "memory_items_weight_check" CHECK ("memory_items"."weight" >= 0 AND "memory_items"."weight" <= 1)
);
--> statement-breakpoint
CREATE TABLE "refresh_tokens" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"user_id" varchar(64) NOT NULL,
	"token_hash" varchar(255) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"display_name" varchar(80) NOT NULL,
	"created_by" varchar(64),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "agent_personas" ADD CONSTRAINT "agent_personas_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_session_id_chat_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."chat_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_sender_persona_id_agent_personas_id_fk" FOREIGN KEY ("sender_persona_id") REFERENCES "public"."agent_personas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_sessions" ADD CONSTRAINT "chat_sessions_initiator_persona_id_agent_personas_id_fk" FOREIGN KEY ("initiator_persona_id") REFERENCES "public"."agent_personas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_sessions" ADD CONSTRAINT "chat_sessions_target_persona_id_agent_personas_id_fk" FOREIGN KEY ("target_persona_id") REFERENCES "public"."agent_personas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_reports" ADD CONSTRAINT "match_reports_session_id_chat_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."chat_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memory_items" ADD CONSTRAINT "memory_items_persona_id_agent_personas_id_fk" FOREIGN KEY ("persona_id") REFERENCES "public"."agent_personas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memory_items" ADD CONSTRAINT "memory_items_session_id_chat_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."chat_sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "agent_personas_user_id_idx" ON "agent_personas" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "chat_messages_session_id_created_at_idx" ON "chat_messages" USING btree ("session_id","created_at");--> statement-breakpoint
CREATE INDEX "chat_messages_sender_persona_id_idx" ON "chat_messages" USING btree ("sender_persona_id");--> statement-breakpoint
CREATE INDEX "chat_sessions_initiator_persona_id_idx" ON "chat_sessions" USING btree ("initiator_persona_id");--> statement-breakpoint
CREATE INDEX "chat_sessions_target_persona_id_idx" ON "chat_sessions" USING btree ("target_persona_id");--> statement-breakpoint
CREATE INDEX "match_reports_session_id_idx" ON "match_reports" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "memory_items_persona_id_idx" ON "memory_items" USING btree ("persona_id");--> statement-breakpoint
CREATE INDEX "memory_items_session_id_idx" ON "memory_items" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "memory_items_source_idx" ON "memory_items" USING btree ("source");--> statement-breakpoint
CREATE INDEX "refresh_tokens_token_hash_idx" ON "refresh_tokens" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");