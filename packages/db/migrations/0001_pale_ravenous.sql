ALTER TABLE "products" ADD COLUMN "is_research_compound" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "purity_percent" real;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "molecular_weight" varchar(50);--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "amino_acid_sequence" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "cas_number" varchar(50);--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "coa_url" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "vial_size_mg" varchar(50);