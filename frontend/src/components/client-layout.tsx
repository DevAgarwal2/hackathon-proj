"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { isAuthenticated } from "@/lib/api";

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  const isAuthPage = pathname === "/" || pathname.startsWith("/auth") || pathname.startsWith("/order");

  useEffect(() => {
    if (!isAuthPage && !isAuthenticated()) {
      router.replace("/auth/login");
    } else {
      setChecked(true);
    }
  }, [pathname, isAuthPage, router]);

  if (isAuthPage) {
    return (
      <TooltipProvider>
        {children}
      </TooltipProvider>
    );
  }

  // Don't render protected pages until auth check passes
  if (!checked) return null;

  return (
    <TooltipProvider>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <main className="flex-1 overflow-auto">{children}</main>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}
