import React, { useEffect, useState } from "react";
import Shell from "../components/layout/Shell";
import { Badge, Card, SectionTitle } from "../components/ui";
import { api } from "../api/client";
import type { HealthResponse } from "../api/types";

export default function DashboardPage() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    api.get("/api/system/health").then(r => setHealth(r.data)).catch(e => setErr(e?.message ?? "Failed health"));
    api.get("/dashboard/api/dashboard/stats").then(r => setStats(r.data)).catch(() => {});
  }, []);

  return (
    <Shell title="Dashboard">
      <SectionTitle title="Overview" subtitle="System health and merge statistics." />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div className="text-sm text-zinc-600">Backend</div>
            <Badge>{health?.status ?? (err ? "error" : "loading")}</Badge>
          </div>
          <div className="mt-3 text-2xl font-semibold">
            {health?.status === "ok" ? "Healthy" : health?.status === "degraded" ? "Degraded" : err ? "Error" : "Loading…"}
          </div>
          <div className="mt-2 text-sm text-zinc-600">
            {health?.version ? `Version: ${health.version}` : "Version: unknown"}
          </div>
        </Card>

        <Card className="p-5">
          <div className="text-sm text-zinc-600">Profiles in DB</div>
          <div className="mt-3 text-2xl font-semibold">{stats?.profiles?.total ?? "—"}</div>
          <div className="mt-2 text-sm text-zinc-600">
            Active: {stats?.profiles?.active ?? "—"} • Inactive: {stats?.profiles?.inactive ?? "—"}
          </div>
        </Card>

        <Card className="p-5">
          <div className="text-sm text-zinc-600">Merges</div>
          <div className="mt-3 text-2xl font-semibold">{stats?.merges?.total_merges ?? "—"}</div>
          <div className="mt-2 text-sm text-zinc-600">
            Completed: {stats?.merges?.completed ?? "—"} • Failed: {stats?.merges?.failed ?? "—"}
          </div>
        </Card>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card className="p-5">
          <div className="text-sm font-semibold">Quick actions</div>
          <div className="mt-2 text-sm text-zinc-600">
            Go to Profiles to search and inspect duplicates, then Merges to analyze + execute.
          </div>
        </Card>
        <Card className="p-5">
          <div className="text-sm font-semibold">Manual reviews</div>
          <div className="mt-2 text-sm text-zinc-600">
            Check pending merge reviews and approve/reject them.
          </div>
        </Card>
      </div>
    </Shell>
  );
}
