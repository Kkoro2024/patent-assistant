import { z } from "zod";
import { insertQnaSchema, qnas } from "./schema";

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

export const api = {
  qna: {
    list: {
      method: "GET" as const,
      path: "/api/qna" as const,
      responses: {
        200: z.array(z.custom<typeof qnas.$inferSelect>()),
      },
    },
    ask: {
      method: "POST" as const,
      path: "/api/qna" as const,
      input: z.object({ question: z.string().min(1, "Question is required") }),
      responses: {
        201: z.custom<typeof qnas.$inferSelect>(),
        400: errorSchemas.validation,
        500: errorSchemas.internal,
      },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}

export type AskQuestionInput = z.infer<typeof api.qna.ask.input>;
export type QnaListResponse = z.infer<typeof api.qna.list.responses[200]>;
export type QnaResponse = z.infer<typeof api.qna.ask.responses[201]>;
export type ValidationError = z.infer<typeof errorSchemas.validation>;
export type InternalError = z.infer<typeof errorSchemas.internal>;
