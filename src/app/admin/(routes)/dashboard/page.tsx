import "@/lib/orpc.server";
import { getQueryClient, HydrateClient } from "@/lib/query/hydration";
import { orpc } from "@/lib/orpc";
import { DashboardClient } from "./_components/DashboardClient";

export const dynamic = "force-dynamic";

const Page = async () => {
  const queryClient = getQueryClient();
  await queryClient.prefetchQuery(orpc.dashboard.summary.queryOptions());

  return (
    <HydrateClient client={queryClient}>
      <DashboardClient />
    </HydrateClient>
  );
};

export default Page;
