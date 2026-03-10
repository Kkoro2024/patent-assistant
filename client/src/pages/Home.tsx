import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAskQuestion } from "@/hooks/use-qna";
import { Sparkles, Loader2, CornerDownLeft, Scale, Search, Lightbulb, MessageSquare, FileText, ShieldAlert } from "lucide-react";
import { z } from "zod";
import { api } from "@shared/routes";

type Message = {
  role: "user" | "assistant";
  content: string;
};

type Mode = "chat" | "evaluator" | "search" | "drafter" | "infringement";

const MODES: { id: Mode; label: string; icon: any; description: string; placeholder: string; suggestions: string[] }[] = [
  {
    id: "chat",
    label: "Patent Chat",
    icon: MessageSquare,
    description: "Ask anything about patents and IP law",
    placeholder: "Ask a patent question...",
    suggestions: [
      "What patents does Apple hold on the iPhone?",
      "Can I patent a software idea?",
      "What is prior art?",
      "How long does a patent last?"
    ]
  },
  {
    id: "evaluator",
    label: "Idea Evaluator",
    icon: Lightbulb,
    description: "Describe your invention and get a patentability + business score",
    placeholder: "Describe your invention idea in detail...",
    suggestions: [
      "An app that uses AI to match lawyers with clients",
      "A water bottle that tracks your daily hydration",
      "A new algorithm for compressing video files",
      "A shoe sole that generates electricity while walking"
    ]
  },
  {
    id: "search",
    label: "Patent Search",
    icon: Search,
    description: "Search and analyze existing patents by keyword",
    placeholder: "Search for patents related to...",
    suggestions: [
      "Search patents related to facial recognition",
      "What patents exist for wireless charging?",
      "Find patents on blockchain technology",
      "Show me Tesla's battery patents"
    ]
  },
  {
    id: "drafter",
    label: "Patent Drafter",
    icon: FileText,
    description: "Get a professional patent claim draft for your invention",
    placeholder: "Describe your invention in detail — how it works, what makes it unique...",
    suggestions: [
      "A smart lock that opens using facial recognition on your phone",
      "A method for filtering microplastics from tap water using magnets",
      "An AI system that predicts traffic jams 30 minutes in advance",
      "A wearable device that monitors blood sugar without needles"
    ]
  },
  {
    id: "infringement",
    label: "Infringement Check",
    icon: ShieldAlert,
    description: "Check if your product may infringe existing patents",
    placeholder: "Describe your product or technology in detail...",
    suggestions: [
      "A fingerprint scanner built into a phone screen",
      "An app that lets users pay with a QR code",
      "A foldable phone with a flexible display",
      "Wireless earbuds that automatically pause when removed"
    ]
  }
];

