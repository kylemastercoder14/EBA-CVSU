import { Heading } from "@/components/Heading";
import { RecentOrderTable } from './_components/RecentOrderTable';
import { StatsSection } from './_components/StatsSection';

const Page = () => {
  return (
    <div>
      <Heading
        title="Dashboard Overview"
        description="Management Dashboard"
      />

      <StatsSection />
      <RecentOrderTable />
    </div>
  );
};

export default Page;
