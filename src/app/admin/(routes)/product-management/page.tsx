import { ProductClient } from "./_components/ProductClient";
import { orpc } from "@/lib/orpc";
import { getQueryClient, HydrateClient } from "@/lib/query/hydration";

const Page = async () => {
  const queryClient = getQueryClient();

  await queryClient.prefetchQuery(orpc.product.list.queryOptions());
  return (
    <HydrateClient client={queryClient}>
      <ProductClient />
    </HydrateClient>
  );
};

export default Page;