// Parse evaluator output into structured visual components
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
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 10) * circumference;

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-20 h-20">
        <svg className="w-20 h-20 -rotate-90" viewBox="0 0 72 72">
          <circle cx="36" cy="36" r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="6" />
          <circle
            cx="36" cy="36" r={radius} fill="none"
            stroke={color} strokeWidth="6"
            strokeDasharray={`${progress} ${circumference}`}
            strokeLinecap="round"
            style={{ transition: "stroke-dasharray 1s ease" }}
          />
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
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl overflow-hidden border border-white/10 bg-gradient-to-b from-white/5 to-white/[0.02]"
    >
      {/* Scores */}
      <div className="px-6 py-5 border-b border-white/10 flex justify-around">
        <ScoreRing score={data.patScore} label="Patentability" color="#c9a84c" />
        <ScoreRing score={data.bizScore} label="Business Viability" color="#60a5fa" />
      </div>

      {/* Risk grid */}
      <div className="px-6 py-4 grid grid-cols-2 gap-3 border-b border-white/10">
        <RiskBadge label="Novelty" value={data.novelty} />
        <RiskBadge label="Obviousness Risk" value={data.obviousness} />
        <RiskBadge label="Prior Art Risk" value={data.priorArt} />
        <RiskBadge label="Commercial Potential" value={data.commercial} />
      </div>

      {/* Verdict */}
      {data.verdict && (
        <div className="px-6 py-4 border-b border-white/10">
          <p className="text-xs text-white/40 uppercase tracking-wider mb-1">Verdict</p>
          <p className="text-sm text-white/80 leading-relaxed">{data.verdict}</p>
        </div>
      )}

      {/* Strengths & Weaknesses */}
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

      {/* Recommendation */}
      {data.recommendation && (
        <div className="px-6 py-4">
          <p className="text-xs text-[#c9a84c]/70 uppercase tracking-wider mb-1">Recommendation</p>
          <p className="text-sm text-white/70 leading-relaxed">{data.recommendation}</p>
        </div>
      )}
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
  const [mode, setMode] = useState<Mode>("chat");
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
  }, [messages, askMutation.isPending]);

  const handleModeChange = (newMode: Mode) => {
    setMode(newMode);
    setMessages([]);
    patentContextRef.current = "";
    setQuestion("");
  };

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!question.trim() || askMutation.isPending) return;
    try { api.qna.ask.input.parse({ question }); } catch (err) { if (err instanceof z.ZodError) return; }

    const userMessage = question.trim();
    const history = messages.map(m => ({ role: m.role, content: m.content }));
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setQuestion("");
    if (inputRef.current) inputRef.current.style.height = "auto";

    askMutation.mutate(
      { question: userMessage, history, patentContext: patentContextRef.current, mode } as any,
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

  return (
    <div className="min-h-screen flex flex-col" style={{
      background: "linear-gradient(135deg, #0a0c10 0%, #0d1117 50%, #0a0e14 100%)",
      fontFamily: "'Georgia', 'Times New Roman', serif"
    }}>
      {/* Subtle grid background */}
      <div className="fixed inset-0 pointer-events-none" style={{
        backgroundImage: "linear-gradient(rgba(201,168,76,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(201,168,76,0.03) 1px, transparent 1px)",
        backgroundSize: "60px 60px"
      }} />

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-white/[0.06] px-4 py-4" style={{
        background: "rgba(10,12,16,0.9)",
        backdropFilter: "blur(20px)"
      }}>
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{
              background: "linear-gradient(135deg, #c9a84c, #a07830)",
              boxShadow: "0 0 20px rgba(201,168,76,0.3)"
            }}>
              <Scale className="w-4 h-4 text-black" />
            </div>
            <div>
              <h1 className="text-base font-bold tracking-wide text-white" style={{ fontFamily: "Georgia, serif", letterSpacing: "0.05em" }}>
                PATENT LAW AI
              </h1>
              <p className="text-[10px] tracking-widest uppercase" style={{ color: "#c9a84c", opacity: 0.7 }}>
                Powered by Groq · USPTO Patents
              </p>
            </div>
            {messages.length > 0 && (
              <button
                onClick={() => { setMessages([]); patentContextRef.current = ""; }}
                className="ml-auto text-xs transition-colors"
                style={{ color: "rgba(255,255,255,0.3)", fontFamily: "system-ui" }}
                onMouseEnter={e => (e.currentTarget.style.color = "rgba(255,255,255,0.7)")}
                onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.3)")}
              >
                New Chat
              </button>
            )}
          </div>

          {/* Mode tabs */}
          <div className="flex gap-1 overflow-x-auto pb-0.5" style={{ scrollbarWidth: "none" }}>
            {MODES.map((m) => {
              const Icon = m.icon;
              const active = mode === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => handleModeChange(m.id)}
                  className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs transition-all"
                  style={{
                    fontFamily: "system-ui, sans-serif",
                    background: active ? "rgba(201,168,76,0.15)" : "transparent",
                    color: active ? "#c9a84c" : "rgba(255,255,255,0.35)",
                    border: active ? "1px solid rgba(201,168,76,0.3)" : "1px solid transparent",
                    fontWeight: active ? 600 : 400,
                  }}
                >
                  <Icon className="w-3 h-3" />
                  {m.label}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Messages */}
      <main className="flex-1 w-full max-w-3xl mx-auto px-4 py-8 space-y-6">
        {messages.length === 0 && !askMutation.isPending && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col items-center justify-center py-20 text-center space-y-5"
          >
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{
              background: "linear-gradient(135deg, rgba(201,168,76,0.15), rgba(201,168,76,0.05))",
              border: "1px solid rgba(201,168,76,0.2)",
              boxShadow: "0 0 40px rgba(201,168,76,0.08)"
            }}>
              {(() => { const Icon = currentMode.icon; return <Icon className="w-7 h-7" style={{ color: "#c9a84c" }} />; })()}
            </div>
            <div>
              <h2 className="text-xl font-bold text-white mb-1" style={{ fontFamily: "Georgia, serif" }}>
                {currentMode.label}
              </h2>
              <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)", fontFamily: "system-ui" }}>
                {currentMode.description}
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg mt-2">
              {currentMode.suggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => { setQuestion(suggestion); inputRef.current?.focus(); }}
                  className="text-left text-xs px-4 py-3 rounded-xl transition-all"
                  style={{
                    fontFamily: "system-ui, sans-serif",
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    color: "rgba(255,255,255,0.5)",
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = "rgba(201,168,76,0.3)";
                    e.currentTarget.style.color = "rgba(255,255,255,0.8)";
                    e.currentTarget.style.background = "rgba(201,168,76,0.05)";
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
                    e.currentTarget.style.color = "rgba(255,255,255,0.5)";
                    e.currentTarget.style.background = "rgba(255,255,255,0.03)";
                  }}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </motion.div>
        )}

        <AnimatePresence>
          {messages.map((msg, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
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
                  style={{
                    background: "linear-gradient(135deg, rgba(201,168,76,0.2), rgba(201,168,76,0.1))",
                    border: "1px solid rgba(201,168,76,0.25)",
                    color: "rgba(255,255,255,0.9)",
                    fontFamily: "system-ui, sans-serif"
                  }}>
                  {msg.content}
                </div>
              )}

              {msg.role === "user" && (
                <div className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center mt-1" style={{
                  background: "linear-gradient(135deg, #c9a84c, #a07830)"
                }}>
                  <span className="text-[10px] font-bold text-black">Me</span>
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {askMutation.isPending && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3 justify-start">
            <div className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center" style={{
              background: "linear-gradient(135deg, rgba(201,168,76,0.2), rgba(201,168,76,0.05))",
              border: "1px solid rgba(201,168,76,0.3)"
            }}>
              <Sparkles className="w-3.5 h-3.5 animate-pulse" style={{ color: "#c9a84c" }} />
            </div>
            <div className="px-4 py-3 rounded-2xl rounded-tl-sm" style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)"
            }}>
              <div className="flex gap-1.5 items-center h-5">
                {[0, 150, 300].map(delay => (
                  <div key={delay} className="w-1.5 h-1.5 rounded-full animate-bounce" style={{
                    background: "#c9a84c",
                    opacity: 0.6,
                    animationDelay: `${delay}ms`
                  }} />
                ))}
              </div>
            </div>
          </motion.div>
        )}

        <div ref={bottomRef} />
      </main>

      {/* Input */}
      <div className="sticky bottom-0 px-4 py-4" style={{
        background: "rgba(10,12,16,0.95)",
        backdropFilter: "blur(20px)",
        borderTop: "1px solid rgba(255,255,255,0.06)"
      }}>
        <div className="max-w-3xl mx-auto">
          <div className="relative rounded-2xl overflow-hidden transition-all" style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.1)",
          }}>
            <textarea
              ref={inputRef}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={currentMode.placeholder}
              className="w-full bg-transparent px-5 py-4 text-sm focus:outline-none resize-none min-h-[56px] max-h-[200px]"
              style={{
                color: "rgba(255,255,255,0.85)",
                fontFamily: "system-ui, sans-serif",
              }}
              disabled={askMutation.isPending}
              rows={1}
            />
            <div className="absolute bottom-3 right-3">
              <button
                onClick={() => handleSubmit()}
                disabled={!question.trim() || askMutation.isPending}
                className="p-2 rounded-xl transition-all flex items-center justify-center h-9 w-9"
                style={{
                  background: question.trim() ? "linear-gradient(135deg, #c9a84c, #a07830)" : "rgba(255,255,255,0.06)",
                  opacity: askMutation.isPending ? 0.5 : 1,
                  cursor: !question.trim() || askMutation.isPending ? "not-allowed" : "pointer"
                }}
              >
                {askMutation.isPending
                  ? <Loader2 className="w-4 h-4 text-white animate-spin" />
                  : <CornerDownLeft className="w-4 h-4" style={{ color: question.trim() ? "black" : "rgba(255,255,255,0.3)" }} />
                }
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