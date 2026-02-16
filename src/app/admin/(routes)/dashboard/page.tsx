import { Heading } from "@/components/Heading";
import {
  IconCalendarCheck,
  IconChartArrowsVertical,
  IconShoppingCart,
  IconTrendingDown,
  IconTrendingUp,
} from "@tabler/icons-react";
import { type Icon } from "@tabler/icons-react";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { Badge } from '@/components/ui/badge';

interface StatsType {
  title: string;
  data: string;
  icon: Icon;
  iconBgColor: string;
  iconColor: string;
  trend: "up" | "down";
  description: string;
}

const Page = () => {
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
    <div>
      <Heading title="Dashboard Overview" description="Management Dashboard" />
      <div className="mt-10 grid lg:grid-cols-4 grid-cols-1 gap-10">
        {stats.map((stat) => (
          <Card
            key={stat.title}
            className="border-3 border-[#07484A] bg-[#D3E9FF]"
          >
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
                    stat.iconBgColor,
                  )}
                >
                  {stat.icon && (
                    <stat.icon className={cn("size-8", stat.iconColor)} />
                  )}
                </div>
              </CardAction>
            </CardHeader>
            <CardFooter className="flex-col items-start gap-1.5">
              <div
                className={cn(
                  "line-clamp-1 flex items-center gap-2 font-medium",
                  stat.trend === "up" ? "text-green-800" : "text-red-800",
                )}
              >
                {stat.trend === "up" ? (
                  <IconTrendingUp className="size-4" />
                ) : (
                  <IconTrendingDown className="size-4" />
                )}{" "}
                {stat.description}
              </div>
            </CardFooter>
          </Card>
        ))}
      </div>
      <div className="mt-10">
        <Card className="border-3 gap-2! border-[#07484A] bg-[#D3E9FF]">
          <CardHeader>
            <CardTitle className="text-2xl font-semibold tracking-tight text-[#07484A]">
              Recent Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader className='bg-[#07484A38]'>
                <TableRow className='hover:bg-[#07484A38]!'>
                  <TableHead className='px-4'>Order Number</TableHead>
                  <TableHead className='px-4'>Customer Name</TableHead>
                  <TableHead className='px-4'>Schedule</TableHead>
                  <TableHead className='px-4'>Items</TableHead>
                  <TableHead className='px-4'>Amount</TableHead>
                  <TableHead className='px-4'>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className='p-4 text-base'>ORD-123456</TableCell>
                  <TableCell className='p-4 text-base'>Maria Santos</TableCell>
                  <TableCell className='p-4 text-base'>December 02, 2025</TableCell>
                  <TableCell className='p-4 text-base'>1</TableCell>
                  <TableCell className='p-4 text-base'>₱2,450</TableCell>
				  <TableCell>
					<Badge variant="preparing">Preparing</Badge>
				  </TableCell>
                </TableRow>
				<TableRow>
                  <TableCell className='p-4 text-base'>ORD-654321</TableCell>
                  <TableCell className='p-4 text-base'>Juan Dela Cruz</TableCell>
                  <TableCell className='p-4 text-base'>November 26, 2025</TableCell>
                  <TableCell className='p-4 text-base'>2</TableCell>
                  <TableCell className='p-4 text-base'>₱1,890</TableCell>
				  <TableCell>
					<Badge variant="pending">Pending</Badge>
				  </TableCell>
                </TableRow>
				<TableRow>
                  <TableCell className='p-4 text-base'>ORD-123456</TableCell>
                  <TableCell className='p-4 text-base'>Ana Reyes</TableCell>
                  <TableCell className='p-4 text-base'>December 15, 2025</TableCell>
                  <TableCell className='p-4 text-base'>2</TableCell>
                  <TableCell className='p-4 text-base'>₱400</TableCell>
				  <TableCell>
					<Badge variant="completed">Completed</Badge>
				  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Page;
