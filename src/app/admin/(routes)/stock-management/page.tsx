import { getQueryClient, HydrateClient } from "@/lib/query/hydration";
import { StockClient } from "./_components/StockClient";
import { orpc } from "@/lib/orpc";

const Page = async () => {
  const queryClient = getQueryClient();

  await queryClient.prefetchQuery(orpc.stock.list.queryOptions());
  return (
    <HydrateClient client={queryClient}>
      <StockClient />
    </HydrateClient>
  );
};

export default Page;
