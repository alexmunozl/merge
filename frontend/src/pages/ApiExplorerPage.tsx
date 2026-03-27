import React, { useState } from "react";
import Shell from "../components/layout/Shell";
import { Button, Card, Input, SectionTitle, Textarea, Select } from "../components/ui";
import { api } from "../api/client";

export default function ApiExplorerPage() {
  const [method, setMethod] = useState<"GET" | "POST" | "PUT" | "DELETE">("GET");
  const [path, setPath] = useState("/api/system/health");
  const [body, setBody] = useState("{}");
  const [out, setOut] = useState<string>("");

  async function run() {
    setOut("Loading…");
    try {
      const payload = body?.trim() ? JSON.parse(body) : undefined;
      const res = await api.request({ method, url: path, data: method === "GET" ? undefined : payload });
      setOut(JSON.stringify({ status: res.status, data: res.data }, null, 2));
    } catch (e: any) {
      setOut(JSON.stringify({ error: e?.message, status: e?.response?.status, data: e?.response?.data }, null, 2));
    }
  }

  return (
    <Shell title="API Explorer">
      <SectionTitle title="Call endpoints" subtitle="Handy client for testing without Swagger." />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card className="p-5">
          <div className="grid gap-3">
            <div className="flex gap-2">
              <Select value={method} onChange={(e) => setMethod(e.target.value as any)} className="max-w-[140px]">
                <option>GET</option><option>POST</option><option>PUT</option><option>DELETE</option>
              </Select>
              <Input value={path} onChange={(e) => setPath(e.target.value)} placeholder="/api/..." />
            </div>
            <div>
              <div className="mb-2 text-sm font-medium">JSON Body</div>
              <Textarea rows={10} value={body} onChange={(e) => setBody(e.target.value)} />
            </div>
            <Button onClick={run}>Send</Button>
          </div>
        </Card>
        <Card className="p-5">
          <div className="mb-2 text-sm font-medium">Response</div>
          <pre className="overflow-auto rounded-xl bg-zinc-950 p-4 text-xs text-zinc-100 min-h-[360px]">{out}</pre>
        </Card>
      </div>
    </Shell>
  );
}
