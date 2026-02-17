"use client";

import { Heading } from "@/components/Heading";
import { useSuspenseQuery } from "@tanstack/react-query";
import { orpc } from "@/lib/orpc";
import { RecentOrderTable } from "./RecentOrderTable";
import { StatsSection } from "./StatsSection";

export const DashboardClient = () => {
  const {
    data: { stats, recentOrders },
  } = useSuspenseQuery(orpc.dashboard.summary.queryOptions());

  return (
    <div>
      <Heading
        title="Dashboard Overview"
        description="Management Dashboard"
      />

      <StatsSection stats={stats} />
      <RecentOrderTable orders={recentOrders} />
    </div>
  );
};
