"use client";

import { Heading } from "@/components/Heading";
import { useState } from "react";
import { LogsRecordsContent } from "./LogsRecordsContent";
import { LogRecord } from "./types";
import { useSuspenseQuery } from "@tanstack/react-query";
import { orpc } from "@/lib/orpc";
import { LogCategory, LogType } from "@/generated/prisma";

type TypeFilter = LogType | "all";
type CategoryFilter = LogCategory | "all";
type SortOption =
  | "createdAt_desc"
  | "createdAt_asc"
  | "id_asc"
  | "id_desc"
  | "description_asc"
  | "description_desc";

export const LogsClient = () => {
  const {
    data: { logs: initialLogs },
  } = useSuspenseQuery(orpc.logs.list.queryOptions());
  const [logs] = useState<LogRecord[]>(initialLogs);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
  const [sortBy, setSortBy] = useState<SortOption>("createdAt_desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.logCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.actorName.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesType = typeFilter === "all" || log.type === typeFilter;
    const matchesCategory =
      categoryFilter === "all" || log.category === categoryFilter;

    return matchesSearch && matchesType && matchesCategory;
  });

  const sortedLogs = [...filteredLogs].sort((a, b) => {
    switch (sortBy) {
      case "createdAt_asc":
        return (
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
      case "id_asc":
        return a.id.localeCompare(b.id);
      case "id_desc":
        return b.id.localeCompare(a.id);
      case "description_asc":
        return a.description.localeCompare(b.description);
      case "description_desc":
        return b.description.localeCompare(a.description);
      case "createdAt_desc":
      default:
        return (
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
    }
  });

  const totalPages = Math.ceil(sortedLogs.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentLogs = sortedLogs.slice(startIndex, endIndex);

  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(Number(value));
    setCurrentPage(1);
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  const handleTypeFilterChange = (value: string) => {
    setTypeFilter(value as TypeFilter);
    setCurrentPage(1);
  };

  const handleCategoryFilterChange = (value: string) => {
    setCategoryFilter(value as CategoryFilter);
    setCurrentPage(1);
  };

  const handleSortChange = (value: string) => {
    setSortBy(value as SortOption);
    setCurrentPage(1);
  };

  const handleHeaderSort = (key: string) => {
    if (key === "id") {
      setSortBy((prev) => (prev === "id_asc" ? "id_desc" : "id_asc"));
    } else if (key === "description") {
      setSortBy((prev) =>
        prev === "description_asc" ? "description_desc" : "description_asc",
      );
    } else if (key === "createdAt") {
      setSortBy((prev) =>
        prev === "createdAt_asc" ? "createdAt_desc" : "createdAt_asc",
      );
    }
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
          sortBy={sortBy}
          currentPage={currentPage}
          totalPages={totalPages}
          itemsPerPage={itemsPerPage}
          startIndex={startIndex}
          endIndex={endIndex}
          totalFilteredItems={filteredLogs.length}
          onSearchChange={handleSearchChange}
          onTypeFilterChange={handleTypeFilterChange}
          onCategoryFilterChange={handleCategoryFilterChange}
          onSortChange={handleSortChange}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={handleItemsPerPageChange}
          onHeaderSort={handleHeaderSort}
        />
      </div>
    </div>
  );
};
