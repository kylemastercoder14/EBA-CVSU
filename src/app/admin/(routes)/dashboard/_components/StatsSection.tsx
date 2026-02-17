import {
  IconCalendarCheck,
  IconChartArrowsVertical,
  IconShoppingCart,
} from "@tabler/icons-react";
import { StatsCard, type StatsType } from "./StatsCard";

interface DashboardStats {
  totalOrders: number;
  totalOrdersChangePct: number;
  preOrders: number;
  preOrdersChangePct: number;
  totalSales: number;
  totalSalesChangePct: number;
  pendingPayments: number;
  pendingPaymentsChangePct: number;
}

interface StatsSectionProps {
  stats: DashboardStats;
}

const formatInteger = (value: number) => new Intl.NumberFormat("en-PH").format(value);

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

const getTrend = (value: number): "up" | "down" => (value >= 0 ? "up" : "down");

const getTrendText = (value: number) => `${Math.abs(value)}% vs previous 7 days`;

export const StatsSection = ({ stats }: StatsSectionProps) => {
  const sectionStats: StatsType[] = [
    {
      title: "Total Orders",
      data: formatInteger(stats.totalOrders),
      icon: IconShoppingCart,
      iconBgColor: "bg-[#2E1FF9]/30",
      iconColor: "text-[#2E1FF9]",
      trend: getTrend(stats.totalOrdersChangePct),
      description: getTrendText(stats.totalOrdersChangePct),
    },
    {
      title: "Pre-Orders",
      data: formatInteger(stats.preOrders),
      icon: IconCalendarCheck,
      iconBgColor: "bg-[#BF2EB6]/30",
      iconColor: "text-[#BF2EB6]",
      trend: getTrend(stats.preOrdersChangePct),
      description: getTrendText(stats.preOrdersChangePct),
    },
    {
      title: "Total Sales",
      data: `PHP ${formatCurrency(stats.totalSales)}`,
      icon: IconChartArrowsVertical,
      iconBgColor: "bg-[#837F00]/30",
      iconColor: "text-[#837F00]",
      trend: getTrend(stats.totalSalesChangePct),
      description: getTrendText(stats.totalSalesChangePct),
    },
    {
      title: "Pending Payments",
      data: formatInteger(stats.pendingPayments),
      icon: IconCalendarCheck,
      iconBgColor: "bg-[#F91F1F]/30",
      iconColor: "text-[#F91F1F]",
      trend: getTrend(stats.pendingPaymentsChangePct),
      description: getTrendText(stats.pendingPaymentsChangePct),
    },
  ];

  return (
    <div className="mt-10 grid lg:grid-cols-4 grid-cols-1 gap-10">
      {sectionStats.map((stat) => (
        <StatsCard key={stat.title} stat={stat} />
      ))}
    </div>
  );
};
