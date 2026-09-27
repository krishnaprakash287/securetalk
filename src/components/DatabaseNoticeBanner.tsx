// ==============================================================================
// SecureTalk Database Setup Notice Banner
// Automatically detects if Supabase tables have not been created yet
// and provides a 1-click SQL copy and direct link to Supabase SQL editor.
// ==============================================================================

import React, { useState, useEffect } from 'react';
import { Database, Copy, Check, ExternalLink, X, AlertTriangle } from 'lucide-react';
import { supabase } from '../lib/supabase';

export const DatabaseNoticeBanner: React.FC = () => {
  const [missingTables, setMissingTables] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    supabase
      .from('profiles')
      .select('id')
      .limit(1)
      .then(({ error }) => {
        if (error && (error.message.includes('schema cache') || error.code === 'PGRST205')) {
          setMissingTables(true);
        } else {
          setMissingTables(false);
        }
      });
  }, []);

  const handleCopyPath = () => {
    navigator.clipboard.writeText('supabase/schema.sql');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRecheck = async () => {
    const { error } = await supabase.from('profiles').select('id').limit(1);
    if (!error || !error.message.includes('schema cache')) {
      setMissingTables(false);
      setShowModal(false);
      window.location.reload();
    } else {
      alert('Tables not detected yet. Make sure you clicked "Run" in your Supabase SQL editor.');
    }
  };

  if (!missingTables) return null;

  return (
    <>
      <div className="bg-amber-950/80 border-b border-amber-800/60 text-amber-200 px-4 py-2.5 text-xs flex items-center justify-between gap-3 z-50">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <span>
            <strong className="font-semibold text-amber-100">Database setup required:</strong> Tables have not been created in your Supabase project yet.
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowModal(true)}
            className="px-2.5 py-1 bg-amber-900/60 hover:bg-amber-800/60 text-amber-100 border border-amber-700/60 rounded font-medium transition-colors"
          >
            Instructions & SQL
          </button>
        </div>
      </div>

      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-xl bg-[#0f1420] border border-amber-800/60 rounded-xl shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#1e2638]">
              <div className="flex items-center gap-2 text-amber-400 font-semibold text-base">
                <Database className="w-5 h-5" />
                <span>Initialize Supabase Database Schema</span>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 text-slate-400 hover:text-white rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Your Supabase credentials are connected, but PostgreSQL tables (<code className="text-amber-300">profiles</code>, <code className="text-amber-300">messages</code>, <code className="text-amber-300">devices</code>, etc.) need to be created in your Supabase project.
            </p>

            <div className="space-y-3 text-xs bg-[#0a0d14] p-4 rounded-lg border border-[#1e2638]">
              <div className="font-semibold text-slate-200">Step-by-step instructions:</div>
              <ol className="list-decimal list-inside space-y-2 text-slate-400 text-xs">
                <li>
                  Open your project's SQL Editor:{' '}
                  <a
                    href="https://supabase.com/dashboard/project/kpyuxeeefwyxlmsxepjv/sql"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-400 underline font-mono inline-flex items-center gap-1"
                  >
                    <span>Supabase SQL Editor</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </li>
                <li>
                  Open the file <span className="font-mono text-emerald-400 bg-[#141b2b] px-1.5 py-0.5 rounded border border-[#232c42]">supabase/schema.sql</span> in this workspace.
                </li>
                <li>
                  Copy all lines from <code className="text-slate-300">supabase/schema.sql</code>, paste into the Supabase SQL Editor, and click the green <strong className="text-emerald-400">Run</strong> button.
                </li>
              </ol>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <a
                href="https://supabase.com/dashboard/project/kpyuxeeefwyxlmsxepjv/sql"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary text-xs py-2 px-4 inline-flex items-center gap-1.5"
              >
                <span>Open Supabase SQL Editor</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>

              <button
                onClick={handleRecheck}
                className="btn-secondary text-xs py-2 px-4 text-emerald-400 border-emerald-800/50"
              >
                I've Run the Script — Re-check Database
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
