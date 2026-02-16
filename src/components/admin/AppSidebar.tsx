"use client";

import * as React from "react";
import {
  IconCar,
  IconFileText,
  IconLayoutDashboard,
  IconLogs,
  IconPackage,
  IconShoppingBag,
  IconWallet,
} from "@tabler/icons-react";

import { NavMain } from "@/components/admin/NavMain";
import { NavUser } from "@/components/admin/NavUser";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const data = {
  user: {
    name: "Admin User",
    email: "admin@eba.com",
    avatar: "/avatars/shadcn.jpg",
  },
  navMain: [
    {
      title: "Dashboard",
      url: "/admin/dashboard",
      icon: IconLayoutDashboard,
    },
    {
      title: "Product Management",
      url: "/admin/product-management",
      icon: IconShoppingBag,
    },
    {
      title: "Stock Management",
      url: "/admin/stock-management",
      icon: IconPackage,
    },
    {
      title: "Payment Management",
      url: "/admin/payment-management",
      icon: IconWallet,
    },
    {
      title: "Order Monitoring",
      url: "/admin/order-monitoring",
      icon: IconFileText,
    },
    {
      title: "Order Release",
      url: "/admin/order-release",
      icon: IconCar,
    },
    {
      title: "Logs & Records",
      url: "/admin/logs-records",
      icon: IconLogs,
    },
  ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { state } = useSidebar();
  return (
    <Sidebar collapsible="icon" {...props}>
      {state !== "collapsed" && (
        <SidebarHeader className="border-b">
          <div className="p-3 text-white">
            <h3 className="text-xl font-semibold font-serif">EBA System</h3>
            <p className="text-base">Management Dashboard</p>
          </div>
        </SidebarHeader>
      )}
      <SidebarContent>
        <NavMain items={data.navMain} />
      </SidebarContent>
      <SidebarFooter className="border-t">
        <NavUser user={data.user} />
      </SidebarFooter>
      <Tooltip>
        <TooltipTrigger asChild>
          <SidebarTrigger className="-ml-1 bg-[#07484A] rounded-full absolute bottom-50 text-white -right-5 hover:bg-[#07484A] shadow-xl hover:text-white" />
        </TooltipTrigger>
        <TooltipContent>{state === "expanded" ? "Hide" : "Show"} Sidebar</TooltipContent>
      </Tooltip>
    </Sidebar>
  );
}
