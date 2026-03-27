import React, { useEffect, useState } from "react";
import Shell from "../components/layout/Shell";
import { Badge, Button, Card, Input, SectionTitle } from "../components/ui";
import ObjectTable from "../components/pretty/ObjectTable";
import DataTable from "../components/pretty/DataTable";
import { api } from "../api/client";

export default function MergesPage() {
  const [masterProfileId, setMaster] = useState("");
  const [duplicateProfileId, setDup] = useState("");
  const [analysis, setAnalysis] = useState<any>(null);
  const [out, setOut] = useState<any>(null);
  const [tab, setTab] = useState<"snapshot" | "history" | "statistics">("statistics");
  const [data, setData] = useState<any>(null);
  const [err, setErr] = useState<string>("");

  async function analyze() {
    setErr("");
    setAnalysis(null);
    try {
      const res = await api.post("/api/merges/analyze", { survivorProfileId: masterProfileId, victimProfileId: duplicateProfileId });
      setAnalysis(res.data);
    } catch (e: any) {
      setErr(e?.response?.data?.error ?? e?.message ?? "Analyze failed");
    }
  }

  async function execute() {
    setErr("");
    setOut(null);
    try {
      const res = await api.post("/api/merges/execute", { survivorProfileId: masterProfileId, victimProfileId: duplicateProfileId, executedBy: "manual" });
      setOut(res.data);
    } catch (e: any) {
      setErr(e?.response?.data?.error ?? e?.message ?? "Execute failed");
    }
  }

  async function loadTab(next: typeof tab) {
    setTab(next);
    setErr("");
    setData(null);
    try {
      const url =
        next === "snapshot" ? "/api/merges/snapshot" :
        next === "history" ? "/api/merges/history" :
        "/api/merges/statistics";
      const res = await api.get(url);
      setData(res.data);
    } catch (e: any) {
      setErr(e?.response?.data?.error ?? e?.message ?? "Load failed");
    }
  }

  useEffect(() => { loadTab("statistics"); }, []);

  return (
    <Shell title="Merges">
      <SectionTitle title="Analyze & Execute merges" subtitle="Run AI analysis and execute the merge workflow." />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-1">
          <div className="grid gap-3">
            <div>
              <div className="text-xs text-zinc-600 mb-1">Master Profile ID</div>
              <Input value={masterProfileId} onChange={(e) => setMaster(e.target.value)} placeholder="e.g. 12345" />
            </div>
            <div>
              <div className="text-xs text-zinc-600 mb-1">Duplicate Profile ID</div>
              <Input value={duplicateProfileId} onChange={(e) => setDup(e.target.value)} placeholder="e.g. 67890" />
            </div>
            <div className="flex gap-2">
              <Button onClick={analyze} disabled={!masterProfileId || !duplicateProfileId}>Analyze</Button>
              <Button variant="danger" onClick={execute} disabled={!masterProfileId || !duplicateProfileId}>Execute</Button>
            </div>
            {err ? <div className="text-sm text-red-700">{err}</div> : null}
          </div>
        </Card>

        <Card className="p-5 lg:col-span-2">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
                <div className="flex items-center gap-2">
                  <div className="text-sm font-semibold">Analysis</div>
                  {analysis?.recommendation?.action ? <Badge>{analysis.recommendation.action}</Badge> : null}
                </div>

                <ObjectTable
                  className="mt-2"
                  data={analysis ? {
                    shouldMerge: analysis.shouldMerge,
                    survivorProfileId: analysis.survivorProfileId,
                    victimProfileId: analysis.victimProfileId,
                    similarityOverall: analysis.similarity?.overall != null ? Number(analysis.similarity.overall).toFixed(3) : undefined,
                    confidence: analysis.recommendation?.confidence != null ? Number(analysis.recommendation.confidence).toFixed(3) : undefined,
                    reason: analysis.recommendation?.reason ?? analysis.reason
                  } : null}
                />

                {Array.isArray(analysis?.mergeAnalysis?.potentialConflicts) && analysis.mergeAnalysis.potentialConflicts.length ? (
                  <div className="mt-3">
                    <DataTable
                      title="Potential conflicts"
                      rows={analysis.mergeAnalysis.potentialConflicts}
                    />
                  </div>
                ) : null}

                {Array.isArray(analysis?.mergeAnalysis?.warnings) && analysis.mergeAnalysis.warnings.length ? (
                  <div className="mt-3">
                    <DataTable
                      title="Warnings"
                      rows={analysis.mergeAnalysis.warnings}
                    />
                  </div>
                ) : null}

                <details className="mt-3 rounded-2xl border border-zinc-200 bg-white p-4">
                  <summary className="cursor-pointer text-sm font-semibold">Raw analysis JSON</summary>
                  <pre className="mt-3 overflow-auto rounded-xl bg-zinc-950 p-3 text-xs text-zinc-100 max-h-[420px]">
{analysis ? JSON.stringify(analysis, null, 2) : "Run Analyze…"}
                  </pre>
                </details>
              </div>
            <div>
                <div className="text-sm font-semibold">Execute result</div>
                <ObjectTable
                  className="mt-2"
                  data={out ? {
                    ok: out.ok ?? out.success,
                    message: out.message,
                    mergeId: out.mergeId,
                    survivorProfileId: out.survivorProfileId,
                    victimProfileId: out.victimProfileId,
                    status: out.status
                  } : null}
                />
                <details className="mt-3 rounded-2xl border border-zinc-200 bg-white p-4">
                  <summary className="cursor-pointer text-sm font-semibold">Raw execute JSON</summary>
                  <pre className="mt-3 overflow-auto rounded-xl bg-zinc-950 p-3 text-xs text-zinc-100 max-h-[420px]">
{out ? JSON.stringify(out, null, 2) : "Run Execute…"}
                  </pre>
                </details>
              </div>
          </div>
        </Card>
      </div>

      <div className="mt-6">
        <SectionTitle title="Reporting" subtitle="Snapshot, history, statistics." />
        <div className="flex gap-2">
          <Button variant={tab === "statistics" ? "primary" : "secondary"} onClick={() => loadTab("statistics")}>Statistics</Button>
          <Button variant={tab === "history" ? "primary" : "secondary"} onClick={() => loadTab("history")}>History</Button>
          <Button variant={tab === "snapshot" ? "primary" : "secondary"} onClick={() => loadTab("snapshot")}>Snapshot</Button>
        </div>
        <Card className="mt-3 p-5">
                {Array.isArray(data) ? (
                  <DataTable rows={data} />
                ) : data && typeof data === "object" ? (
                  <ObjectTable data={data} />
                ) : (
                  <div className="text-sm text-zinc-600">Loading…</div>
                )}
                <details className="mt-3 rounded-2xl border border-zinc-200 bg-white p-4">
                  <summary className="cursor-pointer text-sm font-semibold">Raw JSON</summary>
                  <pre className="mt-3 overflow-auto rounded-xl bg-zinc-950 p-3 text-xs text-zinc-100 max-h-[420px]">
{data ? JSON.stringify(data, null, 2) : "Loading…"}
                  </pre>
                </details>
              </Card>
      </div>
    </Shell>
  );
}
