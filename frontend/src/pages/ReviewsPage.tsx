import React, { useEffect, useState } from "react";
import Shell from "../components/layout/Shell";
import { Button, Card, SectionTitle } from "../components/ui";
import { api } from "../api/client";

export default function ReviewsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [err, setErr] = useState("");

  async function load() {
    setErr("");
    try {
      const res = await api.get("/dashboard/api/dashboard/reviews");
      setItems(res.data?.reviews ?? res.data ?? []);
    } catch (e: any) {
      setErr(e?.response?.data?.error ?? e?.message ?? "Failed to load");
    }
  }

  async function action(id: string, kind: "approve" | "reject") {
    setErr("");
    try {
      await api.post(`/dashboard/api/dashboard/reviews/${encodeURIComponent(id)}/${kind}`, {});
      await load();
    } catch (e: any) {
      setErr(e?.response?.data?.error ?? e?.message ?? "Action failed");
    }
  }

  useEffect(() => { load(); }, []);

  return (
    <Shell title="Manual Reviews">
      <SectionTitle title="Pending reviews" subtitle="Approve or reject merges that require manual review." />

      {err ? <div className="mb-3 text-sm text-red-700">{err}</div> : null}

      <Card className="p-5">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold">Reviews</div>
          <Button variant="secondary" onClick={load}>Refresh</Button>
        </div>

        <div className="mt-4 overflow-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-zinc-600 bg-zinc-50">
              <tr>
                <th className="p-2 text-left">ID</th>
                <th className="p-2 text-left">Master</th>
                <th className="p-2 text-left">Duplicate</th>
                <th className="p-2 text-left">Similarity</th>
                <th className="p-2 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((r: any) => (
                <tr key={r.id ?? r.review_id ?? JSON.stringify(r)} className="border-t border-zinc-100">
                  <td className="p-2 font-mono text-xs">{r.id ?? r.review_id ?? "—"}</td>
                  <td className="p-2">{r.master_profile_id ?? r.masterProfileId ?? "—"}</td>
                  <td className="p-2">{r.duplicate_profile_id ?? r.duplicateProfileId ?? "—"}</td>
                  <td className="p-2">{r.similarity_score ?? r.similarityScore ?? "—"}</td>
                  <td className="p-2">
                    <div className="flex gap-2">
                      <Button onClick={() => action(String(r.id ?? r.review_id), "approve")}>Approve</Button>
                      <Button variant="danger" onClick={() => action(String(r.id ?? r.review_id), "reject")}>Reject</Button>
                    </div>
                  </td>
                </tr>
              ))}
              {!items.length ? (
                <tr><td className="p-3 text-zinc-600" colSpan={5}>No pending reviews.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Card>
    </Shell>
  );
}
