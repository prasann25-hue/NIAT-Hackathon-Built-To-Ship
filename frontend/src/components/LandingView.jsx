import React, { useState } from 'react';
import { Command, ArrowRight, Lock, Terminal, Sparkles, ChevronDown } from 'lucide-react';

const TOTAL_COLS = 48;
const SCALE_FACTOR = 0.35; 
const BASE_DOT_SIZES = [5, 10, 16, 26];
const TOP_DOT_SIZES = BASE_DOT_SIZES.map((size) => size * SCALE_FACTOR); 
const BOTTOM_DOT_SIZES = [...TOP_DOT_SIZES].reverse(); 

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function LandingView() {
  // Hardcoded credentials removed for production!
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleGitHubLogin = () => {
    window.location.href = `${API_BASE}/auth/github`;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    handleGitHubLogin();
  };

  return (
    <div className="flex flex-col min-h-screen w-full overflow-y-auto antialiased font-outfit selection:bg-zinc-700 text-white">
      <style>{`
        @keyframes breathe {
          0%, 100% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(0.4);
            opacity: 0.2;
          }
        }
      `}</style>
      
      {/* Top Section */}
      <section className="w-full min-h-[85vh] bg-black flex flex-col items-center justify-center text-center px-6 py-20 relative overflow-hidden">
        <div className="max-w-3xl w-full space-y-8 z-10 my-auto">
          {/* Centered Branding Logo */}
          <div className="flex items-center justify-center gap-3 w-fit mx-auto">
            <div className="flex items-center justify-center">
              <Command className="w-8 h-8 text-white" />
            </div>
            <span className="font-bold tracking-tight text-2xl text-white font-tech">
              Dev Assist AI
            </span>
          </div>

          {/* Centered Hero Headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold font-outfit tracking-tight text-white leading-tight max-w-3xl mx-auto">
            Engineering Intelligence, Institutionalized.
          </h1>

          {/* Centered Subheadline */}
          <p className="text-zinc-400 font-outfit text-base sm:text-lg lg:text-xl leading-relaxed max-w-2xl mx-auto">
            Transform PRDs into enterprise architecture in seconds. Triage production incidents instantly with RAG-powered contextual memory.
          </p>

          {/* Centered Developer Terminal Mockup */}
          <div className="pt-4 max-w-2xl w-full mx-auto">
            <div className="bg-black border border-zinc-800 rounded-lg p-5 shadow-2xl relative text-left">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-zinc-800/80">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                  <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                  <span className="text-[11px] font-tech font-bold text-zinc-400 ml-2 uppercase tracking-wider">
                    DEVOPS TELEMETRY SHELL
                  </span>
                </div>
                <span className="text-[10px] font-tech text-emerald-400 bg-emerald-950/40 border border-emerald-800/50 px-2.5 py-0.5 rounded font-bold">
                  LIVE RAG CONNECTED
                </span>
              </div>
              
              <div className="font-fira text-xs space-y-2.5 leading-relaxed text-zinc-300">
                <div className="flex items-center gap-2 text-white">
                  <span className="text-emerald-400 font-bold">$</span>
                  <span>dev-assist triage --context git:main --jira DEV-402</span>
                </div>
                <div className="text-zinc-400">
                  <span className="text-yellow-400 font-bold">[!]</span> Stack trace ingested: PoolExhaustedError in /services/matchmaking.js
                </div>
                <div className="text-zinc-400">
                  <span className="text-emerald-400 font-bold">[✓]</span> RAG correlation: 99.4% confidence (Commit <span className="text-white font-bold">a1b2c3d</span>)
                </div>
                <div className="text-emerald-400 font-bold bg-zinc-900/50 p-3 rounded border border-zinc-800 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span>Generated zero-leak remediation patch via PostgreSQL connection pooling</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12 text-zinc-500 flex flex-col items-center gap-1 text-xs font-tech font-bold uppercase tracking-widest animate-pulse z-10">
          <span>Sign in below</span>
          <ChevronDown className="w-4 h-4 text-zinc-400" />
        </div>

        <div className="absolute bottom-0 left-0 w-full h-24 flex justify-between items-end px-4 pointer-events-none z-0 pb-2.5 overflow-hidden">
          {Array.from({ length: TOTAL_COLS }).map((_, index) => {
            const distance = Math.abs(index - (TOTAL_COLS - 1) / 2) / ((TOTAL_COLS - 1) / 2);
            const scale = Math.max(0.15, distance);
            return (
              <div key={index} className="flex flex-col items-center gap-2 justify-end">
                {TOP_DOT_SIZES.map((size, dotIdx) => (
                  <div
                    key={dotIdx}
                    className="bg-white rounded-full transition-all"
                    style={{
                      width: `${size * scale}px`,
                      height: `${size * scale}px`,
                      opacity: dotIdx === 0 ? 0.5 : dotIdx === 1 ? 0.75 : 1,
                      animation: 'breathe 4s ease-in-out infinite',
                      animationDelay: `${(index % 10) * 0.4}s`,
                      transformOrigin: 'center',
                      willChange: 'transform, opacity',
                    }}
                  />
                ))}
              </div>
            );
          })}
        </div>
      </section>

      {/* Bottom Section */}
      <section className="w-full min-h-[50vh] bg-zinc-100 flex items-center justify-center py-20 px-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-24 flex justify-between items-start px-4 pointer-events-none z-0 pt-2.5 overflow-hidden">
          {Array.from({ length: TOTAL_COLS }).map((_, index) => {
            const distance = Math.abs(index - (TOTAL_COLS - 1) / 2) / ((TOTAL_COLS - 1) / 2);
            const scale = Math.max(0.15, distance);
            return (
              <div key={index} className="flex flex-col items-center gap-2 justify-start">
                {BOTTOM_DOT_SIZES.map((size, dotIdx) => (
                  <div
                    key={dotIdx}
                    className="bg-zinc-950 rounded-full transition-all"
                    style={{
                      width: `${size * scale}px`,
                      height: `${size * scale}px`,
                      opacity: dotIdx === 3 ? 0.5 : dotIdx === 2 ? 0.75 : 1,
                      animation: 'breathe 4s ease-in-out infinite',
                      animationDelay: `${(index % 10) * 0.4}s`,
                      transformOrigin: 'center',
                      willChange: 'transform, opacity',
                    }}
                  />
                ))}
              </div>
            );
          })}
        </div>

        <div className="bg-white rounded-xl border border-zinc-300 p-8 w-full max-w-md shadow-[0_8px_24px_rgba(0,0,0,0.15)] text-zinc-950 z-10">
          <div className="space-y-1.5 mb-8">
            <h2 className="text-2xl font-bold font-outfit text-zinc-950 tracking-tight">
              Welcome back
            </h2>
            <p className="text-xs font-outfit text-zinc-500 font-medium">
              Sign in to access your Dev Assist AI institutional workspace.
            </p>
          </div>

          <button
            type="button"
            onClick={handleGitHubLogin}
            className="w-full py-3 px-4 rounded-lg bg-white hover:bg-zinc-50 text-zinc-950 font-bold font-outfit text-xs tracking-wide transition-all border border-zinc-300 hover:border-zinc-400 shadow-[0_4px_14px_rgba(0,0,0,0.08)] flex items-center justify-center gap-2.5 cursor-pointer active:translate-y-[0.5px]"
          >
            <svg className="w-4 h-4 fill-current text-zinc-950" viewBox="0 0 24 24">
              <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
            </svg>
            <span>Continue with GitHub</span>
          </button>

          <div className="flex items-center my-6">
            <div className="flex-1 border-t border-zinc-200" />
            <span className="px-3 text-[11px] font-tech font-bold text-zinc-400 uppercase tracking-widest">
              OR
            </span>
            <div className="flex-1 border-t border-zinc-200" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-tech font-bold uppercase text-zinc-600 tracking-wider mb-1.5">
                ENTERPRISE EMAIL
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="lead.developer@company.com"
                required
                className="w-full bg-zinc-50 border border-zinc-200 focus:border-zinc-500 focus:bg-white text-xs text-zinc-950 font-outfit font-bold rounded-lg p-3.5 outline-none transition-colors shadow-inner placeholder:text-zinc-400 placeholder:font-medium"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-tech font-bold uppercase text-zinc-600 tracking-wider">
                  PASSWORD / TOKEN
                </label>
                <span className="text-xs text-zinc-500 font-bold hover:text-zinc-950 cursor-pointer transition-colors">
                  Forgot?
                </span>
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-zinc-50 border border-zinc-200 focus:border-zinc-500 focus:bg-white text-xs text-zinc-950 font-outfit font-bold rounded-lg p-3.5 outline-none transition-colors shadow-inner tracking-widest placeholder:text-zinc-400 placeholder:font-medium placeholder:tracking-normal"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                onClick={handleSubmit}
                className="w-full py-3.5 px-4 rounded-lg bg-black hover:bg-zinc-900 text-white font-bold font-outfit text-xs tracking-wide uppercase transition-all border border-zinc-800 shadow-[0_4px_14px_rgba(0,0,0,0.2)] active:translate-y-[0.5px] flex items-center justify-center gap-2 cursor-pointer"
              >
                <Lock className="w-4 h-4 text-white flex-shrink-0" />
                <span>Sign In</span>
                <ArrowRight className="w-4 h-4 text-white ml-0.5" />
              </button>
            </div>
          </form>

          <div className="mt-8 pt-6 border-t border-zinc-200/80">
            <div className="flex flex-col items-center gap-1.5 mt-6">
              <div className="flex items-center gap-2 text-xs font-tech font-bold text-zinc-500">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>256-BIT TLS ENCRYPTED RAG TELEMETRY</span>
              </div>
              <div className="flex items-center gap-2 text-xs font-tech font-bold text-zinc-500">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>END TO END ENCRYPTED WITH PASSWORD HASHING</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}