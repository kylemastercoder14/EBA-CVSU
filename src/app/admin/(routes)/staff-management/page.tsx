import "@/lib/orpc.server";
import { StaffClient } from "./_components/StaffClient";
import { orpc } from "@/lib/orpc";
import { getQueryClient, HydrateClient } from "@/lib/query/hydration";

export const dynamic = "force-dynamic";

const Page = async () => {
  const queryClient = getQueryClient();

  await queryClient.prefetchQuery(orpc.staff.list.queryOptions());

  return (
    <HydrateClient client={queryClient}>
      <StaffClient />
    </HydrateClient>
  );
};

export default Page;
