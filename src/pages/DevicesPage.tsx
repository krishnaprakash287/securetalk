// ==============================================================================
// SecureTalk Active Devices & Sessions Page
// Minimal, privacy-conscious session management without invasive fingerprinting
// ==============================================================================

import React, { useState, useEffect } from 'react';
import { Laptop, Smartphone, Trash2, ShieldCheck, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { userService } from '../services/userService';
import { sanitizeErrorMessage } from '../utils/errors';
import type { DeviceSession } from '../types/database';

export const DevicesPage: React.FC = () => {
  const { user } = useAuth();
  const [devices, setDevices] = useState<DeviceSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const loadDevices = async () => {
    if (!user) return;
    try {
      setLoading(true);
      setError(null);
      const list = await userService.getDevices(user.id);
      setDevices(list);
    } catch (err) {
      setError(sanitizeErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDevices();
  }, [user]);

  const handleRevoke = async (deviceId: string) => {
    if (!user) return;
    const confirm = window.confirm('Revoke this session? This device will be signed out.');
    if (!confirm) return;

    try {
      setRevokingId(deviceId);
      await userService.removeDevice(deviceId, user.id);
      setDevices((prev) => prev.filter((d) => d.id !== deviceId));
    } catch (err) {
      setError(sanitizeErrorMessage(err));
    } finally {
      setRevokingId(null);
    }
  };

  return (
    <div className="space-y-6 select-none">
      {error && (
        <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-800/40 text-rose-300 text-xs flex items-center gap-2.5 shadow-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="card space-y-4">
        <div className="border-b border-white/[0.07] pb-3.5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Laptop className="w-4 h-4 text-emerald-400" />
              <span>Active Sessions & Devices</span>
            </h2>
            <span className="badge-e2ee text-[10px]">Per-Device Keys</span>
          </div>
          <p className="text-xs text-slate-400 mt-1 leading-relaxed">
            Manage authenticated device sessions. Revoking a session terminates access tokens immediately.
          </p>
        </div>

        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center gap-2.5 text-slate-500">
            <Loader2 className="w-5 h-5 animate-spin text-emerald-500" />
            <span className="text-xs font-mono">Loading sessions...</span>
          </div>
        ) : devices.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-xs">
            No other active sessions registered.
          </div>
        ) : (
          <div className="divide-y divide-white/[0.05] space-y-3">
            {devices.map((dev, idx) => {
              const isCurrent = idx === 0;
              const isMobile = dev.device_type === 'mobile';
              const Icon = isMobile ? Smartphone : Laptop;

              return (
                <div key={dev.id} className="pt-3 first:pt-0 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="p-2.5 rounded-xl bg-[#090d16] border border-white/[0.08] text-emerald-400 shadow-inner">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white flex items-center gap-2">
                        <span>{dev.device_name}</span>
                        {isCurrent && (
                          <span className="px-2 py-0.5 text-[9px] font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-800/50 rounded-full flex items-center gap-1 shadow-sm">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            <span>Current Device</span>
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5 font-mono">
                        Last active: {new Date(dev.last_active).toLocaleString([], {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })}
                      </div>
                    </div>
                  </div>

                  {!isCurrent && (
                    <button
                      onClick={() => handleRevoke(dev.id)}
                      disabled={revokingId === dev.id}
                      className="btn-danger text-xs py-1.5 px-3 flex items-center gap-1.5"
                    >
                      {revokingId === dev.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                      )}
                      <span>Revoke</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="p-4 rounded-xl bg-[#0c121e] border border-white/[0.06] text-xs text-slate-400 space-y-1.5 shadow-sm">
        <div className="flex items-center gap-2 text-slate-300 font-semibold">
          <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>Zero Hardware Fingerprinting</span>
        </div>
        <p className="text-[11px] text-slate-400 leading-relaxed">
          SecureTalk identifies sessions strictly through browser-reported User-Agent strings. We do not extract canvas fingerprints, battery stats, or persistent tracking cookies.
        </p>
      </div>
    </div>
  );
};
