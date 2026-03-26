CREATE TABLE "admin_refresh_tokens" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"admin_user_id" varchar(64) NOT NULL,
	"token_hash" varchar(255) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "admin_refresh_tokens" ADD CONSTRAINT "admin_refresh_tokens_admin_user_id_admin_users_id_fk" FOREIGN KEY ("admin_user_id") REFERENCES "public"."admin_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "admin_refresh_tokens_token_hash_idx" ON "admin_refresh_tokens" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "admin_refresh_tokens_admin_user_id_idx" ON "admin_refresh_tokens" USING btree ("admin_user_id");