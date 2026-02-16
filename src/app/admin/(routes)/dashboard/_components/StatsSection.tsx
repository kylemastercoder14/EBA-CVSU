import {
  IconCalendarCheck,
  IconChartArrowsVertical,
  IconShoppingCart,
} from "@tabler/icons-react";
import { StatsCard, type StatsType } from "./StatsCard";

export const StatsSection = () => {
  const stats: StatsType[] = [
    {
      title: "Total Orders",
      data: "40,689",
      icon: IconShoppingCart,
      iconBgColor: "bg-[#2E1FF9]/30",
      iconColor: "text-[#2E1FF9]",
      trend: "up",
      description: "12% from last week",
    },
    {
      title: "Pre-Orders",
      data: "40",
      icon: IconCalendarCheck,
      iconBgColor: "bg-[#BF2EB6]/30",
      iconColor: "text-[#BF2EB6]",
      trend: "up",
      description: "8% from last week",
    },
    {
      title: "Total Sales",
      data: "₱125,840",
      icon: IconChartArrowsVertical,
      iconBgColor: "bg-[#837F00]/30",
      iconColor: "text-[#837F00]",
      trend: "up",
      description: "23% from last week",
    },
    {
      title: "Pending Payments",
      data: "18",
      icon: IconCalendarCheck,
      iconBgColor: "bg-[#F91F1F]/30",
      iconColor: "text-[#F91F1F]",
      trend: "down",
      description: "Needs attention",
    },
  ];

  return (
    <div className="mt-10 grid lg:grid-cols-4 grid-cols-1 gap-10">
      {stats.map((stat) => (
        <StatsCard key={stat.title} stat={stat} />
      ))}
    </div>
  );
};
