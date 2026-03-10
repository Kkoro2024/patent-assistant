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

const SYSTEM_PROMPTS: Record<string, string> = {
  chat: `You are an expert patent attorney assistant specializing in technology and software patents.
Only answer questions related to patents, intellectual property, and patent law.
Always explain things in plain English that a non-lawyer can understand.
When patents are provided to you, ONLY cite those exact patents by their patent number. Never invent or hallucinate patent numbers that were not provided.
Format patent citations like: "According to US[patent_number] ([title])..."
Maintain conversation context and refer back to previously discussed patents when relevant.
IMPORTANT: Never include any disclaimer about not being a licensed attorney. Do not add any legal disclaimers.`,

  evaluator: `You are a patent viability expert. When given an invention idea, you MUST respond in exactly this structured format and nothing else:

PATENTABILITY SCORE: [X/10]

NOVELTY: [High / Medium / Low]
OBVIOUSNESS RISK: [High / Medium / Low]  
PRIOR ART RISK: [High / Medium / Low]
COMMERCIAL POTENTIAL: [High / Medium / Low]

VERDICT: [1-2 sentence plain English summary of whether this is worth pursuing]

STRENGTHS:
• [strength 1]
• [strength 2]
• [strength 3]

WEAKNESSES:
• [weakness 1]
• [weakness 2]

RECOMMENDATION:
[2-3 sentences on what the inventor should do next]

Always be direct and honest. Do not add any disclaimers or legal warnings.`,

  search: `You are a patent search specialist. Your job is to help users find and understand existing patents.
When patents are provided, analyze them in detail — explain what they cover, who owns them, and what they mean for someone trying to build in that space.
Always tell the user if a technology space is crowded or open.
Be specific about patent numbers and dates.
Never invent patent numbers. Only reference patents actually provided to you.
Do not add any disclaimers.`,
};

async function searchPatents(query: string) {
  try {
    const companyMatch = query.match(/\b(Apple|Google|Microsoft|Samsung|Amazon|Meta|Tesla|IBM|Intel|Qualcomm)\b/i);
    const company = companyMatch ? companyMatch[1] : null;

    const stopWords = new Set(["what", "patents", "does", "hold", "related", "about", "those", "their", "show", "have", "with", "that", "this", "from", "which", "where", "when", "how", "can", "the", "for", "and", "are", "its"]);

    const keywords = query
      .replace(/[?!.,]/g, "")
      .split(" ")
      .map(w => w.toLowerCase())
      .filter(w => w.length > 3)
      .filter(w => !stopWords.has(w))
      .filter(w => company ? w !== company.toLowerCase() : true)
      .slice(0, 3)
      .join(" ");

    const searchQuery = company ? `${company} ${keywords}` : keywords;
    console.log(`Searching patents for: "${searchQuery}"`);

    const response = await fetch(
      `https://serpapi.com/search.json?engine=google_patents&q=${encodeURIComponent(searchQuery)}&api_key=${process.env.SERPAPI_KEY}&num=10&hl=en`,
      { headers: { "Accept": "application/json" } }
    );
    const data = await response.json() as any;
    const results = data?.organic_results || [];

    const usPatents = results.filter((r: any) => {
      const id = r.publication_number || r.patent_id || "";
      const assignee = (r.assignee || "").toLowerCase();
      const isUS = id.startsWith("US");
      const assigneeMatch = company ? assignee.includes(company.toLowerCase()) : true;
      return isUS && assigneeMatch;
    });

    console.log(`Found ${usPatents.length} US patents`);
    return usPatents.slice(0, 5).map((r: any) => ({
      id: r.publication_number || r.patent_id || "Unknown",
      title: r.title || "Unknown Title",
      abstract: (r.snippet || "No abstract available").slice(0, 300) + "...",
      inventor: r.inventor || "Unknown",
      assignee: r.assignee || "Individual inventor",
      date: r.grant_date || r.publication_date || "Unknown date",
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
      const history: { role: "user" | "assistant"; content: string }[] = req.body.history || [];
      const existingPatentContext: string = req.body.patentContext || "";
      const mode: string = req.body.mode || "chat";

      // Only search patents on the first message (skip for evaluator mode)
      let patentContext = existingPatentContext;
      if (history.length === 0 && mode !== "evaluator") {
        const patents = await searchPatents(input.question);
        patentContext = patents.length > 0
          ? `Here are ${patents.length} relevant real patents from the USPTO database:\n\n${patents.map((p: any, i: number) =>
              `Patent ${i + 1}:\n- Patent Number: ${p.id}\n- Title: "${p.title}"\n- Inventor(s): ${p.inventor}\n- Assignee: ${p.assignee}\n- Date: ${p.date}\n- Abstract: ${p.abstract}`
            ).join("\n\n")}`
          : "";
      }

      const systemPrompt = SYSTEM_PROMPTS[mode] || SYSTEM_PROMPTS.chat;

      const messages = [
        { role: "system" as const, content: systemPrompt },
        ...(patentContext ? [{
          role: "user" as const,
          content: `For this entire conversation, here are the relevant patents to reference:\n\n${patentContext}`
        }, {
          role: "assistant" as const,
          content: "Understood. I will only reference these specific patents when answering questions in our conversation."
        }] : []),
        ...history,
        { role: "user" as const, content: input.question }
      ];

      const response = await openrouter.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages,
      });

      const answer = response.choices[0]?.message?.content || "Sorry, I could not generate an answer.";
      const qna = await storage.createQna({ question: input.question, answer });
      res.status(201).json({ ...qna, patentContext });
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