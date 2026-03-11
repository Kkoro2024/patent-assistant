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
  chat: `You are an expert patent attorney assistant with deep knowledge across ALL patent fields including technology, software, pharmaceuticals, biotechnology, mechanical engineering, chemical engineering, consumer products, medical devices, food & beverage, agriculture, fashion/design, and more.
Only answer questions related to patents, intellectual property, and patent law.
Always explain things in plain English that a non-lawyer can understand.
When patents are provided to you at the start of conversation, prefer citing those. However, if a user mentions a specific patent number directly in their message, you MAY reference and discuss it even if it wasn't in the initial search results.
Never invent or hallucinate patent numbers that were not provided or mentioned by the user.
Format patent citations like: "According to US[patent_number] ([title])..."
Maintain conversation context and refer back to previously discussed patents when relevant.
IMPORTANT: Never include any disclaimer about not being a licensed attorney. Do not add any legal disclaimers.`,

  evaluator: `You are a patent viability expert across ALL industries — technology, pharma, biotech, mechanical, chemical, consumer goods, medical devices, food, agriculture, fashion, and more. When given an invention idea, you MUST respond in exactly this structured format and nothing else:

PATENTABILITY SCORE: [X/10]
BUSINESS VIABILITY SCORE: [X/10]

NOVELTY: [High / Medium / Low]
OBVIOUSNESS RISK: [High / Medium / Low]
PRIOR ART RISK: [High / Medium / Low]
COMMERCIAL POTENTIAL: [High / Medium / Low]

VERDICT: [1-2 sentence plain English summary of whether this is worth pursuing as a patent AND as a business]

STRENGTHS:
- [strength 1]
- [strength 2]
- [strength 3]

WEAKNESSES:
- [weakness 1]
- [weakness 2]

RECOMMENDATION:
[2-3 sentences on what the inventor should do next]

PATENTABILITY SCORE measures legal protectability — is this new and unique enough to patent?
BUSINESS VIABILITY SCORE measures commercial potential — would people actually buy this?
These two scores will often be very different. Be honest about both.
Always be direct. Do not add any disclaimers or legal warnings.`,

  search: `You are a patent search specialist covering ALL patent fields — not just technology. This includes pharmaceuticals, biotech, mechanical devices, chemicals, consumer products, medical devices, food processes, agricultural methods, fashion/design patents, writing instruments, everyday objects, and more.
When patents are provided, analyze them in detail — explain what they cover, who owns them, and what they mean for someone trying to build in that space.
If a user mentions a specific patent number in conversation, discuss it directly even if it wasn't in the initial results.
Always tell the user if a space is crowded or open.
Be specific about patent numbers and dates.
Never invent patent numbers. Only reference patents actually provided to you or mentioned by the user.
Do not add any disclaimers.`,

  drafter: `You are an expert patent attorney who drafts professional patent claims across ALL fields — technology, pharma, biotech, mechanical, chemical, consumer products, medical devices, food, agriculture, writing instruments, everyday objects, and design patents. When a user describes an invention, you MUST respond in exactly this format:

INVENTION TITLE: [Short descriptive title]

INDEPENDENT CLAIM 1:
A [device/method/system/composition/process] comprising:
- [element 1];
- [element 2];
- [element 3]; and
- [element 4].

DEPENDENT CLAIM 2:
The [device/method/system/composition/process] of claim 1, wherein [specific detail about element].

DEPENDENT CLAIM 3:
The [device/method/system/composition/process] of claim 1, further comprising [additional element].

ABSTRACT:
[2-3 sentences describing the invention in plain English]

DRAFTING NOTES:
- [Important note about claim scope]
- [Suggestion to strengthen the patent]
- [Any potential weaknesses to address]

Write claims in proper USPTO legal language. Make independent claim 1 as broad as possible while still being novel. Do not add any disclaimers.`,

  infringement: `You are a patent infringement analysis expert covering ALL industries — technology, pharma, biotech, mechanical, chemical, consumer products, medical devices, food, agriculture, fashion, writing instruments, everyday objects, and more. When a user describes a product or technology, and patents are provided, you MUST respond in exactly this format:

INFRINGEMENT RISK LEVEL: [High / Medium / Low / Minimal]

OVERALL ASSESSMENT:
[2-3 sentences summarizing the infringement risk]

PATENT ANALYSIS:
For each patent provided, analyze:
- Patent [number]: [LIKELY INFRINGED / POSSIBLY INFRINGED / UNLIKELY INFRINGED]
  - Reason: [Brief explanation of why or why not]
  - Claims at risk: [Which claims could be problematic]

SAFE HARBOR SUGGESTIONS:
- [How to modify the product to avoid infringement 1]
- [How to modify the product to avoid infringement 2]
- [How to modify the product to avoid infringement 3]

RECOMMENDED NEXT STEPS:
[2-3 sentences on what to do based on the risk level]

Be direct and specific. Only reference patents actually provided or mentioned by the user. Do not add any disclaimers.`,
};

