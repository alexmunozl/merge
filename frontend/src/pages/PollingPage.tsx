import React, { useEffect, useState } from "react";
import Shell from "../components/layout/Shell";
import { Button, Card, SectionTitle } from "../components/ui";
import { api } from "../api/client";

export default function PollingPage() {
  const [status, setStatus] = useState<any>(null);
  const [err, setErr] = useState("");

  async function load() {
    setErr("");
    try {
      const res = await api.get("/api/polling/status");
      setStatus(res.data);
    } catch (e: any) {
      setErr(e?.response?.data?.error ?? e?.message ?? "Failed");
    }
  }

  async function act(path: string) {
    setErr("");
    try {
      await api.post(path, {});
      await load();
    } catch (e: any) {
      setErr(e?.response?.data?.error ?? e?.message ?? "Failed");
    }
  }

  useEffect(() => { load(); }, []);

  return (
    <Shell title="Polling">
      <SectionTitle title="Polling control" subtitle="Start/stop/manual run of polling service." />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="p-5 md:col-span-1">
          <div className="text-sm font-semibold">Actions</div>
          <div className="mt-3 flex flex-col gap-2">
            <Button onClick={() => act("/api/polling/start")}>Start</Button>
            <Button variant="secondary" onClick={() => act("/api/polling/stop")}>Stop</Button>
            <Button variant="secondary" onClick={() => act("/api/polling/manual")}>Run once</Button>
            <Button variant="secondary" onClick={load}>Refresh</Button>
          </div>
          {err ? <div className="mt-3 text-sm text-red-700">{err}</div> : null}
        </Card>

        <Card className="p-5 md:col-span-2">
          <div className="text-sm font-semibold">Status</div>
          <pre className="mt-3 overflow-auto rounded-xl bg-zinc-950 p-4 text-xs text-zinc-100 max-h-[520px]">
            {status ? JSON.stringify(status, null, 2) : "Loading…"}
          </pre>
        </Card>
      </div>
    </Shell>
  );
}
