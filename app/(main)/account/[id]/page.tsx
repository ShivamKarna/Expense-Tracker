import { Suspense } from "react";
import { BarLoader } from "react-spinners";
import { notFound } from "next/navigation";
import { getAccountWithTransactions } from "@/actions/accounts";
import TransactionTable from "../_components/transaction-table";

export default async function AccountPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const accountData = await getAccountWithTransactions(id);

  if (!accountData) {
    notFound();
  }

  const { transactions, ...account } = accountData;

  return (
    <div className="space-y-8 px-3 sm:px-5 max-w-full overflow-x-hidden">
      <div className="flex flex-col sm:flex-row gap-4 sm:items-end sm:justify-between">
        <div className="min-w-0 flex-1">
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight gradient-title capitalize wrap-break-word">
            {account.name}
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            {account.type.charAt(0) + account.type.slice(1).toLowerCase()}{" "}
            Account
          </p>
        </div>

        <div className="text-left sm:text-right pb-2 min-w-0">
          <div className="text-lg sm:text-xl lg:text-2xl font-bold wrap-break-word">
            ${parseFloat(account.balance.toString()).toFixed(2)}
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground">
            {account._count?.transactions || 0} Transactions
          </p>
        </div>
      </div>

      {/* Chart Section */}
      <Suspense
        fallback={<BarLoader className="mt-4" width={"100%"} color="#9333ea" />}
      >
        {/* <AccountChart transactions={transactions} /> */}
      </Suspense>

      {/* Transactions Table */}
      <Suspense
        fallback={<BarLoader className="mt-4" width={"100%"} color="#9333ea" />}
      >
        <TransactionTable accountId={id} />
      </Suspense>
    </div>
  );
}