async function searchPatents(query: string) {
  try {
    const companyMatch = query.match(/\b(Apple|Google|Microsoft|Samsung|Amazon|Meta|Tesla|IBM|Intel|Qualcomm|Pfizer|Johnson|Bayer|BASF|3M|Procter|Gamble|Nike|Monsanto|Moderna|AstraZeneca|Sony|Canon|Dyson|Gillette|Colgate|Nestle|Unilever)\b/i);
    const company = companyMatch ? companyMatch[1] : null;

    const stopWords = new Set([
      "what", "patents", "does", "hold", "related", "about", "those", "their",
      "show", "have", "with", "that", "this", "from", "which", "where", "when",
      "how", "can", "the", "for", "and", "are", "its", "any", "exist", "find",
      "search", "me", "tell", "give", "list", "please", "patent",
    ]);

    const keywords = query
      .replace(/[?!.,]/g, "")
      .split(" ")
      .map(w => w.toLowerCase())
      .filter(w => w.length > 2)
      .filter(w => !stopWords.has(w))
      .filter(w => company ? w !== company.toLowerCase() : true)
      .slice(0, 5)
      .join(" ");

    const searchQuery = company ? `${company} ${keywords}` : keywords;
    console.log(`Searching patents for: "${searchQuery}"`);

    const response = await fetch(
      `https://serpapi.com/search.json?engine=google_patents&q=${encodeURIComponent(searchQuery)}&api_key=${process.env.SERPAPI_KEY}&num=15&hl=en`,
      { headers: { "Accept": "application/json" } }
    );
    const data = await response.json() as any;
    const results = data?.organic_results || [];

    const filtered = results.filter((r: any) => {
      const assignee = (r.assignee || "").toLowerCase();
      return company ? assignee.includes(company.toLowerCase()) : true;
    });

    const finalResults = filtered.length > 0 ? filtered : results;

    console.log(`Found ${finalResults.length} patents`);
    return finalResults.slice(0, 8).map((r: any) => ({
      id: r.publication_number || r.patent_id || "Unknown",
      title: r.title || "Unknown Title",
      abstract: (r.snippet || "No abstract available").slice(0, 400) + "...",
      inventor: r.inventor || "Unknown",
      assignee: r.assignee || "Individual inventor",
      date: r.grant_date || r.publication_date || "Unknown date",
    }));
  } catch (err) {
    console.error("Patent search error:", err);
    return [];
  }
}

