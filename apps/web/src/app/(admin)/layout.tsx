import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { AdminHeader } from "@/components/admin/admin-header";
import { AdminNotificationProvider } from "@/components/admin/admin-notifications";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminNotificationProvider>
      <div className="flex min-h-screen">
        {/* Sidebar with active link highlighting */}
        <AdminSidebar />

        {/* Main content */}
        <div className="flex flex-1 flex-col overflow-y-auto">
          {/* Header with notification bell + page title */}
          <AdminHeader />
          <main className="flex-1 bg-white">
            <div className="p-6">{children}</div>
          </main>
        </div>
      </div>
    </AdminNotificationProvider>
  );
}
