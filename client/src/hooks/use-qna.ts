import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type AskQuestionInput, type QnaListResponse, type QnaResponse } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

// Helper to safely parse and log Zod errors
function parseWithLogging<T>(schema: z.ZodSchema<T>, data: unknown, label: string): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    console.error(`[Zod] ${label} validation failed:`, result.error.format());
    throw new Error(`Invalid response format from ${label}`);
  }
  return result.data;
}

export function useQnaList() {
  return useQuery({
    queryKey: [api.qna.list.path],
    queryFn: async () => {
      const res = await fetch(api.qna.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch questions and answers");
      const data = await res.json();
      return parseWithLogging(api.qna.list.responses[200], data, "qna.list");
    },
  });
}

export function useAskQuestion() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: AskQuestionInput) => {
      const validatedInput = api.qna.ask.input.parse(input);
      
      const res = await fetch(api.qna.ask.path, {
        method: api.qna.ask.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validatedInput),
        credentials: "include",
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        if (res.status === 400) {
          const error = api.qna.ask.responses[400].parse(errorData);
          throw new Error(error.message || "Invalid request");
        }
        throw new Error(errorData.message || "An unexpected error occurred while asking the AI");
      }

      const data = await res.json();
      return parseWithLogging(api.qna.ask.responses[201], data, "qna.ask");
    },
    onSuccess: () => {
      // Invalidate the list to fetch the new item
      queryClient.invalidateQueries({ queryKey: [api.qna.list.path] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to ask question",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
