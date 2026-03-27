CREATE TABLE "assessment_answers" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"session_item_id" varchar(64) NOT NULL,
	"selected_option_value" varchar(120),
	"free_text_answer" varchar(4000),
	"normalized_score" real,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assessment_ingest_batches" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"source_type" varchar(30) NOT NULL,
	"source_label" varchar(255) NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"raw_payload" jsonb,
	"created_by" varchar(64),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "assessment_ingest_batches_source_type_check" CHECK ("assessment_ingest_batches"."source_type" IN ('crawler', 'manual', 'seed')),
	CONSTRAINT "assessment_ingest_batches_status_check" CHECK ("assessment_ingest_batches"."status" IN ('pending', 'completed', 'failed'))
);
--> statement-breakpoint
CREATE TABLE "assessment_interpretations" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"session_id" varchar(64) NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"model_provider" varchar(30),
	"model_name" varchar(120),
	"prompt_version" varchar(30),
	"summary" varchar(4000),
	"confidence" real,
	"dimension_scores" jsonb,
	"memory_writes" jsonb,
	"persona_patch" jsonb,
	"evidence" jsonb,
	"raw_output" jsonb,
	"error_code" varchar(80),
	"applied_persona_version" integer,
	"applied_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "assessment_interpretations_status_check" CHECK ("assessment_interpretations"."status" IN ('pending', 'completed', 'failed', 'applied')),
	CONSTRAINT "assessment_interpretations_confidence_check" CHECK ("assessment_interpretations"."confidence" IS NULL OR ("assessment_interpretations"."confidence" >= 0 AND "assessment_interpretations"."confidence" <= 1))
);
--> statement-breakpoint
CREATE TABLE "assessment_item_candidates" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"ingest_batch_id" varchar(64) NOT NULL,
	"source_url" varchar(1000),
	"source_title" varchar(255),
	"copyright_note" varchar(500),
	"framework" varchar(50) NOT NULL,
	"dimension" varchar(50) NOT NULL,
	"question_text" varchar(4000) NOT NULL,
	"options_json" jsonb DEFAULT '[]'::jsonb,
	"explanation_json" jsonb,
	"language" varchar(20) DEFAULT 'zh-CN' NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"review_note" varchar(1000),
	"reviewed_by" varchar(64),
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "assessment_item_candidates_status_check" CHECK ("assessment_item_candidates"."status" IN ('pending', 'approved', 'rejected'))
);
--> statement-breakpoint
CREATE TABLE "assessment_items" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"candidate_id" varchar(64),
	"slug" varchar(120) NOT NULL,
	"framework" varchar(50) NOT NULL,
	"dimension" varchar(50) NOT NULL,
	"subdimension" varchar(50),
	"question_text" varchar(4000) NOT NULL,
	"options_json" jsonb DEFAULT '[]'::jsonb,
	"answer_type" varchar(20) NOT NULL,
	"difficulty" varchar(20) DEFAULT 'medium' NOT NULL,
	"tags" jsonb DEFAULT '[]'::jsonb,
	"language" varchar(20) DEFAULT 'zh-CN' NOT NULL,
	"source_url" varchar(1000),
	"source_title" varchar(255),
	"license_note" varchar(500),
	"status" varchar(20) DEFAULT 'draft' NOT NULL,
	"created_by" varchar(64),
	"updated_by" varchar(64),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "assessment_items_status_check" CHECK ("assessment_items"."status" IN ('draft', 'active', 'archived')),
	CONSTRAINT "assessment_items_answer_type_check" CHECK ("assessment_items"."answer_type" IN ('single_choice', 'likert', 'free_text')),
	CONSTRAINT "assessment_items_difficulty_check" CHECK ("assessment_items"."difficulty" IN ('low', 'medium', 'high'))
);
--> statement-breakpoint
CREATE TABLE "assessment_session_items" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"session_id" varchar(64) NOT NULL,
	"slot_id" varchar(64) NOT NULL,
	"item_id" varchar(64) NOT NULL,
	"display_order" integer NOT NULL,
	"question_snapshot" varchar(4000) NOT NULL,
	"options_snapshot" jsonb DEFAULT '[]'::jsonb,
	"answered_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assessment_sessions" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"user_id" varchar(64) NOT NULL,
	"persona_id" varchar(64) NOT NULL,
	"template_id" varchar(64) NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"current_index" integer DEFAULT 0 NOT NULL,
	"seed" varchar(64) NOT NULL,
	"started_at" timestamp with time zone,
	"submitted_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "assessment_sessions_status_check" CHECK ("assessment_sessions"."status" IN ('pending', 'in_progress', 'submitted', 'interpreting', 'completed', 'failed'))
);
--> statement-breakpoint
CREATE TABLE "assessment_template_slots" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"template_id" varchar(64) NOT NULL,
	"slot_index" integer NOT NULL,
	"dimension" varchar(50) NOT NULL,
	"required_tags" jsonb DEFAULT '[]'::jsonb,
	"excluded_tags" jsonb DEFAULT '[]'::jsonb,
	"difficulty" varchar(20),
	"answer_type" varchar(20) DEFAULT 'single_choice' NOT NULL,
	"random_pool_limit" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "assessment_template_slots_answer_type_check" CHECK ("assessment_template_slots"."answer_type" IN ('single_choice', 'likert', 'free_text')),
	CONSTRAINT "assessment_template_slots_difficulty_check" CHECK ("assessment_template_slots"."difficulty" IS NULL OR "assessment_template_slots"."difficulty" IN ('low', 'medium', 'high'))
);
--> statement-breakpoint
CREATE TABLE "assessment_templates" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"slug" varchar(120) NOT NULL,
	"name" varchar(120) NOT NULL,
	"description" varchar(1000),
	"framework" varchar(50) NOT NULL,
	"language" varchar(20) DEFAULT 'zh-CN' NOT NULL,
	"status" varchar(20) DEFAULT 'draft' NOT NULL,
	"selection_rules" jsonb,
	"created_by" varchar(64),
	"updated_by" varchar(64),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "assessment_templates_status_check" CHECK ("assessment_templates"."status" IN ('draft', 'active', 'archived'))
);
--> statement-breakpoint
CREATE TABLE "persona_versions" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"persona_id" varchar(64) NOT NULL,
	"version" integer NOT NULL,
	"snapshot" jsonb NOT NULL,
	"change_source" varchar(30) NOT NULL,
	"source_ref_id" varchar(64),
	"created_by" varchar(64),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "persona_versions_change_source_check" CHECK ("persona_versions"."change_source" IN ('persona_build', 'manual_edit', 'assessment_calibration'))
);
--> statement-breakpoint
ALTER TABLE "memory_items" DROP CONSTRAINT "memory_items_source_check";--> statement-breakpoint
ALTER TABLE "assessment_answers" ADD CONSTRAINT "assessment_answers_session_item_id_assessment_session_items_id_fk" FOREIGN KEY ("session_item_id") REFERENCES "public"."assessment_session_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_interpretations" ADD CONSTRAINT "assessment_interpretations_session_id_assessment_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."assessment_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_item_candidates" ADD CONSTRAINT "assessment_item_candidates_ingest_batch_id_assessment_ingest_batches_id_fk" FOREIGN KEY ("ingest_batch_id") REFERENCES "public"."assessment_ingest_batches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_items" ADD CONSTRAINT "assessment_items_candidate_id_assessment_item_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."assessment_item_candidates"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_session_items" ADD CONSTRAINT "assessment_session_items_session_id_assessment_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."assessment_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_session_items" ADD CONSTRAINT "assessment_session_items_slot_id_assessment_template_slots_id_fk" FOREIGN KEY ("slot_id") REFERENCES "public"."assessment_template_slots"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_session_items" ADD CONSTRAINT "assessment_session_items_item_id_assessment_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."assessment_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_sessions" ADD CONSTRAINT "assessment_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_sessions" ADD CONSTRAINT "assessment_sessions_persona_id_agent_personas_id_fk" FOREIGN KEY ("persona_id") REFERENCES "public"."agent_personas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_sessions" ADD CONSTRAINT "assessment_sessions_template_id_assessment_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."assessment_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_template_slots" ADD CONSTRAINT "assessment_template_slots_template_id_assessment_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."assessment_templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "persona_versions" ADD CONSTRAINT "persona_versions_persona_id_agent_personas_id_fk" FOREIGN KEY ("persona_id") REFERENCES "public"."agent_personas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "assessment_answers_session_item_id_idx" ON "assessment_answers" USING btree ("session_item_id");--> statement-breakpoint
CREATE INDEX "assessment_answers_created_at_idx" ON "assessment_answers" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "assessment_ingest_batches_status_idx" ON "assessment_ingest_batches" USING btree ("status");--> statement-breakpoint
CREATE INDEX "assessment_ingest_batches_created_at_idx" ON "assessment_ingest_batches" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "assessment_interpretations_session_id_idx" ON "assessment_interpretations" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "assessment_interpretations_status_idx" ON "assessment_interpretations" USING btree ("status");--> statement-breakpoint
CREATE INDEX "assessment_item_candidates_ingest_batch_id_idx" ON "assessment_item_candidates" USING btree ("ingest_batch_id");--> statement-breakpoint
CREATE INDEX "assessment_item_candidates_status_framework_dimension_idx" ON "assessment_item_candidates" USING btree ("status","framework","dimension");--> statement-breakpoint
CREATE INDEX "assessment_item_candidates_reviewed_at_idx" ON "assessment_item_candidates" USING btree ("reviewed_at");--> statement-breakpoint
CREATE UNIQUE INDEX "assessment_items_slug_idx" ON "assessment_items" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "assessment_items_status_framework_dimension_idx" ON "assessment_items" USING btree ("status","framework","dimension");--> statement-breakpoint
CREATE INDEX "assessment_items_candidate_id_idx" ON "assessment_items" USING btree ("candidate_id");--> statement-breakpoint
CREATE INDEX "assessment_items_created_at_idx" ON "assessment_items" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "assessment_session_items_session_id_display_order_idx" ON "assessment_session_items" USING btree ("session_id","display_order");--> statement-breakpoint
CREATE UNIQUE INDEX "assessment_session_items_session_id_slot_id_idx" ON "assessment_session_items" USING btree ("session_id","slot_id");--> statement-breakpoint
CREATE INDEX "assessment_session_items_session_id_idx" ON "assessment_session_items" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "assessment_sessions_user_id_idx" ON "assessment_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "assessment_sessions_persona_id_idx" ON "assessment_sessions" USING btree ("persona_id");--> statement-breakpoint
CREATE INDEX "assessment_sessions_status_created_at_idx" ON "assessment_sessions" USING btree ("status","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "assessment_template_slots_template_id_slot_index_idx" ON "assessment_template_slots" USING btree ("template_id","slot_index");--> statement-breakpoint
CREATE INDEX "assessment_template_slots_template_id_idx" ON "assessment_template_slots" USING btree ("template_id");--> statement-breakpoint
CREATE INDEX "assessment_template_slots_template_id_dimension_idx" ON "assessment_template_slots" USING btree ("template_id","dimension");--> statement-breakpoint
CREATE UNIQUE INDEX "assessment_templates_slug_idx" ON "assessment_templates" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "persona_versions_persona_id_version_idx" ON "persona_versions" USING btree ("persona_id","version");--> statement-breakpoint
CREATE INDEX "persona_versions_persona_id_idx" ON "persona_versions" USING btree ("persona_id");--> statement-breakpoint
ALTER TABLE "memory_items" ADD CONSTRAINT "memory_items_source_check" CHECK ("memory_items"."source" IN ('agent_inferred', 'human_override', 'system', 'assessment_self_report', 'assessment_inferred'));