import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface RecentOrderItem {
  id: string;
  orderNumber: string;
  customerName: string;
  schedule: string;
  items: number;
  amount: number;
  status: "Pending" | "To Pay" | "Processing" | "Ready" | "Completed" | "Cancelled";
}

interface RecentOrderTableProps {
  orders: RecentOrderItem[];
  isLoading?: boolean;
}

const formatMoney = (value: number) =>
  new Intl.NumberFormat("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

const getBadgeVariant = (status: RecentOrderItem["status"]) => {
  if (status === "Completed") return "completed" as const;
  if (status === "Processing" || status === "Ready") return "preparing" as const;
  return "pending" as const;
};

const getBadgeClassName = (status: RecentOrderItem["status"]) => {
  if (status === "Cancelled") return "bg-red-500 text-white";
  if (status === "To Pay") return "bg-orange-500 text-white";
  if (status === "Ready") return "bg-emerald-600 text-white";
  return "";
};

export const RecentOrderTable = ({
  orders,
  isLoading = false,
}: RecentOrderTableProps) => {
  const skeletonRows = 5;
  return (
    <div className="mt-10">
      <Card className="border-3 border-[#07484A] bg-[#D3E9FF]">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold tracking-tight text-[#07484A]">
            Recent Orders
          </CardTitle>
        </CardHeader>

        <CardContent>
          <Table>
            <TableHeader className="bg-[#07484A38]">
              <TableRow>
                <TableHead className="px-4">Order Number</TableHead>
                <TableHead className="px-4">Customer Name</TableHead>
                <TableHead className="px-4">Schedule</TableHead>
                <TableHead className="px-4">Items</TableHead>
                <TableHead className="px-4">Amount</TableHead>
                <TableHead className="px-4">Status</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {isLoading ? (
                Array.from({ length: skeletonRows }).map((_, index) => (
                  <TableRow key={`recent-order-skeleton-${index}`}>
                    <TableCell className="p-4"><div className="h-4 w-22 animate-pulse rounded bg-[#07484A]/10" /></TableCell>
                    <TableCell className="p-4"><div className="h-4 w-32 animate-pulse rounded bg-[#07484A]/10" /></TableCell>
                    <TableCell className="p-4"><div className="h-4 w-28 animate-pulse rounded bg-[#07484A]/10" /></TableCell>
                    <TableCell className="p-4"><div className="h-4 w-10 animate-pulse rounded bg-[#07484A]/10" /></TableCell>
                    <TableCell className="p-4"><div className="h-4 w-24 animate-pulse rounded bg-[#07484A]/10" /></TableCell>
                    <TableCell className="p-4"><div className="h-6 w-18 animate-pulse rounded-full bg-[#07484A]/10" /></TableCell>
                  </TableRow>
                ))
              ) : orders.length > 0 ? (
                orders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="p-4">{order.orderNumber}</TableCell>
                    <TableCell className="p-4">{order.customerName}</TableCell>
                    <TableCell className="p-4">{order.schedule}</TableCell>
                    <TableCell className="p-4">{order.items}</TableCell>
                    <TableCell className="p-4">PHP {formatMoney(order.amount)}</TableCell>
                    <TableCell>
                      <Badge
                        variant={getBadgeVariant(order.status)}
                        className={getBadgeClassName(order.status)}
                      >
                        {order.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-[#07484A]/70">
                    No recent orders found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
