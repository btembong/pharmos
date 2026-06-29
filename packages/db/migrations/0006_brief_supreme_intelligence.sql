ALTER TABLE "banners" ADD COLUMN "overlay_opacity" integer DEFAULT 60 NOT NULL;--> statement-breakpoint
ALTER TABLE "banners" ADD COLUMN "text_color" varchar(10) DEFAULT 'light' NOT NULL;