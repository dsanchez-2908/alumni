'use client';

import { DashboardSidebar } from '@/components/dashboard/sidebar';
import { DashboardWrapper } from '@/components/dashboard/dashboard-wrapper';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DashboardWrapper>
      <div className="flex h-screen overflow-hidden bg-gray-50">
        <DashboardSidebar />
        <main className="flex-1 overflow-y-auto">
          <div className="container mx-auto p-6 lg:p-8">
            {children}
          </div>
        </main>
      </div>
    </DashboardWrapper>
  );
}
