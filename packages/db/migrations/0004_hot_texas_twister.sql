CREATE TABLE "banners" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"placement" varchar(50) DEFAULT 'homepage_hero' NOT NULL,
	"title" varchar(255) NOT NULL,
	"highlight" varchar(255),
	"description" text,
	"badge_text" varchar(100),
	"cta_label" varchar(100),
	"cta_url" varchar(500),
	"image_url" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "product_categories" ADD COLUMN "hero_image_url" text;