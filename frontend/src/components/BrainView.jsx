import React, { useState } from 'react';
import apiFetch from '../utils/apiFetch';
import {
  Activity, GitCommit, Ticket, Terminal, AlertCircle, CheckCircle,
  MessageSquare, ArrowRight, FileCode, Loader2
} from 'lucide-react';

const hideScrollbar = "[&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]";

export default function BrainView() {
  // All state initialized as empty for production
  const [logText, setLogText] = useState('');
  const [repoLink, setRepoLink] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [diagnosisData, setDiagnosisData] = useState(null);
  
  const [realCommits, setRealCommits] = useState([]);
  const [jiraTickets, setJiraTickets] = useState([]); // Will remain empty until you build a Jira API integration

  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState([
    {
      sender: 'ai',
      text: 'Institutional Brain online. Please provide a GitHub repository link and paste your stack trace below for analysis.'
    }
  ]);

  const handleAnalyze = async () => {
    if (!logText.trim()) return;
    
    setIsAnalyzing(true);
    setDiagnosisData(null);

    try {
      let path = 'facebook/react';
      if (repoLink) {
        path = repoLink.replace('https://github.com/', '').replace('http://github.com/', '').replace(/\/$/, '');
      }
      const gitRes = await fetch(`https://api.github.com/repos/${path}/commits?per_page=3`);
      if (gitRes.ok) {
        const gitData = await gitRes.json();
        const formattedCommits = gitData.map(c => ({
          id: c.sha.substring(0, 7),
          time: new Date(c.commit.author.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          message: c.commit.message.split('\n')[0],
          author: c.commit.author.name
        }));
        setRealCommits(formattedCommits);
      }
    } catch (error) {
      console.error("Failed to fetch UI commits", error);
    }

    try {
      const response = await apiFetch('/api/ops-brain', {
        method: 'POST',
        body: JSON.stringify({ query: "Analyze this stack trace: " + logText, repoUrl: repoLink })
      });

      // No more mock fallback. If the backend doesn't send a structured diagnosis, it stays null.
      setDiagnosisData(response.diagnosisData || null);
      setIsAnalyzing(false);

      setChatMessages((prev) => [
        ...prev,
        {
          sender: 'ai',
          text: response.answer
        }
      ]);
    } catch (error) {
      console.error(error);
      setIsAnalyzing(false);
      setChatMessages((prev) => [
        ...prev,
        { sender: 'ai', text: 'Error: Failed to connect to the intelligence engine.' }
      ]);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMsg = chatInput;
    setChatMessages((prev) => [...prev, { sender: 'user', text: userMsg }]);
    setChatInput('');

    try {
      const response = await apiFetch('/api/ops-brain', {
        method: 'POST',
        body: JSON.stringify({ query: userMsg, repoUrl: repoLink })
      });

      setChatMessages((prev) => [
        ...prev,
        { sender: 'ai', text: response.answer }
      ]);
    } catch (error) {
      setChatMessages((prev) => [...prev, { sender: 'ai', text: `Error reaching the Institutional Brain.` }]);
    }
  };

  return (
    <div className="h-full w-full bg-black text-zinc-950 dark:text-white font-outfit font-medium flex flex-col lg:flex-row p-4 lg:p-6 gap-6 overflow-hidden relative">
      {/* Floating Left Context Sidebar */}
      <aside className={`w-full lg:w-[30%] bg-zinc-100 dark:bg-zinc-900 rounded-xl p-5 lg:p-6 border border-white/10 shadow-xl flex flex-col justify-between overflow-y-auto ${hideScrollbar} flex-shrink-0 z-10`}>
        <div className="space-y-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-zinc-500 dark:text-zinc-400 tracking-wider uppercase mb-1.5 font-tech">
              <Terminal className="w-4 h-4 text-zinc-950 dark:text-white" />
              <span>DEVOPS TRIAGE TELEMETRY</span>
            </div>
            <h2 className="text-lg font-bold text-zinc-950 dark:text-white tracking-tight font-outfit">
              System Context Feed
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium mt-1 leading-relaxed font-outfit">
              Live streaming ingestion of source repository mutations and production incident tickets.
            </p>
          </div>

          {/* System Health Widget */}
          <div className="bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg p-4.5 shadow-[0_4px_14px_rgba(0,0,0,0.15)]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400 tracking-wider uppercase font-tech">
                SYSTEM HEALTH & TELEMETRY
              </span>
              <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-black text-white font-bold border border-black font-tech text-xs shadow-sm">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Operational</span>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-zinc-950 dark:text-white bg-zinc-100 dark:bg-zinc-900 px-3.5 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 mt-2 font-tech font-bold shadow-sm">
              <CheckCircle className="w-4 h-4 text-zinc-950 dark:text-white flex-shrink-0" />
              <span className="truncate">Active Log Ingestion: <span className="bg-black text-white font-bold px-2 py-0.5 rounded-md border border-black ml-1 font-tech">Ready</span></span>
            </div>
          </div>

          {/* Recent Commits List */}
          <div className="space-y-3 pt-4 border-t border-zinc-300 dark:border-zinc-700">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-zinc-500 dark:text-zinc-400 tracking-wider uppercase flex items-center gap-1.5 font-tech">
                <GitCommit className="w-4 h-4 text-zinc-950 dark:text-white" />
                <span>RECENT COMMITS</span>
              </h3>
            </div>

            <div className="space-y-3.5">
              {realCommits.length > 0 ? (
                realCommits.map((commit) => (
                  <div key={commit.id} className="bg-white dark:bg-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600 border border-zinc-300 dark:border-zinc-700 rounded-lg p-4 transition-colors shadow-[0_4px_14px_rgba(0,0,0,0.15)]">
                    <div className="flex items-center justify-between gap-2 mb-2.5">
                      <span className="font-fira bg-zinc-100 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-950 dark:text-white px-2.5 py-0.5 rounded-md text-xs font-bold shadow-sm">
                        {commit.id}
                      </span>
                      <span className="text-xs text-zinc-500 dark:text-zinc-400 font-bold font-outfit">
                        {commit.time}
                      </span>
                    </div>
                    <p className="text-base font-bold text-zinc-950 dark:text-white leading-snug font-outfit">
                      {commit.message}
                    </p>
                    <div className="mt-3 text-xs text-zinc-500 dark:text-zinc-400 font-bold flex items-center justify-between border-t border-zinc-300 dark:border-zinc-700 pt-2.5 font-outfit">
                      <span>Committer:</span>
                      <span className="text-zinc-950 dark:text-white font-bold">{commit.author}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-xs text-zinc-500 dark:text-zinc-400 font-bold text-center py-4">
                  No repository linked. Provide a URL to fetch commits.
                </div>
              )}
            </div>
          </div>

          {/* Active Jira Tickets List */}
          <div className="space-y-3 pt-4 border-t border-zinc-300 dark:border-zinc-700">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-zinc-500 dark:text-zinc-400 tracking-wider uppercase flex items-center gap-1.5 font-tech">
                <Ticket className="w-4 h-4 text-zinc-950 dark:text-white" />
                <span>ACTIVE JIRA TICKETS</span>
              </h3>
            </div>
            <div className="space-y-3.5">
               {jiraTickets.length === 0 && (
                  <div className="text-xs text-zinc-500 dark:text-zinc-400 font-bold text-center py-4">
                    Jira integration not configured.
                  </div>
               )}
            </div>
          </div>
        </div>
      </aside>

      {/* Right Workspace */}
      <section className={`w-full lg:w-[70%] bg-transparent flex flex-col space-y-6 overflow-y-auto ${hideScrollbar}`}>
        <div className="bg-zinc-100 dark:bg-zinc-900 rounded-xl p-4 px-6 border border-white/10 shadow-md flex-shrink-0 flex items-center gap-3">
          <GitCommit className="w-5 h-5 text-zinc-950 dark:text-white flex-shrink-0" />
          <input
            type="text"
            value={repoLink}
            onChange={(e) => setRepoLink(e.target.value)}
            placeholder="Target Repository URL (e.g., https://github.com/facebook/react)"
            className="w-full bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 focus:border-zinc-500 text-sm font-bold text-zinc-950 dark:text-white rounded-lg px-4 py-2 focus:outline-none shadow-[0_4px_14px_rgba(0,0,0,0.15)] transition-colors placeholder:text-zinc-400 font-outfit"
          />
        </div>

        <div className="bg-zinc-100 dark:bg-zinc-900 rounded-xl p-6 border border-white/10 shadow-xl space-y-4 flex-shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-300 dark:border-zinc-700 pb-3.5">
            <div className="flex items-center gap-2.5 font-outfit text-lg font-bold text-zinc-950 dark:text-white tracking-tight">
              <Terminal className="w-5 h-5 text-zinc-950 dark:text-white" />
              <span>Raw Production Log Ingestion & Stack Trace</span>
            </div>
          </div>
          <div className="relative">
            <textarea
              rows={5}
              value={logText}
              onChange={(e) => setLogText(e.target.value)}
              placeholder="Paste raw server stack traces or timeout logs here..."
              className={`w-full bg-black text-emerald-400 font-fira p-5 rounded-lg border-none focus:outline-none focus:ring-1 focus:ring-emerald-500 text-xs leading-relaxed resize-y shadow-inner ${hideScrollbar}`}
            />
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1 font-outfit">
            <span className="text-xs text-zinc-500 dark:text-zinc-400 font-bold flex items-center gap-1.5">
              <span>RAG Engine ready to correlate stack trace against history.</span>
            </span>
            <button
              onClick={handleAnalyze}
              disabled={isAnalyzing || !logText.trim()}
              className="px-6 py-3 rounded-lg bg-black hover:bg-zinc-900 text-white font-bold text-xs tracking-wide uppercase transition-colors disabled:opacity-60 flex items-center justify-center gap-2 self-end sm:self-auto cursor-pointer border border-zinc-800 shadow-xl active:translate-y-[0.5px]"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Correlating...</span>
                </>
              ) : (
                <>
                  <Activity className="w-4 h-4 text-white" />
                  <span>Analyze Log with RAG</span>
                </>
              )}
            </button>
          </div>
        </div>

        {isAnalyzing && (
          <div className="py-14 flex flex-col items-center justify-center bg-zinc-100 dark:bg-zinc-900 rounded-xl border border-white/10 shadow-xl text-center">
            <Loader2 className="w-9 h-9 animate-spin text-zinc-950 dark:text-white mb-3.5" />
            <h3 className="text-lg font-bold text-zinc-950 dark:text-white tracking-tight font-outfit">
              Traversing Institutional Graph & Vector Embeddings...
            </h3>
          </div>
        )}

        {/* Diagnosis UI removed. Will rely purely on the Chat dialogue until the backend is updated to send JSON objects back for diagnosis */}

        <div className="bg-zinc-100 dark:bg-zinc-900 rounded-xl p-6 border border-white/10 shadow-xl space-y-4 flex-shrink-0">
          <h3 className="text-xs font-bold text-zinc-500 dark:text-zinc-400 tracking-wider uppercase font-tech border-b border-zinc-300 dark:border-zinc-700 pb-3">
            INSTITUTIONAL AI TRIAGE DIALOGUE
          </h3>
          <div className="space-y-4 pt-1">
            {chatMessages.map((msg, index) => {
              const isAI = msg.sender === 'ai';
              return (
                <div key={index} className={`flex items-start gap-4 p-4.5 rounded-lg shadow-[0_4px_14px_rgba(0,0,0,0.15)] ${isAI ? 'bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-950 dark:text-white font-medium' : 'bg-black border border-black text-white font-medium ml-6 sm:ml-12 shadow-[0_6px_18px_rgba(0,0,0,0.25)]'}`}>
                  <div className={`px-2.5 py-1 rounded-md flex-shrink-0 mt-0.5 font-bold text-xs font-tech border shadow-sm ${isAI ? 'bg-black text-white border-black' : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-950 dark:text-white border-zinc-300 dark:border-zinc-700'}`}>
                    {isAI ? 'AI' : 'DEV'}
                  </div>
                  <div className="flex-1 leading-relaxed text-base font-outfit whitespace-pre-wrap">
                    {msg.text}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-zinc-100 dark:bg-zinc-900 rounded-xl p-4 px-6 border border-white/10 shadow-[0_8px_24px_rgba(0,0,0,0.2)] flex-shrink-0">
          <form onSubmit={handleSendMessage} className="flex items-center gap-3 w-full">
            <div className="relative flex-1">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Ask follow-up questions..."
                className="w-full bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 focus:border-zinc-500 text-sm font-bold text-zinc-950 dark:text-white rounded-lg px-4 py-3 pl-11 focus:outline-none shadow-[0_4px_14px_rgba(0,0,0,0.15)] transition-colors placeholder:text-zinc-400 font-outfit"
              />
              <MessageSquare className="w-4.5 h-4.5 text-zinc-950 dark:text-white absolute left-4 top-3.5 flex-shrink-0 pointer-events-none" />
            </div>
            <button
              type="submit"
              disabled={!chatInput.trim()}
              className="px-6 py-3 rounded-lg bg-black hover:bg-zinc-900 text-white text-xs font-bold uppercase tracking-wide flex items-center gap-2 transition-colors disabled:opacity-50 disabled:pointer-events-none active:translate-y-[0.5px] flex-shrink-0 cursor-pointer border border-zinc-800 shadow-[0_4px_14px_rgba(0,0,0,0.2)] font-outfit"
            >
              <span>Transmit</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}