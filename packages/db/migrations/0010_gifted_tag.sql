CREATE TABLE "blog_posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(200) NOT NULL,
	"title" varchar(200) NOT NULL,
	"excerpt" text,
	"body" text,
	"featured_image" text,
	"author" varchar(100),
	"author_title" varchar(100),
	"category" varchar(50),
	"tags" text[],
	"status" varchar(20) DEFAULT 'draft' NOT NULL,
	"published_at" timestamp with time zone,
	"meta_title" varchar(60),
	"meta_description" varchar(160),
	"featured_image_alt" varchar(255),
	"related_product_slugs" text[],
	"reading_time_minutes" varchar(5),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "blog_posts_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "newsletter_subscribers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"source" varchar(50),
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"unsubscribed_at" timestamp with time zone,
	CONSTRAINT "newsletter_subscribers_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE INDEX "idx_blog_slug" ON "blog_posts" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "idx_blog_status" ON "blog_posts" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_blog_category" ON "blog_posts" USING btree ("category");--> statement-breakpoint
CREATE INDEX "idx_blog_published_at" ON "blog_posts" USING btree ("published_at");--> statement-breakpoint
CREATE INDEX "idx_newsletter_email" ON "newsletter_subscribers" USING btree ("email");--> statement-breakpoint
CREATE INDEX "idx_newsletter_status" ON "newsletter_subscribers" USING btree ("status");