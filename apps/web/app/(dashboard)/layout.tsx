import { Sidebar } from '../../components/sidebar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto min-h-screen max-w-[1600px] px-6 py-8">
      <div className="dashboard-grid">
        <div className="lg:col-span-3 xl:col-span-2">
          <Sidebar />
        </div>
        <div className="space-y-6 lg:col-span-9 xl:col-span-10">{children}</div>
      </div>
    </main>
  );
}
