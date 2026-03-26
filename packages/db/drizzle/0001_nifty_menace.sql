CREATE TABLE "admin_audit_logs" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"admin_user_id" varchar(64) NOT NULL,
	"action" varchar(50) NOT NULL,
	"resource_type" varchar(50) NOT NULL,
	"resource_id" varchar(64) NOT NULL,
	"diff_json" jsonb,
	"ip_address" varchar(45),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "admin_users" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"username" varchar(80) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"display_name" varchar(80) NOT NULL,
	"role" varchar(20) DEFAULT 'admin' NOT NULL,
	"last_login_at" timestamp with time zone,
	"created_by" varchar(64),
	"updated_by" varchar(64),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "admin_users_role_check" CHECK ("admin_users"."role" IN ('admin', 'super_admin'))
);
--> statement-breakpoint
CREATE TABLE "system_configs" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"config_key" varchar(128) NOT NULL,
	"config_value" text NOT NULL,
	"value_type" varchar(20) NOT NULL,
	"description" varchar(500),
	"is_secret" boolean DEFAULT false NOT NULL,
	"created_by" varchar(64),
	"updated_by" varchar(64),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "system_configs_value_type_check" CHECK ("system_configs"."value_type" IN ('string', 'number', 'boolean', 'json'))
);
--> statement-breakpoint
ALTER TABLE "admin_audit_logs" ADD CONSTRAINT "admin_audit_logs_admin_user_id_admin_users_id_fk" FOREIGN KEY ("admin_user_id") REFERENCES "public"."admin_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "admin_audit_logs_admin_user_id_idx" ON "admin_audit_logs" USING btree ("admin_user_id");--> statement-breakpoint
CREATE INDEX "admin_audit_logs_resource_idx" ON "admin_audit_logs" USING btree ("resource_type","resource_id");--> statement-breakpoint
CREATE INDEX "admin_audit_logs_created_at_idx" ON "admin_audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "admin_users_username_idx" ON "admin_users" USING btree ("username");--> statement-breakpoint
CREATE UNIQUE INDEX "system_configs_key_idx" ON "system_configs" USING btree ("config_key");