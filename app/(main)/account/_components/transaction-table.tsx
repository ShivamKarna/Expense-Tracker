"use client";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { categoryColors } from "@/data/categories";
import { Badge } from "@/components/ui/badge";
import {
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Clock,
  MoreHorizontal,
  RefreshCw,
  Search,
  Trash,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import useFetch from "@/hooks/use-fetch";
import { bulkDeleteTransactions, getAccountWithTransactionsPaginated } from "@/actions/accounts";
import { toast } from "sonner";
import { BarLoader } from "react-spinners";

const RECURRING_INTERVALS: Record<string, string> = {
  DAILY: "Daily",
  WEEKLY: "Weekly",
  MONTHLY: "Monthly",
  YEARLY: "Yearly",
};

type Transaction = {
  id: string;
  type: string;
  amount: number | { toNumber: () => number };
  description: string | null;
  date: Date | string;
  category: string;
  isReccuring: boolean;
  reccuringInterval: string | null;
  nextReccuringDate: Date | string | null;
};

type SortConfig = {
  field: "date" | "category" | "amount";
  direction: "asc" | "desc";
};

const TransactionTable = ({
  accountId,
}: {
  accountId: string;
}) => {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    field: "date",
    direction: "desc",
  });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [searchTerm, setSearchTerm]= useState("");
  const [typeFilter, setTypeFilter]= useState("");
  const [recurringFilter, setRecurringFilter]= useState("");

  const {
    loading: fetchLoading,
    fn: fetchTransactions,
    data: accountData,
  } = useFetch(getAccountWithTransactionsPaginated);

  const {
    loading : deleteLoading,
    fn : deletefn,
    data : deleted,
  } = useFetch(bulkDeleteTransactions);

  // Fetch transactions when page or pageSize changes
  useEffect(() => {
    fetchTransactions(accountId, page, pageSize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountId, page, pageSize]);

  // Refetch after deletion
  useEffect(() => {
    if(deleted && !deleteLoading){
      toast.error("Transactions deleted successfully");
      fetchTransactions(accountId, page, pageSize);
      setSelectedIds([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deleted, deleteLoading]);

  const transactions = accountData?.transactions || [];
  const pagination = accountData?.pagination || { page: 1, pageSize: 10, totalCount: 0, totalPages: 1 };

  const getAmountAsNumber = (amount: number | { toNumber: () => number }): number => {
    if (typeof amount === "number") {
      return amount;
    }
    return amount.toNumber();
  };

  const handleBulkDelete = async()=>{
    if(
      !window.confirm(
      `Are you confirm you want to delete ${selectedIds.length} Transactions?`
    )){
      return;
    }

    deletefn(selectedIds);
  }


  const filteredAndSortedTransactions = useMemo(()=>{
    let result = [...transactions];

    // search filter
    if(searchTerm){
      const searchLower = searchTerm.toLocaleLowerCase();

      result = result.filter((tr)=>
      tr.description?.toLocaleLowerCase().includes(searchLower)
    );
    }

    // recurringFilter
    if(recurringFilter){

      result = result.filter((tr)=>{
        if(recurringFilter ==="recurring") return tr.isReccuring;
        return !tr.isReccuring;
      }
    );
    }

    // typeFilter
    if(typeFilter){
      result = result.filter((tr)=> tr.type === typeFilter);
    }

    // Apply sorting
    result.sort((a, b) => {
      let aValue: string | number | Date;
      let bValue: string | number | Date;

      switch (sortConfig.field) {
        case "date":
          aValue = new Date(a.date).getTime();
          bValue = new Date(b.date).getTime();
          break;
        case "category":
          aValue = a.category.toLowerCase();
          bValue = b.category.toLowerCase();
          break;
        case "amount":
          aValue = getAmountAsNumber(a.amount);
          bValue = getAmountAsNumber(b.amount);
          break;
        default:
          return 0;
      }

      if (aValue < bValue) {
        return sortConfig.direction === "asc" ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === "asc" ? 1 : -1;
      }
      return 0;
    });

    return result;
  },[
    transactions,
    searchTerm,
    typeFilter,
    recurringFilter,
    sortConfig
  ])
  const handleSort = (field: "date" | "category" | "amount") => {
    setSortConfig((current) => ({
      field,
      direction:
        current.field === field && current.direction === "asc" ? "desc" : "asc",
    }));
  };

  const handleSelect = (id: string) => {
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  };
  const handleSelectAll = () => {
    setSelectedIds((current) =>
      current.length === filteredAndSortedTransactions.length
        ? []
        : filteredAndSortedTransactions.map((t) => t.id),
    );
  };

  const handleClearFilters = ()=>{
    setSearchTerm("");
    setTypeFilter("");
    setRecurringFilter("");
    setSelectedIds([]);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setPage(newPage);
      setSelectedIds([]);
    }
  };

  const handlePageSizeChange = (newPageSize: string) => {
    setPageSize(Number(newPageSize));
    setPage(1);
    setSelectedIds([]);
  };
  return (
    <div className="space-y-4">
      {(deleteLoading || fetchLoading) && 
    <BarLoader className="mt-4" width={"100%"}color="#26d212"/>
      }


    <div className="flex flex-col sm:flex-row gap-4">
      <div className="relative flex-1">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground"/>
        <Input placeholder="Search Transactions..." value={searchTerm} onChange={(e)=> setSearchTerm(e.target.value) } className="pl-8"/>
      </div>
      <div className="flex gap-2">
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger> 
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="INCOME">Income</SelectItem>
            <SelectItem value="EXPENSE">Expense</SelectItem>
          </SelectContent>
        </Select>
        <Select value={recurringFilter} onValueChange={(value)=>setRecurringFilter(value)}>
          <SelectTrigger className="w-[160px]"> 
            <SelectValue placeholder="All Transactions" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="recurring">Recurring Only</SelectItem>
            <SelectItem value="non-recurring">Non-Recurring Only</SelectItem>
          </SelectContent>
        </Select>

        {selectedIds.length >0 && (
          <div className="flex items-center gap-2">
            <Button variant={"destructive"} size="sm" onClick={handleBulkDelete}>
              <Trash className="h-4 w-4 mr-2"/>
              Delete Selected ({selectedIds.length})
            </Button>
          </div>
        )}

        {(searchTerm || typeFilter || recurringFilter) && (
          <Button variant="outline" size="icon" onClick={handleClearFilters} title="Clear Filters">
            <X className="h-4 w-5"/>
          </Button>
        )}
      </div>
    </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12.5">
                <Checkbox
                  onCheckedChange={handleSelectAll}
                  checked={
                    selectedIds.length ===
                      filteredAndSortedTransactions.length &&
                    filteredAndSortedTransactions.length > 0
                  }
                />
              </TableHead>
              <TableHead
                className="cursor-pointer"
                onClick={() => handleSort("date")}
              >
                <div className="flex items-center">
                  Date{" "}
                  {sortConfig.field === "date" &&
                    (sortConfig.direction === "asc" ? (
                      <ChevronUp className="ml-1 h-4 w-4" />
                    ) : (
                      <ChevronDown className="ml-1 h-4 w-4" />
                    ))}
                </div>
              </TableHead>
              <TableHead>Description</TableHead>
              <TableHead
                className="cursor-pointer"
                onClick={() => handleSort("category")}
              >
                <div className="flex items-center">
                  Category
                  {sortConfig.field === "category" &&
                    (sortConfig.direction === "asc" ? (
                      <ChevronUp className="ml-1 h-4 w-4" />
                    ) : (
                      <ChevronDown className="ml-1 h-4 w-4" />
                    ))}
                </div>
              </TableHead>
              <TableHead
                className="cursor-pointer"
                onClick={() => handleSort("amount")}
              >
                <div className="flex items-center justify-end">
                  Amount{" "}
                  {sortConfig.field === "amount" &&
                    (sortConfig.direction === "asc" ? (
                      <ChevronUp className="ml-1 h-4 w-4" />
                    ) : (
                      <ChevronDown className="ml-1 h-4 w-4" />
                    ))}
                </div>
              </TableHead>
              <TableHead>Recurring</TableHead>
              <TableHead className="w-12.5" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAndSortedTransactions.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-center text-muted-foreground"
                >
                  No Transactions Found
                </TableCell>
              </TableRow>
            ) : (
              filteredAndSortedTransactions.map((transaction) => (
                <TableRow key={transaction.id}>
                  <TableCell>
                    <Checkbox
                      onCheckedChange={() => handleSelect(transaction.id)}
                      checked={selectedIds.includes(transaction.id)}
                    />
                  </TableCell>
                  <TableCell>
                    {format(new Date(transaction.date), "PP")}
                  </TableCell>
                  <TableCell>{transaction.description}</TableCell>
                  <TableCell className="capitalize">
                    <span
                      style={{
                        background: categoryColors[transaction.category],
                      }}
                      className="px-2 py-1 rounded text-white text-sm"
                    >
                      {transaction.category}
                    </span>
                  </TableCell>
                  <TableCell
                    className="text-right font-medium"
                    style={{
                      color: transaction.type === "EXPENSE" ? "red" : "green",
                    }}
                  >
                    {transaction.type === "EXPENSE" ? "-" : "+"} Rs Rs{" "}
                    {getAmountAsNumber(transaction.amount).toFixed(2)}
                  </TableCell>
                  <TableCell>
                    {transaction.isReccuring ? (
                      <Tooltip>
                        <TooltipTrigger>
                          <Badge
                            variant="outline"
                            className="gap-1 bg-green-100 text-green-700 hover:bg-green-400"
                          >
                            <RefreshCw className="h-3 w-3" />
                            {transaction.reccuringInterval &&
                              RECURRING_INTERVALS[
                                transaction.reccuringInterval
                              ]}
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>
                          <div className="text-sm">
                            <div className="font-medium">Next Date :</div>
                            <div>
                              {transaction.nextReccuringDate &&
                                format(
                                  new Date(transaction.nextReccuringDate),
                                  "PP",
                                )}
                            </div>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      <Badge variant="outline" className="gap-1">
                        <Clock className="h-3 w-3" />
                        One-time
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem
                          onClick={() =>
                            router.push(
                              `/transaction/create?edit=${transaction.id}`,
                            )
                          }
                        >
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => deletefn([transaction.id])} 
                        >
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Controls */}
      {pagination.totalCount > 0 && (
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-2">
            <p className="text-sm text-muted-foreground">
              Showing {(page - 1) * pageSize + 1} to{" "}
              {Math.min(page * pageSize, pagination.totalCount)} of{" "}
              {pagination.totalCount} transactions
            </p>
            <Select value={pageSize.toString()} onValueChange={handlePageSizeChange}>
              <SelectTrigger className="w-[100px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-sm text-muted-foreground">per page</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(page - 1)}
              disabled={page === 1 || fetchLoading}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                let pageNum: number;
                if (pagination.totalPages <= 5) {
                  pageNum = i + 1;
                } else if (page <= 3) {
                  pageNum = i + 1;
                } else if (page >= pagination.totalPages - 2) {
                  pageNum = pagination.totalPages - 4 + i;
                } else {
                  pageNum = page - 2 + i;
                }
                return (
                  <Button
                    key={pageNum}
                    variant={page === pageNum ? "default" : "outline"}
                    size="sm"
                    onClick={() => handlePageChange(pageNum)}
                    disabled={fetchLoading}
                    className="w-8 h-8 p-0"
                  >
                    {pageNum}
                  </Button>
                );
              })}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(page + 1)}
              disabled={page === pagination.totalPages || fetchLoading}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransactionTable;
