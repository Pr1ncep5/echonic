CREATE TYPE "public"."voice_category" AS ENUM('AUDIOBOOK', 'CONVERSATIONAL', 'CUSTOMER_SERVICE', 'GENERAL', 'NARRATIVE', 'CHARACTERS', 'MEDITATION', 'MOTIVATIONAL', 'PODCAST', 'ADVERTISING', 'VOICEOVER', 'CORPORATE');--> statement-breakpoint
CREATE TYPE "public"."voice_variant" AS ENUM('SYSTEM', 'CUSTOM');--> statement-breakpoint
CREATE TABLE "generation" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"voice_id" text,
	"text" text NOT NULL,
	"voice_name" text NOT NULL,
	"r2_object_key" text,
	"temperature" real NOT NULL,
	"top_p" real NOT NULL,
	"top_k" integer NOT NULL,
	"repetition_penalty" real NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invitation" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"email" text NOT NULL,
	"role" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"inviter_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "member" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"created_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organization" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"logo" text,
	"created_at" timestamp NOT NULL,
	"metadata" text,
	CONSTRAINT "organization_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "rate_limit" (
	"id" text PRIMARY KEY NOT NULL,
	"key" varchar(255) NOT NULL,
	"count" integer NOT NULL,
	"last_request" bigint NOT NULL,
	CONSTRAINT "rate_limit_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "voice" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text,
	"name" text NOT NULL,
	"description" text,
	"category" "voice_category" DEFAULT 'GENERAL' NOT NULL,
	"language" text DEFAULT 'en-US' NOT NULL,
	"variant" "voice_variant" NOT NULL,
	"r2_object_key" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "session" ADD COLUMN "active_organization_id" text;--> statement-breakpoint
ALTER TABLE "generation" ADD CONSTRAINT "generation_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generation" ADD CONSTRAINT "generation_voice_id_voice_id_fk" FOREIGN KEY ("voice_id") REFERENCES "public"."voice"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_inviter_id_user_id_fk" FOREIGN KEY ("inviter_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member" ADD CONSTRAINT "member_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member" ADD CONSTRAINT "member_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voice" ADD CONSTRAINT "voice_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "generation_org_id_idx" ON "generation" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "generation_voice_id_idx" ON "generation" USING btree ("voice_id");--> statement-breakpoint
CREATE INDEX "invitation_organizationId_idx" ON "invitation" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "invitation_email_idx" ON "invitation" USING btree ("email");--> statement-breakpoint
CREATE INDEX "member_organizationId_idx" ON "member" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "member_userId_idx" ON "member" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "organization_slug_uidx" ON "organization" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "voice_variant_idx" ON "voice" USING btree ("variant");--> statement-breakpoint
CREATE INDEX "voice_org_id_idx" ON "voice" USING btree ("org_id");