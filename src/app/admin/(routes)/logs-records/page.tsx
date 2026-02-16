"use client";

import { Heading } from "@/components/Heading";
import { useState } from "react";
import { LogsRecordsContent } from "./_components/LogsRecordsContent";
import { initialLogs } from "./_components/logs";
import { LogRecord } from "./_components/types";

const Page = () => {
  const [logs] = useState<LogRecord[]>(initialLogs);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.logId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.user.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesType = typeFilter === "all" || log.type === typeFilter;
    const matchesCategory = categoryFilter === "all" || log.category === categoryFilter;

    return matchesSearch && matchesType && matchesCategory;
  });

  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentLogs = filteredLogs.slice(startIndex, endIndex);

  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(Number(value));
    setCurrentPage(1);
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  const handleTypeFilterChange = (value: string) => {
    setTypeFilter(value);
    setCurrentPage(1);
  };

  const handleCategoryFilterChange = (value: string) => {
    setCategoryFilter(value);
    setCurrentPage(1);
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <Heading
          title="Logs & Records"
          description="Track system activities and monitor all transactions"
        />
      </div>

      <div className="mt-10">
        <LogsRecordsContent
          logs={currentLogs}
          searchQuery={searchQuery}
          typeFilter={typeFilter}
          categoryFilter={categoryFilter}
          currentPage={currentPage}
          totalPages={totalPages}
          itemsPerPage={itemsPerPage}
          startIndex={startIndex}
          endIndex={endIndex}
          totalFilteredItems={filteredLogs.length}
          onSearchChange={handleSearchChange}
          onTypeFilterChange={handleTypeFilterChange}
          onCategoryFilterChange={handleCategoryFilterChange}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={handleItemsPerPageChange}
        />
      </div>
    </div>
  );
};

export default Page;
