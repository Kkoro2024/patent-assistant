import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAskQuestion } from "@/hooks/use-qna";
import { Sparkles, Loader2, CornerDownLeft, Scale } from "lucide-react";
import { z } from "zod";
import { api } from "@shared/routes";

type Message = {
  role: "user" | "assistant";
  content: string;
};

export default function Home() {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const patentContextRef = useRef<string>("");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const askMutation = useAskQuestion();

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 200)}px`;
    }
  }, [question]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, askMutation.isPending]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!question.trim() || askMutation.isPending) return;

    try {
      api.qna.ask.input.parse({ question });
    } catch (err) {
      if (err instanceof z.ZodError) return;
    }

    const userMessage = question.trim();
    const history = messages.map(m => ({ role: m.role, content: m.content }));

    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setQuestion("");
    if (inputRef.current) inputRef.current.style.height = "auto";

    askMutation.mutate(
    { question: userMessage, history, patentContext: patentContextRef.current } as any,
      {
        onSuccess: (data: any) => {
          // Save patent context from first response so it persists
          if (data.patentContext) {
            patentContextRef.current = data.patentContext;
          }
          setMessages(prev => [...prev, { role: "assistant", content: data.answer }]);
        },
        onError: () => {
          setMessages(prev => [...prev, {
            role: "assistant",
            content: "Sorry, something went wrong. Please try again."
          }]);
        }
      }
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleNewChat = () => {
  setMessages([]);
  patentContextRef.current = "";
  };

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      {/* Header */}
      <header className="sticky top-0 z-50 glass-effect border-b border-border/40 px-4 py-4">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
            <Scale className="w-4 h-4 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-foreground">Patent Law AI Assistant</h1>
            <p className="text-xs text-muted-foreground">Powered by Groq + USPTO Patents</p>
          </div>
          {messages.length > 0 && (
            <button
              onClick={handleNewChat}
              className="ml-auto text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              New Chat
            </button>
          )}
        </div>
      </header>

      {/* Messages */}
      <main className="flex-1 w-full max-w-3xl mx-auto px-4 py-6 space-y-6">
        {messages.length === 0 && !askMutation.isPending && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-24 text-center space-y-4"
          >
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Scale className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-xl font-semibold text-foreground">Ask me anything about patents</h2>
            <p className="text-muted-foreground max-w-sm text-sm">
              I can search real USPTO patents, explain patent law, and help you understand intellectual property.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4 w-full max-w-lg">
              {[
                "What patents does Apple hold on the iPhone?",
                "Can I patent a software idea?",
                "What is prior art?",
                "How long does a patent last?"
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => { setQuestion(suggestion); inputRef.current?.focus(); }}
                  className="text-left text-sm px-4 py-3 rounded-xl border border-border/60 hover:border-primary/30 hover:bg-primary/5 transition-all text-muted-foreground hover:text-foreground"
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
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {msg.role === "assistant" && (
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20 mt-1">
                  <Sparkles className="w-4 h-4 text-primary" />
                </div>
              )}
              <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-primary text-primary-foreground rounded-tr-sm"
                  : "bg-card border border-border/60 text-foreground rounded-tl-sm"
              }`}>
                {msg.content.split('\n').map((line, i) => (
                  line.trim() ? <p key={i} className="mb-2 last:mb-0">{line}</p> : <div key={i} className="h-2" />
                ))}
              </div>
              {msg.role === "user" && (
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center mt-1">
                  <span className="text-xs text-primary-foreground font-bold">Me</span>
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {askMutation.isPending && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex gap-3 justify-start"
          >
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
              <Sparkles className="w-4 h-4 text-primary animate-pulse" />
            </div>
            <div className="bg-card border border-border/60 rounded-2xl rounded-tl-sm px-4 py-3">
              <div className="flex gap-1 items-center h-5">
                <div className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: "0ms" }} />
                <div className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: "150ms" }} />
                <div className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </motion.div>
        )}

        <div ref={bottomRef} />
      </main>

      {/* Input */}
      <div className="sticky bottom-0 glass-effect border-t border-border/40 px-4 py-4">
        <div className="max-w-3xl mx-auto">
          <form onSubmit={handleSubmit} className="relative">
            <div className="bg-card border border-border/60 rounded-2xl overflow-hidden focus-within:border-primary/30 focus-within:ring-4 focus-within:ring-primary/5 transition-all">
              <textarea
                ref={inputRef}
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask a follow-up or a new question..."
                className="w-full bg-transparent px-5 py-4 text-base placeholder:text-muted-foreground/60 focus:outline-none resize-none min-h-[56px] max-h-[200px]"
                disabled={askMutation.isPending}
                rows={1}
              />
              <div className="absolute bottom-3 right-3">
                <button
                  type="submit"
                  disabled={!question.trim() || askMutation.isPending}
                  className="bg-primary text-primary-foreground p-2 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed hover:scale-105 active:scale-95 transition-all shadow-md flex items-center justify-center h-9 w-9"
                >
                  {askMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CornerDownLeft className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}