import { requireUser } from '@/lib/auth';
import { DashboardSidebar } from '@/components/dashboard-sidebar';
import { DashboardNavbar } from '@/components/dashboard-navbar';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  return (
    <div className="min-h-screen bg-background pt-16">
      <DashboardNavbar user={user} />
      <div className="flex min-h-[calc(100vh-4rem)]">
        <DashboardSidebar user={user} />
        <main className="flex-1 min-w-0 px-4 py-8 sm:px-6">
          {children}
        </main>
      </div>
    </div>
  );
}
