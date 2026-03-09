import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import OpenAI from "openai";

const openrouter = new OpenAI({
  baseURL: "https://api.groq.com/openai/v1",
  apiKey: process.env.GROQ_API_KEY,
});

// Search real USPTO patents
async function searchPatents(query: string) {
  try {
    const searchUrl = `https://api.patentsview.org/patents/query`;
    const response = await fetch(
      `https://search.patentsview.org/api/v1/patent/?q={"_text_all":{"patent_abstract":"${encodeURIComponent(query)}"}}&f=["patent_title","patent_abstract","patent_date","inventor_last_name"]&s=[{"patent_date":"desc"}]&o={"per_page":3}`,
      { headers: { "Accept": "application/json" } }
    );
    const data = await response.json() as any;
    const patents = data?.patents || [];
    return patents.map((p: any) => ({
      title: p.patent_title || "Unknown Title",
      abstract: p.patent_abstract || "No abstract available",
      inventor: p.inventors?.[0]?.inventor_last_name || "Unknown",
      date: p.patent_date || "Unknown date",
    }));
  } catch (err) {
    console.error("Patent search error:", err);
    return [];
  }
}

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
      
      // Search real USPTO patents first
      const patents = await searchPatents(input.question);
      
      // Build patent context string
      const patentContext = patents.length > 0
        ? `Here are relevant real patents from the USPTO database:\n\n${patents.map((p: any, i: number) => 
            `Patent ${i + 1}: "${p.title}"\nInventor: ${p.inventor}\nDate: ${p.date}\nAbstract: ${p.abstract}`
          ).join("\n\n")}\n\n`
        : "No directly relevant patents were found in the USPTO database.\n\n";

      const response = await openrouter.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [
          { 
            role: "system", 
            content: "You are an expert patent attorney assistant specializing in technology and software patents. Only answer questions related to patents, intellectual property, and patent law. Always explain things in plain English that a non-lawyer can understand. When someone describes an invention, help them understand if it might be patentable. Always remind users that you are an AI and they should consult a real licensed patent attorney for serious legal matters. When patents are provided, reference them specifically in your answer." 
          },
          { 
            role: "user", 
            content: `${patentContext}User question: ${input.question}` 
          }
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