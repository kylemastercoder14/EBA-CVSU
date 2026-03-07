"use client";

import * as React from "react";
import {
  IconCar,
  IconFileText,
  IconLayoutDashboard,
  IconLogs,
  IconPackage,
  IconRefresh,
  IconShoppingBag,
  IconUsers,
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
      title: "Staff Management",
      url: "/admin/staff-management",
      icon: IconUsers,
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
      title: "Pre-Order Management",
      url: "/admin/pre-order-management",
      icon: IconFileText,
    },
    {
      title: "Order Release",
      url: "/admin/order-release",
      icon: IconCar,
    },
    {
      title: "Replace Requests",
      url: "/admin/replace-management",
      icon: IconRefresh,
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
  const [currentUser, setCurrentUser] = React.useState({
    name: "Staff User",
    email: "No session loaded",
    avatar: "/logo.png",
  });

  React.useEffect(() => {
    const rawSession = localStorage.getItem("eba_staff_session");
    if (!rawSession) return;

    try {
      const session = JSON.parse(rawSession) as {
        fullName?: string;
        mobileNumber?: string;
        role?: string;
      };

      setCurrentUser({
        name: session.fullName || "Staff User",
        email: `${session.role || "STAFF"} | ${session.mobileNumber || "No mobile"}`,
        avatar: "/logo.png",
      });
    } catch {
      // Keep fallback user data if session parsing fails.
    }
  }, []);

  return (
    <Sidebar
      collapsible="icon"
      className="bg-[#07484A] text-white"
      {...props}
    >
      {state !== "collapsed" && (
        <SidebarHeader className="border-b border-white/15">
          <div className="p-3 text-white">
            <h3 className="text-xl font-semibold font-serif">EBA System</h3>
            <p className="text-sm text-white/80">Management Dashboard</p>
          </div>
        </SidebarHeader>
      )}
      <SidebarContent>
        <NavMain items={data.navMain} />
      </SidebarContent>
      <SidebarFooter className="border-t border-white/15">
        <NavUser user={currentUser} />
      </SidebarFooter>
      <Tooltip>
        <TooltipTrigger asChild>
          <SidebarTrigger className="hidden md:flex bg-[#07484A] rounded-full absolute top-1/2 -translate-y-1/2 text-white -right-5 hover:bg-[#07484A] shadow-xl hover:text-white border border-[#0a5f62]" />
        </TooltipTrigger>
        <TooltipContent>{state === "expanded" ? "Hide" : "Show"} Sidebar</TooltipContent>
      </Tooltip>
    </Sidebar>
  );
}
