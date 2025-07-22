import React, { useState, useMemo } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

interface Column<T> {
  header: string | React.ReactNode;
  accessor: keyof T | ((row: T) => React.ReactNode);
  sortKey?: keyof T;
  className?: string;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  actions?: (row: T) => React.ReactNode;
  rowKey: (row: T) => string | number;
  searchTerm?: string;
  searchKeys?: (keyof T)[];
}

const DataTable = <T,>({
  data = [],
  columns,
  actions,
  rowKey,
  searchTerm = "",
  searchKeys = [],
}: DataTableProps<T>) => {
  const [sortKey, setSortKey] = useState<keyof T | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  const handleSort = (key: keyof T) => {
    if (key === sortKey) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortOrder("asc");
    }
  };

  const filteredData = useMemo(() => {
    let filtered = [...data];

    if (searchTerm && searchKeys.length) {
      filtered = filtered.filter((item) =>
        searchKeys.some((key) =>
          String(item[key] ?? "")
            .toLowerCase()
            .includes(searchTerm.toLowerCase())
        )
      );
    }

    if (sortKey) {
      filtered.sort((a, b) => {
        const aVal = a[sortKey];
        const bVal = b[sortKey];

        if (aVal === undefined || bVal === undefined) return 0;

        if (typeof aVal === "number" && typeof bVal === "number") {
          return sortOrder === "asc" ? aVal - bVal : bVal - aVal;
        }

        return sortOrder === "asc"
          ? String(aVal).localeCompare(String(bVal))
          : String(bVal).localeCompare(String(aVal));
      });
    }

    return filtered;
  }, [data, searchTerm, searchKeys, sortKey, sortOrder]);

  return (
    <div className="overflow-x-auto bg-white rounded-xl shadow-md border border-gray-200">
      <table className="min-w-full text-sm text-left text-gray-800">
        <thead className="bg-gray-50 text-gray-600 uppercase text-xs sticky top-0 z-10">
          <tr>
            {columns.map((col, idx) => (
              <th
                key={idx}
                onClick={() =>
                  typeof col.accessor === "string" && handleSort(col.accessor)
                }
                className={`px-5 py-4 whitespace-nowrap font-semibold tracking-wide cursor-pointer select-none ${col.className || ""}`}
              >
                <div className="flex items-center gap-1">
                  {col.header}
                  {sortKey === col.accessor && (
                    sortOrder === "asc" ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                  )}
                </div>
              </th>
            ))}
            {actions && (
              <th className="px-5 py-4 whitespace-nowrap font-semibold tracking-wide">
                Actions
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {filteredData.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length + (actions ? 1 : 0)}
                className="px-5 py-6 text-center text-gray-400 italic"
              >
                No data available.
              </td>
            </tr>
          ) : (
            filteredData.map((row, rowIndex) => (
              <tr
                key={rowKey(row)}
                className={`border-t transition-colors ${
                  rowIndex % 2 === 0 ? "bg-white" : "bg-gray-50"
                } hover:bg-blue-50`}
              >
                {columns.map((col, idx) => (
                  <td
                    key={idx}
                    className={`px-5 py-4 whitespace-nowrap ${col.className || ""}`}
                  >
                    {typeof col.accessor === "function"
                      ? col.accessor(row)
                      : String(row[col.accessor] ?? "")}
                  </td>
                ))}
                {actions && (
                  <td className="px-5 py-4 whitespace-nowrap">{actions(row)}</td>
                )}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default DataTable;
