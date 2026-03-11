import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAskQuestion } from "@/hooks/use-qna";
import { Sparkles, Loader2, CornerDownLeft, Scale, Search, Lightbulb, FileText, ShieldAlert, TrendingUp, Clock, Map } from "lucide-react";
import { z } from "zod";
import { api } from "@shared/routes";

type Message = { role: "user" | "assistant"; content: string; };
type Mode = "comparison" | "evaluator" | "search" | "drafter" | "infringement" | "trends" | "timeline" | "landscape";

type TrendData = {
  query: string; total: number;
  yearData: { year: string; count: number }[];
  topAssignees: { name: string; count: number }[];
};
type ComparisonData = { a: TrendData; b: TrendData; };
type TimelineData = {
  company: string;
  patents: { id: string; title: string; inventor: string; assignee: string; date: string; abstract: string }[];
};
type LandscapeData = {
  query: string; total: number;
  bubbles: { name: string; count: number; avgYear: number; rank: number }[];
};

const MODES: { id: Mode; label: string; icon: any; description: string; placeholder: string; suggestions: string[] }[] = [
  {
    id: "comparison", label: "Compare Industries", icon: Scale,
    description: "Compare two technology fields head-to-head by patent activity",
    placeholder: "Enter two industries separated by vs (e.g. AI vs Blockchain)...",
    suggestions: ["artificial intelligence vs blockchain", "electric vehicles vs hydrogen fuel", "augmented reality vs virtual reality", "quantum computing vs classical computing"]
  },
  {
    id: "timeline", label: "Patent Timeline", icon: Clock,
    description: "See a company's key patents plotted across time",
    placeholder: "Enter a company name (e.g. Apple, Tesla, Google)...",
    suggestions: ["Apple", "Tesla", "Google", "Microsoft"]
  },
  {
    id: "landscape", label: "Landscape Map", icon: Map,
    description: "See which companies dominate a technology space",
    placeholder: "Enter a technology field (e.g. artificial intelligence)...",
    suggestions: ["artificial intelligence", "electric vehicle battery", "augmented reality", "quantum computing"]
  },
  {
    id: "evaluator", label: "Idea Evaluator", icon: Lightbulb,
    description: "Describe your invention and get a patentability + business score",
    placeholder: "Describe your invention idea in detail...",
    suggestions: ["An app that uses AI to match lawyers with clients", "A water bottle that tracks your daily hydration", "A new algorithm for compressing video files", "A shoe sole that generates electricity while walking"]
  },
  {
    id: "search", label: "Patent Search", icon: Search,
    description: "Search and analyze existing patents by keyword",
    placeholder: "Search for patents related to...",
    suggestions: ["Search patents related to facial recognition", "What patents exist for wireless charging?", "Find patents on blockchain technology", "Show me Tesla's battery patents"]
  },
  {
    id: "drafter", label: "Patent Drafter", icon: FileText,
    description: "Get a professional patent claim draft for your invention",
    placeholder: "Describe your invention in detail — how it works, what makes it unique...",
    suggestions: ["A smart lock that opens using facial recognition on your phone", "A method for filtering microplastics from tap water using magnets", "An AI system that predicts traffic jams 30 minutes in advance", "A wearable device that monitors blood sugar without needles"]
  },
  {
    id: "infringement", label: "Infringement Check", icon: ShieldAlert,
    description: "Check if your product may infringe existing patents",
    placeholder: "Describe your product or technology in detail...",
    suggestions: ["A fingerprint scanner built into a phone screen", "An app that lets users pay with a QR code", "A foldable phone with a flexible display", "Wireless earbuds that automatically pause when removed"]
  },
  {
    id: "trends", label: "Trends", icon: TrendingUp,
    description: "Visualize patent filing trends for any technology",
    placeholder: "Enter a technology keyword (e.g. 'artificial intelligence')...",
    suggestions: ["artificial intelligence", "electric vehicle battery", "augmented reality", "quantum computing"]
  },
];

