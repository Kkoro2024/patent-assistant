import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Scale, MessageSquare, Lightbulb, Search, FileText, ShieldAlert, TrendingUp, ArrowRight, Zap, Globe, Lock } from "lucide-react";
import Home from "./Home";

const FEATURES = [
  {
    icon: MessageSquare,
    title: "Patent Chat",
    description: "Ask complex IP questions in plain English. Get answers backed by real USPTO patent data.",
  },
  {
    icon: Lightbulb,
    title: "Idea Evaluator",
    description: "Score your invention on patentability and business viability with a detailed breakdown.",
  },
  {
    icon: Search,
    title: "Patent Search",
    description: "Search millions of real patents and understand what's already been filed in your space.",
  },
  {
    icon: FileText,
    title: "Patent Drafter",
    description: "Generate professional USPTO-style patent claims for your invention in seconds.",
  },
  {
    icon: ShieldAlert,
    title: "Infringement Check",
    description: "Describe your product and find out if you're stepping on existing patents — before it's too late.",
  },
  {
    icon: TrendingUp,
    title: "Trends",
    description: "Visualize how patent filings in any technology have grown year by year, and who dominates.",
  },
];

const STATS = [
  { value: "13M+", label: "Patents Indexed" },
  { value: "6", label: "AI-Powered Modes" },
  { value: "<3s", label: "Average Response" },
  { value: "Free", label: "No Login Required" },
];

