import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import OpenAI from "openai";

const openrouter = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENROUTER_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENROUTER_API_KEY,
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  app.get(api.qna.list.path, async (req, res) => {
    const qnas = await storage.getQnas();
    res.json(qnas);
  });

  app.post(api.qna.ask.path, async (req, res) => {
    try {
      const input = api.qna.ask.input.parse(req.body);
      
      const response = await openrouter.chat.completions.create({
        model: "meta-llama/llama-3.3-70b-instruct", // Defaulting to a strong model
        messages: [
          { role: "system", content: "You are a helpful and concise AI assistant. Answer the user's question directly." },
          { role: "user", content: input.question }
        ],
      });
      
      const answer = response.choices[0]?.message?.content || "Sorry, I could not generate an answer.";
      
      const qna = await storage.createQna({
        question: input.question,
        answer: answer,
      });
      
      res.status(201).json(qna);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0]?.message || "Validation error",
          field: err.errors[0]?.path.join('.'),
        });
      }
      console.error("Error asking question:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  return httpServer;
}
