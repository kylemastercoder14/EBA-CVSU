"use client";

import { AppSidebar } from "@/components/admin/AppSidebar";
import {
  SidebarTrigger,
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/use-admin-auth";
import React, { ReactNode } from "react";

const AdminLayout = ({ children }: { children: ReactNode }) => {
  useAuth();
  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="sidebar" />
      <SidebarInset>
        <header className="sticky top-0 z-30 flex h-14 items-center border-b border-[#07484A]/15 bg-white/95 px-4 backdrop-blur md:hidden">
          <SidebarTrigger className="text-[#07484A] hover:bg-[#07484A]/10 hover:text-[#07484A]" />
          <p className="ml-2 text-sm font-semibold text-[#07484A]">EBA System</p>
        </header>
        <main className='lg:px-20 lg:py-15 p-5'>
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
};

export default AdminLayout;
