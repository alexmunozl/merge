import React, { useEffect, useState } from "react";
import Shell from "../components/layout/Shell";
import { Card, SectionTitle } from "../components/ui";
import { api } from "../api/client";
import type { HealthResponse } from "../api/types";

export default function HealthPage() {
  const [data, setData] = useState<HealthResponse | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    api.get<HealthResponse>("/api/system/health").then(r => setData(r.data)).catch(e => setErr(e?.message ?? "Failed"));
  }, []);

  return (
    <Shell title="Health">
      <SectionTitle title="System health" subtitle="Live response from /api/system/health" />
      <Card className="p-5">
        {err ? <div className="text-sm text-red-700">{err}</div> :
          <pre className="overflow-auto rounded-xl bg-zinc-950 p-4 text-xs text-zinc-100">{JSON.stringify(data, null, 2)}</pre>}
      </Card>
    </Shell>
  );
}
