import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { IconTrendingDown, IconTrendingUp, type Icon } from "@tabler/icons-react";

export interface StatsType {
  title: string;
  data: string;
  icon: Icon;
  iconBgColor: string;
  iconColor: string;
  trend: "up" | "down";
  description: string;
}

interface StatsCardProps {
  stat: StatsType;
}

export const StatsCard = ({ stat }: StatsCardProps) => {
  return (
    <Card className="border-3 border-[#07484A] bg-[#D3E9FF]">
      <CardHeader>
        <CardDescription className="text-[#07484A] text-base">
          {stat.title}
        </CardDescription>

        <CardTitle className="text-3xl font-bold tracking-tight text-[#07484A]">
          {stat.data}
        </CardTitle>

        <CardAction>
          <div
            className={cn(
              "size-13 flex items-center justify-center shrink-0 rounded-full",
              stat.iconBgColor
            )}
          >
            <stat.icon className={cn("size-8", stat.iconColor)} />
          </div>
        </CardAction>
      </CardHeader>

      <CardFooter className="flex-col items-start gap-1.5">
        <div
          className={cn(
            "line-clamp-1 flex items-center gap-2 font-medium",
            stat.trend === "up" ? "text-green-800" : "text-red-800"
          )}
        >
          {stat.trend === "up" ? (
            <IconTrendingUp className="size-4" />
          ) : (
            <IconTrendingDown className="size-4" />
          )}
          {stat.description}
        </div>
      </CardFooter>
    </Card>
  );
};
