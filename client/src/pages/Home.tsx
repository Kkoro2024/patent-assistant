import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQnaList, useAskQuestion } from "@/hooks/use-qna";
import { Search, Sparkles, Loader2, CornerDownLeft, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { z } from "zod";
import { api } from "@shared/routes";

export default function Home() {
  const [question, setQuestion] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  
  const { data: qnas, isLoading: isLoadingList, isError } = useQnaList();
  const askMutation = useAskQuestion();

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 200)}px`;
    }
  }, [question]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    
    if (!question.trim() || askMutation.isPending) return;

    // Validate input before sending to avoid unnecessary network requests
    try {
      api.qna.ask.input.parse({ question });
      askMutation.mutate({ question }, {
        onSuccess: () => {
          setQuestion("");
          if (inputRef.current) {
            inputRef.current.style.height = "auto";
          }
        }
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        // Validation error handled quietly, just prevent submit
        return;
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Sort QnAs to show newest first for a feed-like feel
  const sortedQnas = qnas ? [...qnas].sort((a, b) => 
    new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
  ) : [];

  return (
    <div className="min-h-screen bg-background flex flex-col relative font-sans">
      {/* Header / Sticky Ask Form Area */}
      <header className="sticky top-0 z-50 glass-effect pt-12 pb-6 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
              <Sparkles className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">Groq Assistant</h1>
              <p className="text-sm text-muted-foreground font-medium">Lightning fast AI answers</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent rounded-2xl blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />
            <div className="relative bg-card minimal-shadow border border-border/60 rounded-2xl overflow-hidden transition-all duration-300 focus-within:border-primary/30 focus-within:ring-4 focus-within:ring-primary/5">
              <textarea
                ref={inputRef}
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask anything..."
                className="w-full bg-transparent px-6 py-5 text-lg placeholder:text-muted-foreground/60 focus:outline-none resize-none min-h-[72px] max-h-[200px]"
                disabled={askMutation.isPending}
                rows={1}
              />
              <div className="absolute bottom-4 right-4 flex items-center gap-2">
                <span className="text-[10px] font-medium text-muted-foreground/50 hidden sm:inline-block pointer-events-none uppercase tracking-wider">
                  Return to submit
                </span>
                <button
                  type="submit"
                  disabled={!question.trim() || askMutation.isPending}
                  className="bg-primary text-primary-foreground p-2.5 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed hover:scale-105 active:scale-95 transition-all duration-200 shadow-md hover:shadow-xl hover:shadow-primary/20 flex items-center justify-center h-10 w-10"
                  aria-label="Submit question"
                >
                  {askMutation.isPending ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <CornerDownLeft className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      </header>

      {/* Feed Area */}
      <main className="flex-1 w-full max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {isError ? (
          <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 text-muted-foreground">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-destructive" />
            </div>
            <p className="text-lg font-medium">Failed to load questions</p>
          </div>
        ) : isLoadingList ? (
          <div className="space-y-12">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse space-y-4">
                <div className="h-6 bg-muted rounded-md w-3/4" />
                <div className="space-y-2">
                  <div className="h-4 bg-muted/50 rounded-md w-full" />
                  <div className="h-4 bg-muted/50 rounded-md w-5/6" />
                  <div className="h-4 bg-muted/50 rounded-md w-4/6" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-16">
            {/* Optimistic Loading State for new question */}
            <AnimatePresence>
              {askMutation.isPending && (
                <motion.div
                  initial={{ opacity: 0, y: -20, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: "auto" }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="space-y-6"
                >
                  <h2 className="text-xl sm:text-2xl font-semibold text-foreground leading-snug">
                    {question}
                  </h2>
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 mt-1">
                      <div className="w-8 h-8 rounded-full bg-primary/5 flex items-center justify-center border border-primary/10">
                        <Sparkles className="w-4 h-4 text-primary animate-pulse" />
                      </div>
                    </div>
                    <div className="flex-1 space-y-3 py-2">
                      <div className="h-4 bg-muted rounded-md w-full animate-pulse" />
                      <div className="h-4 bg-muted rounded-md w-5/6 animate-pulse" />
                      <div className="h-4 bg-muted rounded-md w-4/6 animate-pulse" />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Empty State */}
            {sortedQnas.length === 0 && !askMutation.isPending && (
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                className="flex flex-col items-center justify-center py-20 text-center space-y-6"
              >
                <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center">
                  <Search className="w-8 h-8 text-muted-foreground/50" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold text-foreground">No questions yet</h3>
                  <p className="text-muted-foreground max-w-sm mx-auto">
                    Ask your first question above to get blazing fast answers powered by Groq.
                  </p>
                </div>
              </motion.div>
            )}

            {/* List of QnAs */}
            <AnimatePresence>
              {sortedQnas.map((qna, idx) => (
                <motion.article
                  key={qna.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05, ease: "easeOut", duration: 0.4 }}
                  className="group relative"
                >
                  <div className="space-y-5">
                    {/* Question */}
                    <div>
                      <h2 className="text-xl sm:text-2xl font-semibold text-foreground leading-snug">
                        {qna.question}
                      </h2>
                      {qna.createdAt && (
                        <p className="text-[13px] text-muted-foreground mt-2 font-medium">
                          {format(new Date(qna.createdAt), "MMM d, yyyy • h:mm a")}
                        </p>
                      )}
                    </div>

                    {/* Answer */}
                    <div className="flex gap-4">
                      <div className="flex-shrink-0 mt-1">
                        <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center border border-border/50 group-hover:bg-primary group-hover:border-primary transition-colors duration-300">
                          <Sparkles className="w-4 h-4 text-muted-foreground group-hover:text-primary-foreground transition-colors duration-300" />
                        </div>
                      </div>
                      <div className="flex-1 prose prose-neutral dark:prose-invert max-w-none text-[15px] sm:text-base leading-relaxed text-foreground/90">
                        {/* We split by newlines just to render basic paragraphs without full markdown parser */}
                        {qna.answer.split('\n').map((paragraph, i) => (
                          paragraph.trim() ? (
                            <p key={i} className="mb-4 last:mb-0">
                              {paragraph}
                            </p>
                          ) : <div key={i} className="h-4" />
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  {/* Subtle divider */}
                  {idx !== sortedQnas.length - 1 && (
                    <div className="absolute -bottom-8 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border/50 to-transparent" />
                  )}
                </motion.article>
              ))}
            </AnimatePresence>
          </div>
        )}
      </main>
    </div>
  );
}
