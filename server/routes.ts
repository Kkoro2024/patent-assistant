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

// Search real USPTO patents via PatentsView
async function searchPatents(query: string) {
  try {
    const response = await fetch(
      `https://search.patentsview.org/api/v1/patent/?q={"_text_all":{"patent_abstract":"${encodeURIComponent(query)}"}}&f=["patent_id","patent_title","patent_abstract","patent_date","inventor_last_name","inventor_first_name","assignee_organization"]&s=[{"patent_date":"desc"}]&o={"per_page":5}`,
      { headers: { "Accept": "application/json" } }
    );
    const data = await response.json() as any;
    const patents = data?.patents || [];
    return patents.map((p: any) => ({
      id: p.patent_id || "Unknown",
      title: p.patent_title || "Unknown Title",
      abstract: (p.patent_abstract || "No abstract available").slice(0, 300) + "...",
      inventor: `${p.inventors?.[0]?.inventor_first_name || ""} ${p.inventors?.[0]?.inventor_last_name || "Unknown"}`.trim(),
      assignee: p.assignees?.[0]?.assignee_organization || "Individual inventor",
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

      // Build patent context string with patent numbers for citation
      const patentContext = patents.length > 0
        ? `Here are ${patents.length} relevant real patents from the official USPTO database:\n\n${patents.map((p: any, i: number) =>
            `Patent ${i + 1}:\n- Patent Number: US${p.id}\n- Title: "${p.title}"\n- Inventor(s): ${p.inventor}\n- Assignee: ${p.assignee}\n- Date: ${p.date}\n- Abstract: ${p.abstract}`
          ).join("\n\n")}\n\n`
        : "No directly relevant patents were found in the USPTO database for this query.\n\n";

      const response = await openrouter.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content: `You are an expert patent attorney assistant specializing in technology and software patents. 
Only answer questions related to patents, intellectual property, and patent law. 
Always explain things in plain English that a non-lawyer can understand. 
When patents are provided from the USPTO database, you MUST cite them by their patent number (e.g. US10,123,456) when they are relevant to your answer.
Format patent citations clearly like: "According to US[patent_number] ([title])..."
Always remind users that you are an AI and they should consult a real licensed patent attorney for serious legal matters.`
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