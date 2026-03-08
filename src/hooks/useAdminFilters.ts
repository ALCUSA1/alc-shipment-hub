import { useState, useMemo, useCallback } from "react";
import { isAfter, isBefore, startOfDay, endOfDay } from "date-fns";

export interface UseAdminFiltersOptions<T> {
  data: T[] | undefined;
  searchFields: (item: T) => (string | null | undefined)[];
  statusField?: (item: T) => string | null | undefined;
  dateField?: (item: T) => string | null | undefined;
}

export function useAdminFilters<T>({ data, searchFields, statusField, dateField }: UseAdminFiltersOptions<T>) {
  const [search, setSearch] = useState("");
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});

  const onFilterChange = useCallback((key: string, value: string) => {
    setFilterValues((prev) => ({ ...prev, [key]: value }));
  }, []);

  const filtered = useMemo(() => {
    let list = data || [];

    // Text search
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((item) =>
        searchFields(item).some((f) => f?.toLowerCase().includes(q))
      );
    }

    // Status filter
    const statusVal = filterValues.status;
    if (statusVal && statusVal !== "all" && statusField) {
      list = list.filter((item) => statusField(item) === statusVal);
    }

    // Carrier filter
    const carrierVal = filterValues.carrier;
    if (carrierVal && carrierVal !== "all") {
      list = list.filter((item) => {
        const fields = searchFields(item);
        return fields.some((f) => f === carrierVal);
      });
    }

    // Custom filters (non-status, non-carrier)
    for (const [key, val] of Object.entries(filterValues)) {
      if (key === "status" || key === "carrier" || !val || val === "all") continue;
      // Custom filter handled by caller via filterValues
    }

    // Date range
    if (dateField && (dateRange.from || dateRange.to)) {
      list = list.filter((item) => {
        const d = dateField(item);
        if (!d) return false;
        const date = new Date(d);
        if (dateRange.from && isBefore(date, startOfDay(dateRange.from))) return false;
        if (dateRange.to && isAfter(date, endOfDay(dateRange.to))) return false;
        return true;
      });
    }

    return list;
  }, [data, search, filterValues, dateRange, searchFields, statusField, dateField]);

  return {
    search,
    setSearch,
    filterValues,
    onFilterChange,
    dateRange,
    setDateRange,
    filtered,
  };
}