function parseEvaluatorResponse(content: string) {
  const patScore = content.match(/PATENTABILITY SCORE:\s*(\d+)\/10/)?.[1];
  const bizScore = content.match(/BUSINESS VIABILITY SCORE:\s*(\d+)\/10/)?.[1];
  if (!patScore && !bizScore) return null;
  const novelty = content.match(/NOVELTY:\s*(\w+)/)?.[1];
  const obviousness = content.match(/OBVIOUSNESS RISK:\s*(\w+)/)?.[1];
  const priorArt = content.match(/PRIOR ART RISK:\s*(\w+)/)?.[1];
  const commercial = content.match(/COMMERCIAL POTENTIAL:\s*(\w+)/)?.[1];
  const verdict = content.match(/VERDICT:\s*([\s\S]+?)(?=\n\nSTRENGTHS|\nSTRENGTHS)/)?.[1]?.trim();
  const strengthsMatch = content.match(/STRENGTHS:\s*([\s\S]+?)(?=\n\nWEAKNESSES)/)?.[1];
  const weaknessesMatch = content.match(/WEAKNESSES:\s*([\s\S]+?)(?=\n\nRECOMMENDATION)/)?.[1];
  const recommendation = content.match(/RECOMMENDATION:\s*([\s\S]+?)$/)?.[1]?.trim();
  const strengths = strengthsMatch?.match(/•\s*(.+)/g)?.map(s => s.replace(/^•\s*/, '')) || [];
  const weaknesses = weaknessesMatch?.match(/•\s*(.+)/g)?.map(s => s.replace(/^•\s*/, '')) || [];
  return { patScore: parseInt(patScore || "0"), bizScore: parseInt(bizScore || "0"), novelty, obviousness, priorArt, commercial, verdict, strengths, weaknesses, recommendation };
}

function ScoreRing({ score, label, color }: { score: number; label: string; color: string }) {
  const radius = 28; const circumference = 2 * Math.PI * radius;
  const progress = (score / 10) * circumference;
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-20 h-20">
        <svg className="w-20 h-20 -rotate-90" viewBox="0 0 72 72">
          <circle cx="36" cy="36" r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="6" />
          <circle cx="36" cy="36" r={radius} fill="none" stroke={color} strokeWidth="6"
            strokeDasharray={`${progress} ${circumference}`} strokeLinecap="round"
            style={{ transition: "stroke-dasharray 1s ease" }} />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xl font-bold text-white">{score}<span className="text-xs text-white/50">/10</span></span>
        </div>
      </div>
      <span className="text-xs text-white/60 text-center leading-tight">{label}</span>
    </div>
  );
}

