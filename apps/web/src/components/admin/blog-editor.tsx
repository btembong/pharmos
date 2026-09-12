"use client";

import { useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Globe,
  FileText,
  Loader2,
  Plus,
  X,
  Eye,
  Save,
} from "lucide-react";
import { toast } from "sonner";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

const CATEGORIES = [
  { value: "drug-guides", label: "Drug Guides" },
  { value: "wellness", label: "Wellness" },
  { value: "supplements", label: "Supplements" },
  { value: "drug-interactions", label: "Drug Interactions" },
  { value: "news", label: "News" },
  { value: "how-to", label: "How-To" },
];

interface BlogPostForm {
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  featuredImage: string;
  featuredImageAlt: string;
  author: string;
  authorTitle: string;
  category: string;
  tags: string[];
  status: "draft" | "published";
  metaTitle: string;
  metaDescription: string;
  relatedProductSlugs: string[];
  readingTimeMinutes: string;
}

interface BlogEditorProps {
  postId?: string;
  initialData?: Partial<BlogPostForm>;
}

export function BlogEditor({ postId, initialData }: BlogEditorProps) {
  const { getToken } = useAuth();
  const router = useRouter();

  const [form, setForm] = useState<BlogPostForm>({
    slug: "",
    title: "",
    excerpt: "",
    body: "",
    featuredImage: "",
    featuredImageAlt: "",
    author: "",
    authorTitle: "",
    category: "",
    tags: [],
    status: "draft",
    metaTitle: "",
    metaDescription: "",
    relatedProductSlugs: [],
    readingTimeMinutes: "",
    ...initialData,
  });

  const [tagInput, setTagInput] = useState("");
  const [relatedInput, setRelatedInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);

  function set(field: keyof BlogPostForm, value: any) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  // Auto-generate slug from title
  function handleTitleChange(title: string) {
    set("title", title);
    if (!postId && !form.slug) {
      set(
        "slug",
        title
          .toLowerCase()
          .replace(/[^a-z0-9\s-]/g, "")
          .trim()
          .replace(/\s+/g, "-")
          .slice(0, 200)
      );
    }
    // Auto meta title
    if (!form.metaTitle) {
      set("metaTitle", title.slice(0, 60));
    }
  }

  function addTag() {
    const tag = tagInput.trim().toLowerCase().replace(/\s+/g, "-");
    if (tag && !form.tags.includes(tag)) {
      set("tags", [...form.tags, tag]);
    }
    setTagInput("");
  }

  function addRelatedProduct() {
    const slug = relatedInput.trim();
    if (slug && !form.relatedProductSlugs.includes(slug)) {
      set("relatedProductSlugs", [...form.relatedProductSlugs, slug]);
    }
    setRelatedInput("");
  }

  async function handleSave(status: "draft" | "published") {
    if (!form.title.trim() || !form.slug.trim()) {
      toast.error("Title and slug are required");
      return;
    }

    const isSaving = status === "draft";
    isSaving ? setSaving(true) : setPublishing(true);

    try {
      const token = await getToken();
      const payload = {
        ...form,
        status,
        slug: form.slug.trim(),
        title: form.title.trim(),
        excerpt: form.excerpt.trim() || undefined,
        body: form.body.trim() || undefined,
        featuredImage: form.featuredImage.trim() || undefined,
        featuredImageAlt: form.featuredImageAlt.trim() || undefined,
        author: form.author.trim() || undefined,
        authorTitle: form.authorTitle.trim() || undefined,
        category: form.category || undefined,
        metaTitle: form.metaTitle.trim() || undefined,
        metaDescription: form.metaDescription.trim() || undefined,
        readingTimeMinutes: form.readingTimeMinutes.trim() || undefined,
        tags: form.tags.length > 0 ? form.tags : undefined,
        relatedProductSlugs: form.relatedProductSlugs.length > 0 ? form.relatedProductSlugs : undefined,
      };

      const url = postId ? `${API_URL}/api/blog/${postId}` : `${API_URL}/api/blog`;
      const method = postId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        toast.success(status === "published" ? "Post published!" : "Draft saved");
        if (!postId) {
          router.push(`/admin/blog/${data.data.id}`);
        } else {
          set("status", status);
        }
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || "Failed to save post");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setSaving(false);
      setPublishing(false);
    }
  }

  return (
    <div className="flex h-full flex-col gap-0">
      {/* Top bar */}
      <div className="flex items-center justify-between border-b px-6 py-3">
        <div className="flex items-center gap-3">
          <Badge
            className={
              form.status === "published"
                ? "bg-green-100 text-green-700"
                : "bg-amber-100 text-amber-700"
            }
          >
            {form.status === "published" ? (
              <Globe className="mr-1 h-3 w-3" />
            ) : (
              <FileText className="mr-1 h-3 w-3" />
            )}
            {form.status === "published" ? "Published" : "Draft"}
          </Badge>
          {postId && form.status === "published" && (
            <a
              href={`/blog/${form.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-accent hover:underline"
            >
              <Eye className="h-3 w-3" />
              Preview
            </a>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleSave("draft")}
            disabled={saving || publishing}
          >
            {saving ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-1.5 h-4 w-4" />
            )}
            Save Draft
          </Button>
          <Button
            size="sm"
            onClick={() => handleSave("published")}
            disabled={saving || publishing}
          >
            {publishing ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <Globe className="mr-1.5 h-4 w-4" />
            )}
            {form.status === "published" ? "Update" : "Publish"}
          </Button>
        </div>
      </div>

      {/* Editor body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Main area */}
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-6">
          {/* Title */}
          <Input
            placeholder="Post title..."
            value={form.title}
            onChange={(e) => handleTitleChange(e.target.value)}
            className="border-0 border-b rounded-none px-0 text-2xl font-bold focus-visible:ring-0 focus-visible:border-accent"
          />

          {/* Slug */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="shrink-0">/blog/</span>
            <Input
              value={form.slug}
              onChange={(e) => set("slug", e.target.value.toLowerCase().replace(/\s+/g, "-"))}
              className="h-6 rounded border-dashed px-2 text-xs font-mono"
              placeholder="post-slug"
            />
          </div>

          {/* Excerpt */}
          <textarea
            value={form.excerpt}
            onChange={(e) => set("excerpt", e.target.value)}
            rows={2}
            placeholder="Short excerpt / summary (shown in blog list)..."
            className="w-full resize-none rounded-lg border bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground/50 focus:border-ring focus:ring-2 focus:ring-ring/20"
          />

          <Separator />

          {/* Body — markdown textarea */}
          <div>
            <p className="mb-1.5 text-xs font-medium text-muted-foreground">
              Article Body (Markdown supported: # H1, ## H2, ### H3, **bold**, - list)
            </p>
            <textarea
              value={form.body}
              onChange={(e) => set("body", e.target.value)}
              rows={24}
              placeholder={`# Introduction\n\nWrite your article here...\n\n## Section Heading\n\nParagraph text goes here.\n\n- List item one\n- List item two`}
              className="w-full resize-y rounded-lg border bg-transparent px-3 py-2 font-mono text-sm outline-none placeholder:text-muted-foreground/30 focus:border-ring focus:ring-2 focus:ring-ring/20"
            />
          </div>
        </div>

        {/* Right sidebar — settings */}
        <div className="w-72 shrink-0 overflow-y-auto border-l p-4">
          <Tabs defaultValue="post">
            <TabsList className="mb-4 w-full">
              <TabsTrigger value="post" className="flex-1 text-xs">Post</TabsTrigger>
              <TabsTrigger value="seo" className="flex-1 text-xs">SEO</TabsTrigger>
            </TabsList>

            <TabsContent value="post" className="space-y-4">
              {/* Category */}
              <div>
                <label className="mb-1.5 block text-xs font-medium">Category</label>
                <Select value={form.category} onValueChange={(v) => set("category", v)}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value} className="text-xs">
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Author */}
              <div>
                <label className="mb-1.5 block text-xs font-medium">Author Name</label>
                <Input
                  value={form.author}
                  onChange={(e) => set("author", e.target.value)}
                  className="h-8 text-xs"
                  placeholder="Dr. Jane Smith"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium">Author Title</label>
                <Input
                  value={form.authorTitle}
                  onChange={(e) => set("authorTitle", e.target.value)}
                  className="h-8 text-xs"
                  placeholder="PharmD, Licensed Pharmacist"
                />
              </div>

              {/* Reading time */}
              <div>
                <label className="mb-1.5 block text-xs font-medium">Reading Time (min)</label>
                <Input
                  value={form.readingTimeMinutes}
                  onChange={(e) => set("readingTimeMinutes", e.target.value)}
                  className="h-8 text-xs"
                  placeholder="5"
                  type="number"
                />
              </div>

              {/* Featured image */}
              <div>
                <label className="mb-1.5 block text-xs font-medium">Featured Image URL</label>
                <Input
                  value={form.featuredImage}
                  onChange={(e) => set("featuredImage", e.target.value)}
                  className="h-8 text-xs"
                  placeholder="https://..."
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium">Image Alt Text</label>
                <Input
                  value={form.featuredImageAlt}
                  onChange={(e) => set("featuredImageAlt", e.target.value)}
                  className="h-8 text-xs"
                  placeholder="Descriptive alt text"
                />
              </div>

              {/* Tags */}
              <div>
                <label className="mb-1.5 block text-xs font-medium">Tags</label>
                <div className="flex gap-1">
                  <Input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
                    className="h-7 flex-1 text-xs"
                    placeholder="ibuprofen"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 px-2"
                    onClick={addTag}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {form.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="gap-1 text-xs">
                      {tag}
                      <button
                        type="button"
                        onClick={() => set("tags", form.tags.filter((t) => t !== tag))}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Related products */}
              <div>
                <label className="mb-1.5 block text-xs font-medium">Related Product Slugs</label>
                <div className="flex gap-1">
                  <Input
                    value={relatedInput}
                    onChange={(e) => setRelatedInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addRelatedProduct())}
                    className="h-7 flex-1 text-xs font-mono"
                    placeholder="ibuprofen-200mg"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 px-2"
                    onClick={addRelatedProduct}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
                <div className="mt-2 space-y-1">
                  {form.relatedProductSlugs.map((slug) => (
                    <div key={slug} className="flex items-center justify-between rounded border px-2 py-1 text-xs font-mono">
                      <span className="truncate text-muted-foreground">{slug}</span>
                      <button
                        type="button"
                        onClick={() =>
                          set("relatedProductSlugs", form.relatedProductSlugs.filter((s) => s !== slug))
                        }
                        className="ml-2 text-muted-foreground hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="seo" className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium">
                  Meta Title <span className="text-muted-foreground">({form.metaTitle.length}/60)</span>
                </label>
                <Input
                  value={form.metaTitle}
                  onChange={(e) => set("metaTitle", e.target.value.slice(0, 60))}
                  className="h-8 text-xs"
                  placeholder="SEO title (60 chars max)"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium">
                  Meta Description <span className="text-muted-foreground">({form.metaDescription.length}/160)</span>
                </label>
                <textarea
                  value={form.metaDescription}
                  onChange={(e) => set("metaDescription", e.target.value.slice(0, 160))}
                  rows={4}
                  placeholder="SEO description (160 chars max)"
                  className="w-full resize-none rounded-lg border bg-transparent px-3 py-2 text-xs outline-none placeholder:text-muted-foreground/50 focus:border-ring focus:ring-2 focus:ring-ring/20"
                />
              </div>

              {/* SEO preview */}
              <div className="rounded-xl border bg-secondary/20 p-3">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Google Preview
                </p>
                <p className="text-xs font-medium text-blue-600 line-clamp-1">
                  {form.metaTitle || form.title || "Post Title"}
                </p>
                <p className="mt-0.5 text-[10px] text-green-700">
                  pharmaflow.com/blog/{form.slug || "post-slug"}
                </p>
                <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground line-clamp-2">
                  {form.metaDescription || form.excerpt || "Post description will appear here..."}
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
