'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Terminal, Activity, CheckCircle, AlertTriangle, Layers, Send, Loader2 } from 'lucide-react';

interface TelemetryLog {
  id: string;
  step_name: string;
  log_level: 'INFO' | 'WARN' | 'ERROR' | 'CRITICAL';
  message: string;
  execution_time_ms: number;
  created_at: string;
}

export default function TelemetryDashboard() {
  const [companyInput, setCompanyInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [logs, setLogs] = useState<TelemetryLog[]>([]);
  const [jobStatus, setJobStatus] = useState<string | null>(null);

  // Poll the database every 1.5 seconds for new telemetry logs once a job starts
  useEffect(() => {
    if (!currentJobId) return;

    const fetchLogsAndStatus = async () => {
      // 1. Fetch real-time execution steps
      const { data: telemetryLogs } = await supabase
        .from('pipeline_telemetry')
        .select('*')
        .eq('job_id', currentJobId)
        .order('created_at', { ascending: true });

      if (telemetryLogs) setLogs(telemetryLogs);

      // 2. Fetch overall job status
      const { data: jobData } = await supabase
        .from('enrichment_jobs')
        .select('status')
        .eq('id', currentJobId)
        .single();

      if (jobData) {
        setJobStatus(jobData.status);
        if (jobData.status === 'completed' || jobData.status === 'failed') {
          setIsSubmitting(false);
        }
      }
    };

    fetchLogsAndStatus();
    const interval = setInterval(fetchLogsAndStatus, 1500);
    return () => clearInterval(interval);
  }, [currentJobId]);

  const handleTriggerPipeline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyInput.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setLogs([]);
    setJobStatus('pending');
    setCurrentJobId(null);

    try {
      const response = await fetch('/api/enrich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company: companyInput.trim() }),
      });

      const data = await response.json();
      if (response.ok && data.jobId) {
        setCurrentJobId(data.jobId);
      } else {
        setIsSubmitting(false);
        alert(data.error || 'Pipeline ingestion initialization failed.');
      }
    } catch (err) {
      console.error(err);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans antialiased selection:bg-teal-500/30">
      {/* Upper Navigation Bar */}
      <header className="border-b border-slate-900 bg-slate-950/80 backdrop-blur sticky top-0 z-50 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-teal-500/10 flex items-center justify-center border border-teal-500/30">
            <Layers className="h-5 w-5 text-teal-400 animate-pulse" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight bg-gradient-to-r from-teal-400 to-emerald-400 bg-clip-text text-transparent">SignalStack</h1>
            <p className="text-xs text-slate-500 font-medium">B2B Telemetry & AI Enrichment Engine</p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs font-mono text-slate-400">
          <Activity className={`h-3.5 w-3.5 ${isSubmitting ? 'text-teal-400 animate-spin' : 'text-slate-500'}`} />
          <span>STATUS: {jobStatus ? jobStatus.toUpperCase() : 'IDLE'}</span>
        </div>
      </header>

      {/* Primary Dashboard Area */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Interactive Control Panel */}
        <section className="md:col-span-1 bg-slate-900/40 border border-slate-900 rounded-xl p-5 h-fit backdrop-blur-sm">
          <h2 className="text-sm font-semibold tracking-wider uppercase text-slate-400 mb-4 flex items-center gap-2">
            <Send className="h-4 w-4 text-teal-400" /> Pipeline Ingestion
          </h2>
          <form onSubmit={handleTriggerPipeline} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">Target Corporate Entity</label>
              <input
                type="text"
                placeholder="e.g., Apple, Stripe, Acme Corp"
                value={companyInput}
                onChange={(e) => setCompanyInput(e.target.value)}
                disabled={isSubmitting}
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/30 disabled:opacity-50 transition font-mono text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={isSubmitting || !companyInput.trim()}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-slate-950 font-semibold py-3 px-4 rounded-lg shadow-lg shadow-teal-500/10 active:scale-[0.98] transition disabled:opacity-40 disabled:pointer-events-none text-sm"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Processing Queue...
                </>
              ) : (
                'Launch Enrichment'
              )}
            </button>
          </form>
        </section>

        {/* Right Real-time Streaming Console Log Terminal */}
        <section className="md:col-span-2 flex flex-col h-[550px] bg-slate-950 border border-slate-900 rounded-xl overflow-hidden shadow-2xl shadow-black/50">
          <div className="bg-slate-900/80 px-4 py-3 border-b border-slate-900 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
              <Terminal className="h-4 w-4 text-teal-400" />
              <span>STDOUT_STREAM // telemetry_logs</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-2.5 w-2.5 rounded-full bg-slate-800" />
              <div className="h-2.5 w-2.5 rounded-full bg-slate-800" />
              <div className="h-2.5 w-2.5 rounded-full bg-slate-800" />
            </div>
          </div>

          <div className="flex-1 p-5 overflow-y-auto font-mono text-xs space-y-3.5 bg-slate-950/40 custom-scrollbar">
            {logs.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-600 space-y-2">
                <Terminal className="h-8 w-8 stroke-[1.5] text-slate-800" />
                <p>Awaiting corporate enrichment target...</p>
              </div>
            ) : (
              logs.map((log) => {
                const isError = log.log_level === 'ERROR' || log.log_level === 'CRITICAL';
                return (
                  <div key={log.id} className={`p-3 rounded-lg border flex gap-3 transition-all duration-300 transform translate-y-0 ${isError ? 'bg-red-950/20 border-red-900/40 text-red-300' : 'bg-slate-900/30 border-slate-900 text-slate-300'}`}>
                    <div>
                      {isError ? (
                        <AlertTriangle className="h-4 w-4 text-red-400 mt-0.5" />
                      ) : log.step_name === 'ORCHESTRATION' ? (
                        <CheckCircle className="h-4 w-4 text-emerald-400 mt-0.5" />
                      ) : (
                        <Activity className="h-4 w-4 text-teal-400 mt-0.5 animate-pulse" />
                      )}
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className={`font-bold px-1.5 py-0.5 rounded text-[10px] tracking-wide ${isError ? 'bg-red-500/10 border border-red-500/20' : 'bg-slate-800 text-slate-400'}`}>
                          {log.step_name}
                        </span>
                        <span className="text-[10px] text-slate-600 font-medium">
                          {log.execution_time_ms > 0 ? `+${log.execution_time_ms}ms` : 'async'}
                        </span>
                      </div>
                      <p className="text-slate-300 text-xs leading-relaxed font-mono selection:bg-teal-500/40">{log.message}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
