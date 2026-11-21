import { Suspense, type ReactNode } from "react";
import { BodyScrollMode } from "@/components/body-scroll-mode";
import { DashboardShell } from "@/components/dashboard-shell";
import { SidebarUser } from "@/components/sidebar-user";

export default function PainelLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <BodyScrollMode />
      <DashboardShell
        userInfo={
          <Suspense fallback={null}>
            <SidebarUser />
          </Suspense>
        }
      >
        {children}
      </DashboardShell>
    </>
  );
}
