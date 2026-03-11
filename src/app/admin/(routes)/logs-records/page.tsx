import "@/lib/orpc.server";
import { getQueryClient, HydrateClient } from "@/lib/query/hydration";
import { LogsClient } from "./_components/LogsClient";
import { orpc } from "@/lib/orpc";

export const dynamic = "force-dynamic";

const Page = async () => {
  const queryClient = getQueryClient();

  await queryClient.prefetchQuery(orpc.logs.list.queryOptions());
  return (
    <HydrateClient client={queryClient}>
      <LogsClient />
    </HydrateClient>
  );
};

export default Page;