export default function Landing() {
  const [launched, setLaunched] = useState(false);

  if (launched) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      >
        <Home />
      </motion.div>
    );
  }

  return (
    <div style={{
      background: "#080a0e",
      minHeight: "100vh",
      fontFamily: "Georgia, 'Times New Roman', serif",
      color: "white",
      overflowX: "hidden",
    }}>

      {/* Noise texture overlay */}
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0,
        backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E\")",
        opacity: 0.4,
      }} />

      {/* Gold grid */}
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0,
        backgroundImage: "linear-gradient(rgba(201,168,76,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(201,168,76,0.04) 1px, transparent 1px)",
        backgroundSize: "80px 80px",
      }} />

      {/* Glow orb */}
      <div style={{
        position: "fixed", top: "-200px", left: "50%", transform: "translateX(-50%)",
        width: "800px", height: "800px", borderRadius: "50%", pointerEvents: "none", zIndex: 0,
        background: "radial-gradient(circle, rgba(201,168,76,0.08) 0%, transparent 70%)",
      }} />

      <div style={{ position: "relative", zIndex: 1 }}>

        {/* Nav */}
        <motion.nav
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "20px 40px", borderBottom: "1px solid rgba(201,168,76,0.1)",
            backdropFilter: "blur(20px)", background: "rgba(8,10,14,0.8)",
            position: "sticky", top: 0, zIndex: 100,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{
              width: "36px", height: "36px", borderRadius: "10px",
              background: "linear-gradient(135deg, #c9a84c, #a07830)",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 0 20px rgba(201,168,76,0.4)",
            }}>
              <Scale size={16} color="black" />
            </div>
            <span style={{ fontWeight: "bold", letterSpacing: "0.08em", fontSize: "15px" }}>
              PATENT LAW AI
            </span>
          </div>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setLaunched(true)}
            style={{
              background: "linear-gradient(135deg, #c9a84c, #a07830)",
              border: "none", borderRadius: "8px", padding: "8px 20px",
              color: "black", fontWeight: "bold", fontSize: "13px",
              cursor: "pointer", letterSpacing: "0.05em", fontFamily: "system-ui",
            }}
          >
            Launch App →
          </motion.button>
        </motion.nav>

        {/* Hero */}
        <section style={{ textAlign: "center", padding: "120px 24px 80px" }}>
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
          >
            <div style={{
              display: "inline-block", border: "1px solid rgba(201,168,76,0.3)",
              borderRadius: "100px", padding: "6px 16px", marginBottom: "32px",
              background: "rgba(201,168,76,0.08)",
            }}>
              <span style={{ fontSize: "12px", color: "#c9a84c", letterSpacing: "0.1em", fontFamily: "system-ui" }}>
                ⚡ POWERED BY GROQ + REAL USPTO DATA
              </span>
            </div>

            <h1 style={{
              fontSize: "clamp(42px, 7vw, 88px)", fontWeight: "bold",
              lineHeight: 1.05, marginBottom: "24px", letterSpacing: "-0.02em",
            }}>
              Patent Law,<br />
              <span style={{
                background: "linear-gradient(135deg, #c9a84c, #e8c97a, #a07830)",
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              }}>
                Demystified.
              </span>
            </h1>

            <p style={{
              fontSize: "clamp(16px, 2vw, 20px)", color: "rgba(255,255,255,0.5)",
              maxWidth: "560px", margin: "0 auto 48px",
              lineHeight: 1.7, fontFamily: "system-ui",
            }}>
              An AI patent attorney in your pocket. Search real patents, evaluate your ideas,
              draft claims, and check for infringement — instantly.
            </p>

            <motion.button
              whileHover={{ scale: 1.04, boxShadow: "0 0 40px rgba(201,168,76,0.4)" }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setLaunched(true)}
              style={{
                background: "linear-gradient(135deg, #c9a84c, #a07830)",
                border: "none", borderRadius: "14px", padding: "18px 48px",
                color: "black", fontWeight: "bold", fontSize: "16px",
                cursor: "pointer", letterSpacing: "0.04em", fontFamily: "system-ui",
                display: "inline-flex", alignItems: "center", gap: "10px",
                boxShadow: "0 0 30px rgba(201,168,76,0.25)",
              }}
            >
              Start Researching Free
              <ArrowRight size={18} />
            </motion.button>

            <p style={{ marginTop: "16px", fontSize: "12px", color: "rgba(255,255,255,0.25)", fontFamily: "system-ui" }}>
              No account needed · No credit card
            </p>
          </motion.div>
        </section>

        {/* Stats bar */}
        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.8 }}
          style={{
            display: "flex", justifyContent: "center", flexWrap: "wrap", gap: "0",
            borderTop: "1px solid rgba(255,255,255,0.06)",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            background: "rgba(255,255,255,0.02)",
            margin: "0 0 100px",
          }}
        >
          {STATS.map((stat, i) => (
            <div key={stat.label} style={{
              textAlign: "center", padding: "32px 48px",
              borderRight: i < STATS.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none",
            }}>
              <div style={{ fontSize: "32px", fontWeight: "bold", color: "#c9a84c", marginBottom: "4px" }}>
                {stat.value}
              </div>
              <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)", letterSpacing: "0.1em", fontFamily: "system-ui" }}>
                {stat.label.toUpperCase()}
              </div>
            </div>
          ))}
        </motion.section>

        {/* Features grid */}
        <section style={{ maxWidth: "1100px", margin: "0 auto", padding: "0 24px 100px" }}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            style={{ textAlign: "center", marginBottom: "64px" }}
          >
            <h2 style={{ fontSize: "clamp(28px, 4vw, 44px)", fontWeight: "bold", marginBottom: "16px" }}>
              Six tools. One platform.
            </h2>
            <p style={{ color: "rgba(255,255,255,0.4)", fontFamily: "system-ui", fontSize: "16px" }}>
              Everything a founder, inventor, or law student needs to navigate IP.
            </p>
          </motion.div>

          <div style={{
            display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "16px",
          }}>
            {FEATURES.map((f, i) => {
              const Icon = f.icon;
              return (
                <motion.div
                  key={f.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08, duration: 0.5 }}
                  whileHover={{ borderColor: "rgba(201,168,76,0.3)", background: "rgba(201,168,76,0.04)" }}
                  style={{
                    border: "1px solid rgba(255,255,255,0.07)",
                    borderRadius: "16px", padding: "28px",
                    background: "rgba(255,255,255,0.02)",
                    transition: "border-color 0.2s, background 0.2s",
                    cursor: "default",
                  }}
                >
                  <div style={{
                    width: "40px", height: "40px", borderRadius: "10px", marginBottom: "16px",
                    background: "rgba(201,168,76,0.1)", border: "1px solid rgba(201,168,76,0.2)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <Icon size={18} color="#c9a84c" />
                  </div>
                  <h3 style={{ fontSize: "16px", fontWeight: "bold", marginBottom: "8px" }}>{f.title}</h3>
                  <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.45)", lineHeight: 1.6, fontFamily: "system-ui" }}>
                    {f.description}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </section>

        {/* Why section */}
        <section style={{
          maxWidth: "900px", margin: "0 auto", padding: "0 24px 100px",
          display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "32px",
        }}>
          {[
            { icon: Zap, title: "Instant Results", body: "Groq's inference engine delivers answers in under 3 seconds — faster than any human attorney." },
            { icon: Globe, title: "Real Patent Data", body: "Every answer is backed by actual USPTO filings via Google Patents. No hallucinated patent numbers." },
            { icon: Lock, title: "Built for Builders", body: "Designed for founders, engineers, and students — not just lawyers. Plain English, every time." },
          ].map((item, i) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                style={{ textAlign: "center" }}
              >
                <div style={{
                  width: "48px", height: "48px", borderRadius: "50%", margin: "0 auto 16px",
                  background: "rgba(201,168,76,0.1)", border: "1px solid rgba(201,168,76,0.2)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <Icon size={20} color="#c9a84c" />
                </div>
                <h3 style={{ fontSize: "17px", fontWeight: "bold", marginBottom: "10px" }}>{item.title}</h3>
                <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.4)", lineHeight: 1.7, fontFamily: "system-ui" }}>
                  {item.body}
                </p>
              </motion.div>
            );
          })}
        </section>

        {/* CTA */}
        <motion.section
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          style={{
            textAlign: "center", padding: "80px 24px 120px",
            borderTop: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <h2 style={{ fontSize: "clamp(28px, 4vw, 48px)", fontWeight: "bold", marginBottom: "16px" }}>
            Ready to research?
          </h2>
          <p style={{ color: "rgba(255,255,255,0.4)", fontFamily: "system-ui", marginBottom: "40px", fontSize: "16px" }}>
            Free to use. No signup. Just ask.
          </p>
          <motion.button
            whileHover={{ scale: 1.04, boxShadow: "0 0 40px rgba(201,168,76,0.4)" }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setLaunched(true)}
            style={{
              background: "linear-gradient(135deg, #c9a84c, #a07830)",
              border: "none", borderRadius: "14px", padding: "18px 56px",
              color: "black", fontWeight: "bold", fontSize: "16px",
              cursor: "pointer", letterSpacing: "0.04em", fontFamily: "system-ui",
              boxShadow: "0 0 30px rgba(201,168,76,0.2)",
            }}
          >
            Launch Patent Law AI →
          </motion.button>
        </motion.section>

        {/* Footer */}
        <footer style={{
          borderTop: "1px solid rgba(255,255,255,0.06)", padding: "24px 40px",
          display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{
              width: "28px", height: "28px", borderRadius: "8px",
              background: "linear-gradient(135deg, #c9a84c, #a07830)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Scale size={12} color="black" />
            </div>
            <span style={{ fontSize: "13px", fontWeight: "bold", letterSpacing: "0.06em" }}>PATENT LAW AI</span>
          </div>
          <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.2)", fontFamily: "system-ui" }}>
            For informational purposes only · Not legal advice
          </p>
        </footer>

      </div>
    </div>
  );
}