function RiskBadge({ label, value }: { label: string; value?: string }) {
  const colors: Record<string, string> = {
    High: "bg-red-500/20 text-red-300 border-red-500/30",
    Medium: "bg-amber-500/20 text-amber-300 border-amber-500/30",
    Low: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  };
  const color = colors[value || ""] || "bg-white/10 text-white/60 border-white/20";
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] text-white/40 uppercase tracking-wider">{label}</span>
      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium w-fit ${color}`}>{value || "—"}</span>
    </div>
  );
}

function EvaluatorCard({ data }: { data: NonNullable<ReturnType<typeof parseEvaluatorResponse>> }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl overflow-hidden border border-white/10 bg-gradient-to-b from-white/5 to-white/[0.02]">
      <div className="px-6 py-5 border-b border-white/10 flex justify-around">
        <ScoreRing score={data.patScore} label="Patentability" color="#c9a84c" />
        <ScoreRing score={data.bizScore} label="Business Viability" color="#60a5fa" />
      </div>
      <div className="px-6 py-4 grid grid-cols-2 gap-3 border-b border-white/10">
        <RiskBadge label="Novelty" value={data.novelty} />
        <RiskBadge label="Obviousness Risk" value={data.obviousness} />
        <RiskBadge label="Prior Art Risk" value={data.priorArt} />
        <RiskBadge label="Commercial Potential" value={data.commercial} />
      </div>
      {data.verdict && (
        <div className="px-6 py-4 border-b border-white/10">
          <p className="text-xs text-white/40 uppercase tracking-wider mb-1">Verdict</p>
          <p className="text-sm text-white/80 leading-relaxed">{data.verdict}</p>
        </div>
      )}
      <div className="px-6 py-4 grid grid-cols-2 gap-4 border-b border-white/10">
        {data.strengths.length > 0 && (
          <div>
            <p className="text-xs text-emerald-400/70 uppercase tracking-wider mb-2">Strengths</p>
            <ul className="space-y-1">
              {data.strengths.map((s, i) => (
                <li key={i} className="text-xs text-white/70 flex gap-1.5"><span className="text-emerald-400 mt-0.5">+</span>{s}</li>
              ))}
            </ul>
          </div>
        )}
        {data.weaknesses.length > 0 && (
          <div>
            <p className="text-xs text-red-400/70 uppercase tracking-wider mb-2">Weaknesses</p>
            <ul className="space-y-1">
              {data.weaknesses.map((w, i) => (
                <li key={i} className="text-xs text-white/70 flex gap-1.5"><span className="text-red-400 mt-0.5">−</span>{w}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
      {data.recommendation && (
        <div className="px-6 py-4">
          <p className="text-xs text-[#c9a84c]/70 uppercase tracking-wider mb-1">Recommendation</p>
          <p className="text-sm text-white/70 leading-relaxed">{data.recommendation}</p>
        </div>
      )}
    </motion.div>
  );
}

function TrendsChart({ data }: { data: TrendData }) {
  const maxCount = Math.max(...data.yearData.map(d => d.count), 1);
  const maxAssignee = Math.max(...data.topAssignees.map(d => d.count), 1);
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl overflow-hidden border border-white/10 bg-gradient-to-b from-white/5 to-white/[0.02]">
      <div className="px-6 py-4 border-b border-white/10">
        <p className="text-xs text-white/40 uppercase tracking-wider mb-1">Patent Trends</p>
        <p className="text-lg font-bold text-white" style={{ fontFamily: "Georgia, serif" }}>"{data.query}"</p>
        <p className="text-xs mt-1" style={{ color: "#c9a84c" }}>{data.total} patents analyzed</p>
      </div>
      {data.yearData.length > 0 && (
        <div className="px-6 py-5 border-b border-white/10">
          <p className="text-xs text-white/40 uppercase tracking-wider mb-4">Filings by Year</p>
          <div className="flex items-end gap-1.5" style={{ height: "128px" }}>
            {data.yearData.map((d, i) => (
              <div key={d.year} className="flex flex-col items-center gap-1 flex-1">
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${Math.max((d.count / maxCount) * 112, 4)}px` }}
                  transition={{ delay: i * 0.05, duration: 0.5, ease: "easeOut" }}
                  className="w-full rounded-t-sm min-h-[4px]"
                  style={{ background: "linear-gradient(to top, #c9a84c, #e8c97a)", opacity: 0.7 + (d.count / maxCount) * 0.3 }}
                  title={`${d.year}: ${d.count} patents`}
                />
                <span className="text-[9px] text-white/30" style={{ fontFamily: "system-ui" }}>{d.year.slice(2)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {data.topAssignees.length > 0 && (
        <div className="px-6 py-5">
          <p className="text-xs text-white/40 uppercase tracking-wider mb-4">Top Patent Holders</p>
          <div className="space-y-3">
            {data.topAssignees.map((a, i) => (
              <div key={a.name} className="space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-white/70" style={{ fontFamily: "system-ui" }}>{a.name}</span>
                  <span className="text-xs font-bold" style={{ color: "#c9a84c", fontFamily: "system-ui" }}>{a.count}</span>
                </div>
                <div className="h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
                  <motion.div initial={{ width: 0 }} animate={{ width: `${(a.count / maxAssignee) * 100}%` }}
                    transition={{ delay: 0.3 + i * 0.1, duration: 0.6, ease: "easeOut" }}
                    className="h-full rounded-full" style={{ background: "linear-gradient(to right, #c9a84c, #e8c97a)" }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}

function ComparisonView({ data }: { data: ComparisonData }) {
  const { a, b } = data;
  const aTotal = a.total; const bTotal = b.total;
  const aTopCompany = a.topAssignees[0]; const bTopCompany = b.topAssignees[0];
  const aRecent = a.yearData.filter(d => parseInt(d.year) >= 2020).reduce((s, d) => s + d.count, 0);
  const bRecent = b.yearData.filter(d => parseInt(d.year) >= 2020).reduce((s, d) => s + d.count, 0);
  const aMaxYear = Math.max(...a.yearData.map(d => d.count), 1);
  const bMaxYear = Math.max(...b.yearData.map(d => d.count), 1);

  const StatRow = ({ label, aVal, bVal, aRaw, bRaw }: { label: string; aVal: string; bVal: string; aRaw: number; bRaw: number }) => (
    <div className="py-3 border-b border-white/[0.06] last:border-0">
      <p className="text-[10px] text-white/30 uppercase tracking-wider mb-2" style={{ fontFamily: "system-ui" }}>{label}</p>
      <div className="flex items-center gap-3">
        <span className="text-sm font-bold w-16 text-right truncate" style={{ color: aRaw >= bRaw ? "#c9a84c" : "rgba(255,255,255,0.5)", fontFamily: "system-ui" }}>{aVal}</span>
        <div className="flex-1 flex flex-col gap-1">
          <div className="h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
            <motion.div initial={{ width: 0 }} animate={{ width: `${(aRaw / Math.max(aRaw, bRaw)) * 100}%` }} transition={{ duration: 0.6 }}
              className="h-full rounded-full" style={{ background: "linear-gradient(to right, #c9a84c, #e8c97a)" }} />
          </div>
          <div className="h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
            <motion.div initial={{ width: 0 }} animate={{ width: `${(bRaw / Math.max(aRaw, bRaw)) * 100}%` }} transition={{ duration: 0.6 }}
              className="h-full rounded-full" style={{ background: "linear-gradient(to right, #60a5fa, #93c5fd)" }} />
          </div>
        </div>
        <span className="text-sm font-bold w-16 truncate" style={{ color: bRaw >= aRaw ? "#60a5fa" : "rgba(255,255,255,0.5)", fontFamily: "system-ui" }}>{bVal}</span>
      </div>
    </div>
  );

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl overflow-hidden border border-white/10 bg-gradient-to-b from-white/5 to-white/[0.02]">
      <div className="px-6 py-4 border-b border-white/10 flex items-center justify-center gap-4">
        <span className="text-base font-bold capitalize" style={{ color: "#c9a84c", fontFamily: "Georgia, serif" }}>{a.query}</span>
        <span className="text-xs px-2 py-0.5 rounded-full border border-white/10 text-white/30" style={{ fontFamily: "system-ui" }}>vs</span>
        <span className="text-base font-bold capitalize" style={{ color: "#60a5fa", fontFamily: "Georgia, serif" }}>{b.query}</span>
      </div>
      <div className="px-6 py-2">
        <StatRow label="Recent Patents (2020+)" aVal={aRecent.toString()} bVal={bRecent.toString()} aRaw={aRecent} bRaw={bRecent} />
        {aTopCompany && bTopCompany && (
          <StatRow label="Top Holder Patents" aVal={`${aTopCompany.name} (${aTopCompany.count})`} bVal={`${bTopCompany.name} (${bTopCompany.count})`} aRaw={aTopCompany.count} bRaw={bTopCompany.count} />
        )}
      </div>
      <div className="px-6 py-4 grid grid-cols-2 gap-4 border-t border-white/[0.06]">
        {[{ d: a, color: "#c9a84c", max: aMaxYear }, { d: b, color: "#60a5fa", max: bMaxYear }].map(({ d, color, max }, si) => (
          <div key={si}>
            <p className="text-[10px] uppercase tracking-wider mb-2 capitalize" style={{ color, opacity: 0.7, fontFamily: "system-ui" }}>{d.query} — by year</p>
            <div className="flex items-end gap-0.5" style={{ height: "64px" }}>
              {d.yearData.map((yd, i) => (
                <div key={yd.year} className="flex flex-col items-center flex-1">
                  <motion.div initial={{ height: 0 }} animate={{ height: `${Math.max((yd.count / max) * 56, 2)}px` }}
                    transition={{ delay: i * 0.03, duration: 0.4 }} className="w-full rounded-t-sm"
                    style={{ background: color, opacity: 0.6 }} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="px-6 py-4 grid grid-cols-2 gap-4 border-t border-white/[0.06]">
        {[{ d: a, color: "#c9a84c" }, { d: b, color: "#60a5fa" }].map(({ d, color }, si) => (
          <div key={si}>
            <p className="text-[10px] uppercase tracking-wider mb-2 capitalize" style={{ color, opacity: 0.7, fontFamily: "system-ui" }}>Top holders</p>
            <div className="space-y-1">
              {d.topAssignees.slice(0, 3).map(a => (
                <div key={a.name} className="flex justify-between gap-2">
                  <span className="text-[11px] truncate" style={{ color: "rgba(255,255,255,0.6)", fontFamily: "system-ui" }}>{a.name}</span>
                  <span className="text-[11px] font-bold flex-shrink-0" style={{ color, fontFamily: "system-ui" }}>{a.count}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

function TimelineView({ data }: { data: TimelineData }) {
  if (data.patents.length === 0) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        className="rounded-2xl border border-white/10 px-6 py-12 text-center"
        style={{ background: "rgba(255,255,255,0.02)" }}>
        <p className="text-sm text-white/40" style={{ fontFamily: "system-ui" }}>No patents found for "{data.company}". Try a different company name.</p>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl overflow-hidden border border-white/10 bg-gradient-to-b from-white/5 to-white/[0.02]">
      <div className="px-6 py-4 border-b border-white/10">
        <p className="text-xs text-white/40 uppercase tracking-wider mb-1">Patent Timeline</p>
        <p className="text-lg font-bold text-white capitalize" style={{ fontFamily: "Georgia, serif" }}>{data.company}</p>
        <p className="text-xs mt-1" style={{ color: "#c9a84c" }}>{data.patents.length} patents · chronological order</p>
      </div>
      <div className="px-6 py-6 relative">
        {/* Vertical line */}
        <div className="absolute left-9 top-6 bottom-6 w-px" style={{ background: "rgba(201,168,76,0.15)" }} />
        <div className="space-y-6">
          {data.patents.map((patent, i) => {
            const year = patent.date.match(/\d{4}/)?.[0] || "?";
            return (
              <motion.div
                key={patent.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.06, duration: 0.4 }}
                className="flex gap-4 relative"
              >
                {/* Dot */}
                <div className="flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center z-10 mt-0.5"
                  style={{ background: "#0a0c10", borderColor: "#c9a84c", boxShadow: "0 0 8px rgba(201,168,76,0.3)" }}>
                  <div className="w-2 h-2 rounded-full" style={{ background: "#c9a84c" }} />
                </div>
                {/* Content */}
                <div className="flex-1 pb-2">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <p className="text-sm font-semibold text-white leading-snug" style={{ fontFamily: "Georgia, serif" }}>{patent.title}</p>
                    <span className="flex-shrink-0 text-xs px-2 py-0.5 rounded-full font-bold" style={{
                      background: "rgba(201,168,76,0.15)", color: "#c9a84c",
                      border: "1px solid rgba(201,168,76,0.3)", fontFamily: "system-ui"
                    }}>{year}</span>
                  </div>
                  <p className="text-[11px] mb-1" style={{ color: "rgba(255,255,255,0.35)", fontFamily: "system-ui" }}>
                    {patent.id} · {patent.inventor}
                  </p>
                  <p className="text-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.45)", fontFamily: "system-ui" }}>
                    {patent.abstract}
                  </p>
                  
                  <a
                    href={`https://patents.google.com/patent/${patent.id.replace(/,/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block mt-1.5 text-[10px] uppercase tracking-wider transition-opacity hover:opacity-100"
                    style={{ color: "#c9a84c", opacity: 0.6, fontFamily: "system-ui" }}
                  >
                    View on Google Patents →
                  </a>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}

function LandscapeView({ data }: { data: LandscapeData }) {
  if (data.bubbles.length === 0) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        className="rounded-2xl border border-white/10 px-6 py-12 text-center"
        style={{ background: "rgba(255,255,255,0.02)" }}>
        <p className="text-sm text-white/40" style={{ fontFamily: "system-ui" }}>No landscape data found. Try a different keyword.</p>
      </motion.div>
    );
  }

  const maxCount = Math.max(...data.bubbles.map(b => b.count), 1);
  const colors = ["#c9a84c", "#60a5fa", "#34d399", "#f87171", "#a78bfa", "#fb923c", "#38bdf8", "#4ade80", "#e879f9", "#facc15", "#f472b6", "#818cf8"];

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl overflow-hidden border border-white/10 bg-gradient-to-b from-white/5 to-white/[0.02]">
      <div className="px-6 py-4 border-b border-white/10">
        <p className="text-xs text-white/40 uppercase tracking-wider mb-1">Patent Landscape</p>
        <p className="text-lg font-bold text-white capitalize" style={{ fontFamily: "Georgia, serif" }}>"{data.query}"</p>
        <p className="text-xs mt-1" style={{ color: "#c9a84c" }}>{data.bubbles.length} companies mapped</p>
      </div>

      {/* Bubble visualization */}
      <div className="px-6 py-6">
        <div className="flex flex-wrap gap-3 justify-center mb-6">
          {data.bubbles.map((b, i) => {
            const size = 48 + (b.count / maxCount) * 80;
            return (
              <motion.div
                key={b.name}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.07, duration: 0.4, type: "spring", stiffness: 200 }}
                className="flex items-center justify-center rounded-full flex-shrink-0 cursor-default"
                style={{
                  width: `${size}px`, height: `${size}px`,
                  background: `${colors[i % colors.length]}18`,
                  border: `2px solid ${colors[i % colors.length]}40`,
                  boxShadow: `0 0 20px ${colors[i % colors.length]}15`,
                }}
                title={`${b.name}: ${b.count} patents (avg year: ${b.avgYear})`}
              >
                <div className="text-center px-2">
                  <p className="font-bold leading-tight" style={{
                    color: colors[i % colors.length],
                    fontSize: `${Math.max(8, Math.min(12, size / 7))}px`,
                    fontFamily: "system-ui"
                  }}>
                    {b.name.split(" ").slice(0, 2).join(" ")}
                  </p>
                  <p className="font-bold" style={{ color: "rgba(255,255,255,0.7)", fontSize: `${Math.max(8, Math.min(11, size / 8))}px`, fontFamily: "system-ui" }}>
                    {b.count}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Legend table */}
        <div className="border-t border-white/[0.06] pt-4 space-y-2">
          <p className="text-[10px] text-white/30 uppercase tracking-wider mb-3" style={{ fontFamily: "system-ui" }}>Rankings</p>
          {data.bubbles.map((b, i) => (
            <div key={b.name} className="flex items-center gap-3">
              <span className="text-[10px] w-4 text-right" style={{ color: "rgba(255,255,255,0.25)", fontFamily: "system-ui" }}>{i + 1}</span>
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: colors[i % colors.length] }} />
              <span className="text-xs flex-1" style={{ color: "rgba(255,255,255,0.65)", fontFamily: "system-ui" }}>{b.name}</span>
              <span className="text-xs font-bold" style={{ color: colors[i % colors.length], fontFamily: "system-ui" }}>{b.count} patents</span>
              <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.25)", fontFamily: "system-ui" }}>avg {b.avgYear}</span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

function MessageContent({ content, mode }: { content: string; mode: Mode }) {
  if (mode === "evaluator") {
    const parsed = parseEvaluatorResponse(content);
    if (parsed) return <EvaluatorCard data={parsed} />;
  }
  return (
    <div className="space-y-2">
      {content.split('\n').map((line, i) => (
        line.trim() ? <p key={i} className="text-sm leading-relaxed">{line}</p> : <div key={i} className="h-1" />
      ))}
    </div>
  );
}

export default function Home() {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [mode, setMode] = useState<Mode>("comparison");
  const [trendsData, setTrendsData] = useState<TrendData | null>(null);
  const [comparisonData, setComparisonData] = useState<ComparisonData | null>(null);
  const [timelineData, setTimelineData] = useState<TimelineData | null>(null);
  const [landscapeData, setLandscapeData] = useState<LandscapeData | null>(null);
  const [trendsLoading, setTrendsLoading] = useState(false);
  const patentContextRef = useRef<string>("");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const askMutation = useAskQuestion();
  const currentMode = MODES.find(m => m.id === mode)!;

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 200)}px`;
    }
  }, [question]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, askMutation.isPending, trendsData, comparisonData, timelineData, landscapeData]);

  const clearAll = () => {
    setMessages([]); setTrendsData(null); setComparisonData(null);
    setTimelineData(null); setLandscapeData(null);
    patentContextRef.current = "";
  };

  const handleModeChange = (newMode: Mode) => {
    setMode(newMode); clearAll(); setQuestion("");
  };

  const handleTrendsSubmit = async (keyword: string) => {
    setTrendsLoading(true); setTrendsData(null);
    try {
      const res = await fetch(`/api/trends?q=${encodeURIComponent(keyword)}`);
      setTrendsData(await res.json());
    } catch { setTrendsData({ query: keyword, total: 0, yearData: [], topAssignees: [] }); }
    finally { setTrendsLoading(false); }
  };

  const handleComparisonSubmit = async (query: string) => {
    const parts = query.toLowerCase().split(/\s+vs\s+/);
    if (parts.length < 2) return;
    setTrendsLoading(true); setComparisonData(null);
    try {
      const [resA, resB] = await Promise.all([
        fetch(`/api/trends?q=${encodeURIComponent(parts[0])}`).then(r => r.json()),
        fetch(`/api/trends?q=${encodeURIComponent(parts[1])}`).then(r => r.json()),
      ]);
      setComparisonData({ a: resA, b: resB });
    } catch { setComparisonData(null); }
    finally { setTrendsLoading(false); }
  };

  const handleTimelineSubmit = async (company: string) => {
    setTrendsLoading(true); setTimelineData(null);
    try {
      const res = await fetch(`/api/timeline?company=${encodeURIComponent(company)}`);
      setTimelineData(await res.json());
    } catch { setTimelineData({ company, patents: [] }); }
    finally { setTrendsLoading(false); }
  };

  const handleLandscapeSubmit = async (query: string) => {
    setTrendsLoading(true); setLandscapeData(null);
    try {
      const res = await fetch(`/api/landscape?q=${encodeURIComponent(query)}`);
      setLandscapeData(await res.json());
    } catch { setLandscapeData({ query, total: 0, bubbles: [] }); }
    finally { setTrendsLoading(false); }
  };

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!question.trim() || askMutation.isPending || trendsLoading) return;

    const q = question.trim();

    if (mode === "trends") { handleTrendsSubmit(q); setQuestion(""); return; }
    if (mode === "comparison") { handleComparisonSubmit(q); setQuestion(""); return; }
    if (mode === "timeline") { handleTimelineSubmit(q); setQuestion(""); return; }
    if (mode === "landscape") { handleLandscapeSubmit(q); setQuestion(""); return; }

    try { api.qna.ask.input.parse({ question }); } catch (err) { if (err instanceof z.ZodError) return; }

    const history = messages.map(m => ({ role: m.role, content: m.content }));
    setMessages(prev => [...prev, { role: "user", content: q }]);
    setQuestion("");
    if (inputRef.current) inputRef.current.style.height = "auto";

    askMutation.mutate(
      { question: q, history, patentContext: patentContextRef.current, mode } as any,
      {
        onSuccess: (data: any) => {
          if (data.patentContext) patentContextRef.current = data.patentContext;
          setMessages(prev => [...prev, { role: "assistant", content: data.answer }]);
        },
        onError: () => {
          setMessages(prev => [...prev, { role: "assistant", content: "Sorry, something went wrong. Please try again." }]);
        }
      }
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(); }
  };

  const isLoading = askMutation.isPending || trendsLoading;
  const hasContent = messages.length > 0 || trendsData || comparisonData || timelineData || landscapeData;

  return (
    <div className="min-h-screen flex flex-col" style={{
      background: "linear-gradient(135deg, #0a0c10 0%, #0d1117 50%, #0a0e14 100%)",
      fontFamily: "'Georgia', 'Times New Roman', serif"
    }}>
      <div className="fixed inset-0 pointer-events-none" style={{
        backgroundImage: "linear-gradient(rgba(201,168,76,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(201,168,76,0.03) 1px, transparent 1px)",
        backgroundSize: "60px 60px"
      }} />

      <header className="sticky top-0 z-50 border-b border-white/[0.06] px-4 py-4" style={{
        background: "rgba(10,12,16,0.9)", backdropFilter: "blur(20px)"
      }}>
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{
              background: "linear-gradient(135deg, #c9a84c, #a07830)", boxShadow: "0 0 20px rgba(201,168,76,0.3)"
            }}>
              <Scale className="w-4 h-4 text-black" />
            </div>
            <div>
              <h1 className="text-base font-bold tracking-wide text-white" style={{ fontFamily: "Georgia, serif", letterSpacing: "0.05em" }}>PATENT LAW AI</h1>
              <p className="text-[10px] tracking-widest uppercase" style={{ color: "#c9a84c", opacity: 0.7 }}>Powered by Groq · USPTO Patents</p>
            </div>
            {hasContent && (
              <button onClick={clearAll} className="ml-auto text-xs transition-colors"
                style={{ color: "rgba(255,255,255,0.3)", fontFamily: "system-ui" }}
                onMouseEnter={e => (e.currentTarget.style.color = "rgba(255,255,255,0.7)")}
                onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.3)")}>
                New Chat
              </button>
            )}
          </div>
          <div className="flex gap-1 overflow-x-auto pb-0.5" style={{ scrollbarWidth: "none" }}>
            {MODES.map((m) => {
              const Icon = m.icon; const active = mode === m.id;
              return (
                <button key={m.id} onClick={() => handleModeChange(m.id)}
                  className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs transition-all"
                  style={{
                    fontFamily: "system-ui, sans-serif",
                    background: active ? "rgba(201,168,76,0.15)" : "transparent",
                    color: active ? "#c9a84c" : "rgba(255,255,255,0.35)",
                    border: active ? "1px solid rgba(201,168,76,0.3)" : "1px solid transparent",
                    fontWeight: active ? 600 : 400,
                  }}>
                  <Icon className="w-3 h-3" />{m.label}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-3xl mx-auto px-4 py-8 space-y-6">
        {!hasContent && !isLoading && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
            className="flex flex-col items-center justify-center py-20 text-center space-y-5">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{
              background: "linear-gradient(135deg, rgba(201,168,76,0.15), rgba(201,168,76,0.05))",
              border: "1px solid rgba(201,168,76,0.2)", boxShadow: "0 0 40px rgba(201,168,76,0.08)"
            }}>
              {(() => { const Icon = currentMode.icon; return <Icon className="w-7 h-7" style={{ color: "#c9a84c" }} />; })()}
            </div>
            <div>
              <h2 className="text-xl font-bold text-white mb-1" style={{ fontFamily: "Georgia, serif" }}>{currentMode.label}</h2>
              <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)", fontFamily: "system-ui" }}>{currentMode.description}</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg mt-2">
              {currentMode.suggestions.map((suggestion) => (
                <button key={suggestion} onClick={() => { setQuestion(suggestion); inputRef.current?.focus(); }}
                  className="text-left text-xs px-4 py-3 rounded-xl transition-all"
                  style={{ fontFamily: "system-ui, sans-serif", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(201,168,76,0.3)"; e.currentTarget.style.color = "rgba(255,255,255,0.8)"; e.currentTarget.style.background = "rgba(201,168,76,0.05)"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; e.currentTarget.style.color = "rgba(255,255,255,0.5)"; e.currentTarget.style.background = "rgba(255,255,255,0.03)"; }}>
                  {suggestion}
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {mode === "trends" && trendsData && <TrendsChart data={trendsData} />}
        {mode === "comparison" && comparisonData && <ComparisonView data={comparisonData} />}
        {mode === "timeline" && timelineData && <TimelineView data={timelineData} />}
        {mode === "landscape" && landscapeData && <LandscapeView data={landscapeData} />}

        <AnimatePresence>
          {messages.map((msg, idx) => (
            <motion.div key={idx} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
              className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              {msg.role === "assistant" && (
                <div className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center mt-1" style={{
                  background: "linear-gradient(135deg, rgba(201,168,76,0.2), rgba(201,168,76,0.05))",
                  border: "1px solid rgba(201,168,76,0.3)"
                }}>
                  <Sparkles className="w-3.5 h-3.5" style={{ color: "#c9a84c" }} />
                </div>
              )}
              {msg.role === "assistant" ? (
                <div className="max-w-[85%]" style={{ color: "rgba(255,255,255,0.85)", fontFamily: "system-ui, sans-serif" }}>
                  <MessageContent content={msg.content} mode={mode} />
                </div>
              ) : (
                <div className="max-w-[75%] px-4 py-3 rounded-2xl rounded-tr-sm text-sm"
                  style={{ background: "linear-gradient(135deg, rgba(201,168,76,0.2), rgba(201,168,76,0.1))", border: "1px solid rgba(201,168,76,0.25)", color: "rgba(255,255,255,0.9)", fontFamily: "system-ui, sans-serif" }}>
                  {msg.content}
                </div>
              )}
              {msg.role === "user" && (
                <div className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center mt-1" style={{ background: "linear-gradient(135deg, #c9a84c, #a07830)" }}>
                  <span className="text-[10px] font-bold text-black">Me</span>
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {isLoading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3 justify-start">
            <div className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center" style={{
              background: "linear-gradient(135deg, rgba(201,168,76,0.2), rgba(201,168,76,0.05))",
              border: "1px solid rgba(201,168,76,0.3)"
            }}>
              <Sparkles className="w-3.5 h-3.5 animate-pulse" style={{ color: "#c9a84c" }} />
            </div>
            <div className="px-4 py-3 rounded-2xl rounded-tl-sm" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <div className="flex gap-1.5 items-center h-5">
                {[0, 150, 300].map(delay => (
                  <div key={delay} className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: "#c9a84c", opacity: 0.6, animationDelay: `${delay}ms` }} />
                ))}
              </div>
            </div>
          </motion.div>
        )}
        <div ref={bottomRef} />
      </main>

      <div className="sticky bottom-0 px-4 py-4" style={{ background: "rgba(10,12,16,0.95)", backdropFilter: "blur(20px)", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="max-w-3xl mx-auto">
          <div className="relative rounded-2xl overflow-hidden transition-all" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)" }}>
            <textarea ref={inputRef} value={question} onChange={(e) => setQuestion(e.target.value)} onKeyDown={handleKeyDown}
              placeholder={currentMode.placeholder}
              className="w-full bg-transparent px-5 py-4 text-sm focus:outline-none resize-none min-h-[56px] max-h-[200px]"
              style={{ color: "rgba(255,255,255,0.85)", fontFamily: "system-ui, sans-serif" }}
              disabled={isLoading} rows={1} />
            <div className="absolute bottom-3 right-3">
              <button onClick={() => handleSubmit()} disabled={!question.trim() || isLoading}
                className="p-2 rounded-xl transition-all flex items-center justify-center h-9 w-9"
                style={{ background: question.trim() ? "linear-gradient(135deg, #c9a84c, #a07830)" : "rgba(255,255,255,0.06)", opacity: isLoading ? 0.5 : 1, cursor: !question.trim() || isLoading ? "not-allowed" : "pointer" }}>
                {isLoading ? <Loader2 className="w-4 h-4 text-white animate-spin" /> : <CornerDownLeft className="w-4 h-4" style={{ color: question.trim() ? "black" : "rgba(255,255,255,0.3)" }} />}
              </button>
            </div>
          </div>
          <p className="text-center text-[10px] mt-2" style={{ color: "rgba(255,255,255,0.2)", fontFamily: "system-ui" }}>
            For informational purposes only · Not legal advice
          </p>
        </div>
      </div>
    </div>
  );
}