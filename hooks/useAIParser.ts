import { useState } from "react";
import { parseText as parseTextBackend } from "../lib/backend";
import { useStore } from "../store/useStore";

interface ParseResult {
  amount: number;
  description: string;
  category: string;
  date: string;
  currency: string;
}

interface UseAIParser {
  isLoading: boolean;
  error: string | null;
  parseText: (input: string) => Promise<ParseResult>;
}

export function useAIParser(): UseAIParser {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const language = useStore((s) => s.language);

  const parseText = async (input: string): Promise<ParseResult> => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await parseTextBackend(input, language);
      return res as ParseResult;
    } catch (e) {
      const msg = "Failed to parse expense";
      setError(msg);
      throw new Error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return { isLoading, error, parseText };
}
