import { BlogEditor } from "@/components/admin/blog-editor";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default function NewBlogPostPage() {
  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <div className="flex items-center gap-3 border-b px-6 py-3">
        <Link
          href="/admin/blog"
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Blog
        </Link>
        <span className="text-muted-foreground">/</span>
        <span className="text-sm font-medium text-primary">New Post</span>
      </div>
      <div className="flex-1 overflow-hidden">
        <BlogEditor />
      </div>
    </div>
  );
}
