import React, { useEffect, useMemo, useState } from "react";
import { NavLink } from "react-router-dom";
import {
  Activity,
  Cable,
  LayoutDashboard,
  Settings,
  Users,
  GitMerge,
  Radio,
  ClipboardCheck,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";
import { api } from "../../api/client";
import type { HealthResponse } from "../../api/types";

const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/profiles", label: "Profiles", icon: Users },
  { to: "/merges", label: "Merges", icon: GitMerge },
  { to: "/polling", label: "Polling", icon: Radio },
  { to: "/reviews", label: "Manual Reviews", icon: ClipboardCheck },
  { to: "/health", label: "Health", icon: Activity },
  { to: "/api", label: "API Explorer", icon: Cable },
  { to: "/settings", label: "Settings", icon: Settings },
];

type HealthState = {
  data: HealthResponse | null;
  loading: boolean;
  lastCheckedAt: string | null;
  error: string | null;
};

function formatTime(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString();
}

export default function Shell({ title, children }: { title: string; children: React.ReactNode }) {
  const [health, setHealth] = useState<HealthState>({
    data: null,
    loading: false,
    lastCheckedAt: null,
    error: null,
  });

  async function refreshHealth() {
    setHealth((s) => ({ ...s, loading: true, error: null }));
    try {
      const res = await api.get<HealthResponse>("/api/system/health");
      setHealth({ data: res.data, loading: false, lastCheckedAt: new Date().toISOString(), error: null });
    } catch (e: any) {
      setHealth((s) => ({
        ...s,
        loading: false,
        lastCheckedAt: new Date().toISOString(),
        error: e?.response?.data?.error ?? e?.message ?? "Failed to load health",
      }));
    }
  }

  useEffect(() => {
    refreshHealth();
    const ms = 5000;
    const t = setInterval(refreshHealth, ms);
    return () => clearInterval(t);
  }, []);

  const degraded = useMemo(() => {
    const status = health.data?.status;
    const dbOk = (health.data as any)?.db?.ok;
    if (typeof dbOk === "boolean") return !dbOk;
    return status === "degraded" || status === "error";
  }, [health.data]);

  return (
    <div className="min-h-screen">
      <div className="flex">
        <aside className="sticky top-0 h-screen w-72 shrink-0 border-r border-zinc-200 bg-white">
          <div className="p-5">
            <div className="text-xl font-semibold tracking-tight">Opera Profile Merger</div>
            <div className="text-sm text-zinc-600">Control panel</div>
          </div>

          <nav className="px-3">
            {navItems.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                className={({ isActive }) =>
                  `mb-1 flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition ${
                    isActive ? "bg-zinc-900 text-white" : "text-zinc-700 hover:bg-zinc-100"
                  }`
                }
                end={n.to === "/"}
              >
                <n.icon size={18} />
                {n.label}
              </NavLink>
            ))}
          </nav>

          <div className="mt-auto p-5 text-xs text-zinc-500">Tip: Configure OHIP + DB env vars in Settings.</div>
        </aside>

        <main className="flex-1">
          <header className="sticky top-0 z-10 border-b border-zinc-200 bg-zinc-50/80 backdrop-blur">
            {degraded ? (
              <div className="border-b border-amber-200 bg-amber-50">
                <div className="mx-auto max-w-6xl px-6 py-2">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-sm text-amber-900">
                      <AlertTriangle size={16} />
                      <span className="font-medium">Degraded mode:</span>
                      <span>database unavailable — some features may be disabled.</span>
                      <span className="text-amber-700">Last check: {formatTime(health.lastCheckedAt)}</span>
                      {health.error ? <span className="text-amber-700">({health.error})</span> : null}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={refreshHealth}
                        className="inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-white px-3 py-1.5 text-sm text-amber-900 hover:bg-amber-100"
                        type="button"
                      >
                        <RefreshCw size={16} className={health.loading ? "animate-spin" : ""} />
                        {health.loading ? "Retrying…" : "Retry now"}
                      </button>
                      <a
                        href="/settings"
                        className="inline-flex items-center rounded-xl border border-amber-200 bg-white px-3 py-1.5 text-sm text-amber-900 hover:bg-amber-100"
                      >
                        Open Settings
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="border-b border-zinc-200 bg-white/0">
                <div className="mx-auto max-w-6xl px-6 py-2">
                  <div className="flex items-center justify-end gap-2 text-xs text-zinc-500">
                    <RefreshCw size={14} className={health.loading ? "animate-spin" : ""} />
                    <span>{health.loading ? "Checking…" : `Last check: ${formatTime(health.lastCheckedAt)}`}</span>
                  </div>
                </div>
              </div>
            )}

            <div className="mx-auto max-w-6xl px-6 py-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-sm text-zinc-600">Tool</div>
                  <div className="text-xl font-semibold">{title}</div>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm hover:bg-zinc-100"
                    href="/api-docs"
                    target="_blank"
                    rel="noreferrer"
                  >
                    API Docs
                  </a>
                </div>
              </div>
            </div>
          </header>

          <div className="mx-auto max-w-6xl px-6 py-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
