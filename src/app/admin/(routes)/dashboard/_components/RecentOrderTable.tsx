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

export const RecentOrderTable = () => {
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
              <TableRow>
                <TableCell className="p-4">ORD-123456</TableCell>
                <TableCell className="p-4">Maria Santos</TableCell>
                <TableCell className="p-4">December 02, 2025</TableCell>
                <TableCell className="p-4">1</TableCell>
                <TableCell className="p-4">₱2,450</TableCell>
                <TableCell>
                  <Badge variant="preparing">Preparing</Badge>
                </TableCell>
              </TableRow>

              <TableRow>
                <TableCell className="p-4">ORD-654321</TableCell>
                <TableCell className="p-4">Juan Dela Cruz</TableCell>
                <TableCell className="p-4">November 26, 2025</TableCell>
                <TableCell className="p-4">2</TableCell>
                <TableCell className="p-4">₱1,890</TableCell>
                <TableCell>
                  <Badge variant="pending">Pending</Badge>
                </TableCell>
              </TableRow>

              <TableRow>
                <TableCell className="p-4">ORD-789123</TableCell>
                <TableCell className="p-4">Ana Reyes</TableCell>
                <TableCell className="p-4">December 15, 2025</TableCell>
                <TableCell className="p-4">2</TableCell>
                <TableCell className="p-4">₱400</TableCell>
                <TableCell>
                  <Badge variant="completed">Completed</Badge>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
