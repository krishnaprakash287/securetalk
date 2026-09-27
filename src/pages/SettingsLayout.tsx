// ==============================================================================
// SecureTalk Settings Layout
// Navigation wrapper for Privacy, Security/Keys, and Device sessions
// ==============================================================================

import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { Shield, Lock, Laptop, Sliders, ArrowLeft } from 'lucide-react';
import { Navbar } from '../components/Navbar';

export const SettingsLayout: React.FC = () => {
  const navItems = [
    { to: '/settings/privacy', label: 'Privacy & Permissions', icon: Sliders },
    { to: '/settings/security', label: 'Cryptography & Keystore', icon: Lock },
    { to: '/settings/devices', label: 'Devices & Active Sessions', icon: Laptop },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#080b11] text-slate-100 select-none">
      <Navbar />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <span className="badge-e2ee text-[10px]">Security Console</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <Shield className="w-6 h-6 text-emerald-400" />
            <span>Account & Keystore Settings</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1 leading-relaxed">
            Manage your cryptographic keys, change password, privacy preferences, and authenticated sessions.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Navigation Sidebar */}
          <aside className="md:col-span-1 space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 ${
                      isActive
                        ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-800/50 shadow-sm'
                        : 'text-slate-400 hover:text-white hover:bg-white/[0.04] border border-transparent'
                    }`
                  }
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </aside>

          {/* Settings Content Area */}
          <section className="md:col-span-3">
            <Outlet />
          </section>
        </div>
      </main>
    </div>
  );
};
