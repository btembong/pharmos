ALTER TABLE "product_categories" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "product_categories" ADD COLUMN "mega_menu_image_url" text;--> statement-breakpoint
ALTER TABLE "product_categories" ADD COLUMN "icon_name" varchar(50) DEFAULT 'ShieldCheck';--> statement-breakpoint
ALTER TABLE "product_categories" ADD COLUMN "color" varchar(30) DEFAULT 'text-purple-600';--> statement-breakpoint
ALTER TABLE "product_categories" ADD COLUMN "bg_color" varchar(50) DEFAULT 'bg-[#7371FC]';--> statement-breakpoint
ALTER TABLE "product_categories" ADD COLUMN "hero_headline" varchar(255);--> statement-breakpoint
ALTER TABLE "product_categories" ADD COLUMN "hero_subtext" text;--> statement-breakpoint
ALTER TABLE "product_categories" ADD COLUMN "hero_bg" varchar(50) DEFAULT 'bg-[#010128]';--> statement-breakpoint
ALTER TABLE "product_categories" ADD COLUMN "hero_accent" varchar(50) DEFAULT 'text-[#A594F9]';--> statement-breakpoint
ALTER TABLE "product_categories" ADD COLUMN "badge_bg" varchar(50) DEFAULT 'bg-[#7371FC]';--> statement-breakpoint
ALTER TABLE "product_categories" ADD COLUMN "benefits" jsonb;--> statement-breakpoint
ALTER TABLE "product_categories" ADD COLUMN "faqs" jsonb;--> statement-breakpoint
ALTER TABLE "product_categories" ADD COLUMN "disclaimer" text;--> statement-breakpoint
ALTER TABLE "product_categories" ADD COLUMN "trust_text" text;--> statement-breakpoint
ALTER TABLE "product_categories" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;