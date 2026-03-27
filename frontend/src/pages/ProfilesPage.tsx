import React, { useState } from "react";
import Shell from "../components/layout/Shell";
import { Badge, Button, Card, Input, SectionTitle, Select } from "../components/ui";
import ObjectTable from "../components/pretty/ObjectTable";
import DataTable from "../components/pretty/DataTable";
import { api } from "../api/client";
import type { ProfileSearchRequest } from "../api/types";

const profileTypes = ["", "Guest", "Agent", "Company", "Group", "Source"];

export default function ProfilesPage() {
  const [form, setForm] = useState<ProfileSearchRequest>({ limit: 50 });
  const [results, setResults] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [profile, setProfile] = useState<any>(null);
  const [dupes, setDupes] = useState<any>(null);
  const [err, setErr] = useState<string>("");

  async function search() {
    setErr("");
    setProfile(null);
    setDupes(null);
    try {
      const res = await api.post("/api/profiles/search", form);
      setResults(Array.isArray(res.data) ? res.data : (res.data?.items ?? res.data?.results ?? []));
    } catch (e: any) {
      setErr(e?.response?.data?.error ?? e?.message ?? "Search failed");
    }
  }

  async function loadProfile(id: string) {
    setSelectedId(id);
    setErr("");
    setDupes(null);
    try {
      const res = await api.get(`/api/profiles/${encodeURIComponent(id)}`);
      setProfile(res.data);
    } catch (e: any) {
      setErr(e?.response?.data?.error ?? e?.message ?? "Failed to load profile");
    }
  }

  async function loadDuplicates(id: string) {
    setErr("");
    try {
      const res = await api.get(`/api/profiles/${encodeURIComponent(id)}/duplicates?threshold=0.8`);
      setDupes(res.data);
    } catch (e: any) {
      setErr(e?.response?.data?.error ?? e?.message ?? "Failed to load duplicates");
    }
  }

  return (
    <Shell title="Profiles">
      <SectionTitle title="Search profiles" subtitle="Search in Opera Cloud via OHIP and inspect duplicates." />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-1">
          <div className="grid gap-3">
            <div>
              <div className="text-xs text-zinc-600 mb-1">Profile Type</div>
              <Select value={form.profileType ?? ""} onChange={(e) => setForm({ ...form, profileType: e.target.value || undefined })}>
                {profileTypes.map((t) => <option key={t} value={t}>{t || "Any"}</option>)}
              </Select>
            </div>
            <div>
              <div className="text-xs text-zinc-600 mb-1">Email</div>
              <Input value={form.email ?? ""} onChange={(e) => setForm({ ...form, email: e.target.value || undefined })} />
            </div>
            <div>
              <div className="text-xs text-zinc-600 mb-1">Phone</div>
              <Input value={form.phoneNumber ?? ""} onChange={(e) => setForm({ ...form, phoneNumber: e.target.value || undefined })} />
            </div>
            <div>
              <div className="text-xs text-zinc-600 mb-1">Profile Name</div>
              <Input value={form.profileName ?? ""} onChange={(e) => setForm({ ...form, profileName: e.target.value || undefined })} />
            </div>
            <div>
              <div className="text-xs text-zinc-600 mb-1">Given Name</div>
              <Input value={form.givenName ?? ""} onChange={(e) => setForm({ ...form, givenName: e.target.value || undefined })} />
            </div>
            <div className="flex gap-2">
              <Button onClick={search}>Search</Button>
              <Button variant="secondary" onClick={() => { setForm({ limit: 50 }); setResults([]); setProfile(null); setDupes(null); }}>Reset</Button>
            </div>
            {err ? <div className="text-sm text-red-700">{err}</div> : null}
          </div>
        </Card>

        <Card className="p-5 lg:col-span-2">
          <div className="text-sm font-semibold">Results</div>
          <div className="mt-2 text-sm text-zinc-600">Click a profile to view details, then fetch duplicates.</div>

          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="rounded-xl border border-zinc-200 bg-white overflow-auto max-h-[380px]">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-zinc-50 text-xs text-zinc-600">
                  <tr><th className="p-2">ID</th><th className="p-2">Name</th></tr>
                </thead>
                <tbody>
                  {results.map((r: any, i: number) => {
                    const id = r.profileId ?? r.id ?? r.profileID ?? String(i);
                    const name = r.profileName ?? r.name ?? `${r.givenName ?? ""} ${r.familyName ?? ""}`.trim();
                    return (
                      <tr key={id} className={`cursor-pointer hover:bg-zinc-50 ${selectedId === id ? "bg-zinc-100" : ""}`} onClick={() => loadProfile(String(id))}>
                        <td className="p-2 font-mono text-xs">{String(id)}</td>
                        <td className="p-2">{name || "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="space-y-3">
              <div className="flex gap-2">
                <Button onClick={() => selectedId && loadDuplicates(selectedId)} disabled={!selectedId}>Find duplicates</Button>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Button onClick={() => selectedId && loadDuplicates(selectedId)} disabled={!selectedId}>Find duplicates</Button>
                  {profile?.profileId ? <Badge>Loaded</Badge> : null}
                </div>

                <ObjectTable
                  title="Profile summary"
                  data={profile ? {
                    profileId: profile.profileId ?? profile.id,
                    profileType: profile.profileType,
                    name: profile.customer?.personName?.[0]
                      ? `${profile.customer.personName[0].givenName ?? ""} ${profile.customer.personName[0].surname ?? ""}`.trim()
                      : profile.profileName ?? profile.name,
                    email: profile.customer?.contactInfo?.email?.[0]?.emailAddress,
                    phone: profile.customer?.contactInfo?.phone?.[0]?.phoneNumber,
                    createdAt: profile.createDateTime,
                    updatedAt: profile.updateDateTime
                  } : null}
                />

                <details className="rounded-2xl border border-zinc-200 bg-white p-4">
                  <summary className="cursor-pointer text-sm font-semibold">Raw profile JSON</summary>
                  <pre className="mt-3 overflow-auto rounded-xl bg-zinc-950 p-3 text-xs text-zinc-100 max-h-[320px]">
{profile ? JSON.stringify(profile, null, 2) : "Select a profile…"}
                  </pre>
                </details>
              </div>
            </div>
          </div>

          <div className="mt-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold">Duplicates</div>
                  <div className="text-xs text-zinc-600">{dupes?.totalFound != null ? `Found: ${dupes.totalFound}` : ""}</div>
                </div>

                {Array.isArray(dupes?.duplicates) ? (
                  <div className="mt-2">
                    <DataTable
                      rows={dupes.duplicates.map((d: any) => ({
                        profileId: d.profile?.profileId,
                        name: d.profile?.customer?.personName?.[0]
                          ? `${d.profile.customer.personName[0].givenName ?? ""} ${d.profile.customer.personName[0].surname ?? ""}`.trim()
                          : d.profile?.profileName ?? "",
                        overall: d.similarity?.overall != null ? Number(d.similarity.overall).toFixed(3) : "",
                        action: d.recommendation?.action ?? "",
                        confidence: d.recommendation?.confidence != null ? Number(d.recommendation.confidence).toFixed(3) : "",
                        reason: d.recommendation?.reason ?? ""
                      }))}
                      defaultColumns={["profileId", "name", "overall", "action", "confidence", "reason"]}
                      onRowClick={(r) => r.profileId && loadProfile(String(r.profileId))}
                    />
                    <div className="mt-2 text-xs text-zinc-500">Tip: click a row to load that profile.</div>
                  </div>
                ) : (
                  <div className="mt-2 text-sm text-zinc-600">Run “Find duplicates”…</div>
                )}

                <details className="mt-3 rounded-2xl border border-zinc-200 bg-white p-4">
                  <summary className="cursor-pointer text-sm font-semibold">Raw duplicates JSON</summary>
                  <pre className="mt-3 overflow-auto rounded-xl bg-zinc-950 p-3 text-xs text-zinc-100 max-h-[320px]">
{dupes ? JSON.stringify(dupes, null, 2) : "Run “Find duplicates”…"}
                  </pre>
                </details>
              </div>
        </Card>
      </div>
    </Shell>
  );
}