async function searchPatentTrends(query: string) {
  try {
    const response = await fetch(
      `https://serpapi.com/search.json?engine=google_patents&q=${encodeURIComponent(query)}&api_key=${process.env.SERPAPI_KEY}&num=100&hl=en`,
      { headers: { "Accept": "application/json" } }
    );
    const data = await response.json() as any;
    const results = data?.organic_results || [];

    const yearCounts: Record<string, number> = {};
    const assigneeCounts: Record<string, number> = {};

    results.forEach((r: any) => {
      const date = r.grant_date || r.publication_date || "";
      const year = date.match(/\d{4}/)?.[0];
      if (year && parseInt(year) >= 2010 && parseInt(year) <= 2025) {
        yearCounts[year] = (yearCounts[year] || 0) + 1;
      }
      const assignee = r.assignee || "Individual";
      if (assignee && assignee !== "Individual") {
        const normalized: Record<string, string> = {
          "엘지전자": "LG Electronics",
          "삼성전자": "Samsung Electronics",
          "삼성": "Samsung",
          "화웨이": "Huawei",
          "소니": "Sony",
        };
        let shortName = assignee.split(" ").slice(0, 2).join(" ");
        for (const [foreign, english] of Object.entries(normalized)) {
          if (assignee.includes(foreign)) { shortName = english; break; }
        }
        assigneeCounts[shortName] = (assigneeCounts[shortName] || 0) + 1;
      }
    });

    const yearData = Object.entries(yearCounts)
      .sort(([a], [b]) => parseInt(a) - parseInt(b))
      .map(([year, count]) => ({ year, count }));

    const topAssignees = Object.entries(assigneeCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    return { query, total: results.length, yearData, topAssignees };
  } catch (err) {
    console.error("Trends search error:", err);
    return { query, total: 0, yearData: [], topAssignees: [] };
  }
}

async function fetchPatentTimeline(company: string) {
  try {
    const response = await fetch(
      `https://serpapi.com/search.json?engine=google_patents&q=${encodeURIComponent(company)}&api_key=${process.env.SERPAPI_KEY}&num=100&hl=en`,
      { headers: { "Accept": "application/json" } }
    );
    const data = await response.json() as any;
    const results = data?.organic_results || [];

    const patents = results
      .filter((r: any) => {
        const assignee = (r.assignee || "").toLowerCase();
        return assignee.includes(company.toLowerCase());
      })
      .map((r: any) => ({
        id: r.publication_number || r.patent_id || "Unknown",
        title: r.title || "Unknown Title",
        inventor: r.inventor || "Unknown",
        assignee: r.assignee || company,
        date: r.grant_date || r.publication_date || "",
        abstract: (r.snippet || "").slice(0, 150) + "...",
      }))
      .filter((p: any) => p.date)
      .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return { company, patents };
  } catch (err) {
    console.error("Timeline fetch error:", err);
    return { company, patents: [] };
  }
}

async function fetchPatentLandscape(query: string) {
  try {
    const response = await fetch(
      `https://serpapi.com/search.json?engine=google_patents&q=${encodeURIComponent(query)}&api_key=${process.env.SERPAPI_KEY}&num=100&hl=en`,
      { headers: { "Accept": "application/json" } }
    );
    const data = await response.json() as any;
    const results = data?.organic_results || [];

    const assigneeCounts: Record<string, number> = {};
    const assigneeYears: Record<string, number[]> = {};

    results.forEach((r: any) => {
      const assignee = r.assignee || "Individual";
      if (!assignee || assignee === "Individual") return;

      const normalized: Record<string, string> = {
        "엘지전자": "LG Electronics",
        "삼성전자": "Samsung Electronics",
        "삼성": "Samsung",
        "화웨이": "Huawei",
        "소니": "Sony",
      };
      let shortName = assignee.split(" ").slice(0, 3).join(" ");
      for (const [foreign, english] of Object.entries(normalized)) {
        if (assignee.includes(foreign)) { shortName = english; break; }
      }

      assigneeCounts[shortName] = (assigneeCounts[shortName] || 0) + 1;

      const date = r.grant_date || r.publication_date || "";
      const year = date.match(/\d{4}/)?.[0];
      if (year) {
        if (!assigneeYears[shortName]) assigneeYears[shortName] = [];
        assigneeYears[shortName].push(parseInt(year));
      }
    });

    const bubbles = Object.entries(assigneeCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 12)
      .map(([name, count], i) => {
        const years = assigneeYears[name] || [];
        const avgYear = years.length > 0
          ? Math.round(years.reduce((a, b) => a + b, 0) / years.length)
          : 2018;
        return { name, count, avgYear, rank: i };
      });

    return { query, total: results.length, bubbles };
  } catch (err) {
    console.error("Landscape fetch error:", err);
    return { query, total: 0, bubbles: [] };
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

  app.get("/api/trends", async (req, res) => {
    const query = (req.query.q as string) || "";
    if (!query.trim()) return res.status(400).json({ message: "Query required" });
    const trends = await searchPatentTrends(query);
    res.json(trends);
  });

  app.get("/api/timeline", async (req, res) => {
    const company = (req.query.company as string) || "";
    if (!company.trim()) return res.status(400).json({ message: "Company required" });
    const timeline = await fetchPatentTimeline(company);
    res.json(timeline);
  });

  app.get("/api/landscape", async (req, res) => {
    const query = (req.query.q as string) || "";
    if (!query.trim()) return res.status(400).json({ message: "Query required" });
    const landscape = await fetchPatentLandscape(query);
    res.json(landscape);
  });

  app.post(api.qna.ask.path, async (req, res) => {
    try {
      const input = api.qna.ask.input.parse(req.body);
      const history: { role: "user" | "assistant"; content: string }[] = req.body.history || [];
      const existingPatentContext: string = req.body.patentContext || "";
      const mode: string = req.body.mode || "chat";

      let patentContext = existingPatentContext;
      if (history.length === 0 && mode !== "evaluator" && mode !== "drafter") {
        const patents = await searchPatents(input.question);
        patentContext = patents.length > 0
          ? `Here are ${patents.length} relevant patents found for this topic:\n\n${patents.map((p: any, i: number) =>
              `Patent ${i + 1}:\n- Patent Number: ${p.id}\n- Title: "${p.title}"\n- Inventor(s): ${p.inventor}\n- Assignee: ${p.assignee}\n- Date: ${p.date}\n- Abstract: ${p.abstract}`
            ).join("\n\n")}`
          : "";
      }

      const systemPrompt = SYSTEM_PROMPTS[mode] || SYSTEM_PROMPTS.chat;

      const messages = [
        { role: "system" as const, content: systemPrompt },
        ...(patentContext ? [{
          role: "user" as const,
          content: `For context, here are relevant patents found for this topic:\n\n${patentContext}`
        }, {
          role: "assistant" as const,
          content: "Understood. I'll use these as my primary reference, but I'll also discuss any specific patent numbers you mention directly in our conversation."
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