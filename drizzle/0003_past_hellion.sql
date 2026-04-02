ALTER TABLE "generation" ALTER COLUMN "temperature" SET DATA TYPE double precision;--> statement-breakpoint
ALTER TABLE "generation" ALTER COLUMN "top_p" SET DATA TYPE double precision;--> statement-breakpoint
ALTER TABLE "generation" ALTER COLUMN "repetition_penalty" SET DATA TYPE double precision;--> statement-breakpoint
ALTER TABLE "invitation" ALTER COLUMN "expires_at" SET DATA TYPE timestamp (6) with time zone;--> statement-breakpoint
ALTER TABLE "invitation" ALTER COLUMN "created_at" SET DATA TYPE timestamp (6) with time zone;--> statement-breakpoint
ALTER TABLE "invitation" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "member" ALTER COLUMN "created_at" SET DATA TYPE timestamp (6) with time zone;--> statement-breakpoint
ALTER TABLE "member" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "organization" ALTER COLUMN "slug" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "organization" ALTER COLUMN "created_at" SET DATA TYPE timestamp (6) with time zone;--> statement-breakpoint
ALTER TABLE "organization" ALTER COLUMN "created_at" SET DEFAULT now();