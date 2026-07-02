// FILE: /frontend/hooks/usePaginatedExpenses.ts
// NEW HOOK: Efficient pagination for expense lists

import { useState, useCallback, useEffect } from "react";
import { useStore } from "../store/useStore";
import type { Expense } from "../constants/mockData";

const PAGE_SIZE = 20;

export function usePaginatedExpenses(filters?: {
  month?: string;
  category?: string;
  listId?: number;
}) {
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const allExpenses = useStore((s) => s.expenses);
  const [displayedExpenses, setDisplayedExpenses] = useState<Expense[]>([]);

  // Filter expenses based on criteria
  const filteredExpenses = useCallback(() => {
    let results = [...allExpenses];

    if (filters?.month) {
      const [year, month] = filters.month.split("-");
      results = results.filter((e) => {
        const d = new Date(e.date);
        return (
          d.getFullYear() === parseInt(year) &&
          d.getMonth() + 1 === parseInt(month)
        );
      });
    }

    if (filters?.category) {
      results = results.filter((e) => e.category === filters.category);
    }

    if (filters?.listId) {
      results = results.filter((e) => e.list_id === filters.listId);
    }

    return results;
  }, [allExpenses, filters]);

  // Load page
  const loadMore = useCallback(() => {
    setIsLoading(true);
    
    // Simulate async load (in real app, fetch from API)
    setTimeout(() => {
      const filtered = filteredExpenses();
      const startIdx = 0;
      const endIdx = page * PAGE_SIZE;
      
      setDisplayedExpenses(filtered.slice(startIdx, endIdx));
      setHasMore(endIdx < filtered.length);
      setIsLoading(false);
    }, 300);
  }, [page, filteredExpenses]);

  useEffect(() => {
    loadMore();
  }, [page, filters, loadMore]);

  const nextPage = useCallback(() => {
    if (hasMore && !isLoading) {
      setPage((p) => p + 1);
    }
  }, [hasMore, isLoading]);

  return {
    expenses: displayedExpenses,
    isLoading,
    hasMore,
    page,
    nextPage,
    reset: () => setPage(1),
  };
}

/* USAGE EXAMPLE in dashboard:

import { usePaginatedExpenses } from "../../hooks/usePaginatedExpenses";
import { FlatList } from "react-native";

export default function Dashboard() {
  const [month, setMonth] = useState("2026-07");
  const { expenses, hasMore, isLoading, nextPage } = usePaginatedExpenses({
    month,
  });

  return (
    <FlatList
      data={expenses}
      renderItem={({ item }) => <ExpenseCard expense={item} />}
      keyExtractor={(item) => item.id.toString()}
      onEndReached={nextPage}
      onEndReachedThreshold={0.5}
      ListFooterComponent={
        isLoading && hasMore ? <ActivityIndicator /> : null
      }
    />
  );
}

BENEFITS:
- Loads 20 items at a time (configurable)
- Smooth scroll performance (no lag)
- Auto-loads next page when user scrolls near bottom
- Reduces memory usage with large datasets
- Better UX: progressive loading feel
*/
