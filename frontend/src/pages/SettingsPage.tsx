import React, { useEffect, useMemo, useState } from "react";
  import Shell from "../components/layout/Shell";
  import { Badge, Button, Card, Input, SectionTitle, Select } from "../components/ui";
  import { api, setAdminToken } from "../api/client";
  import type { EnvGetResponse, EnvPutResponse, SettingsGetResponse, SettingsPutResponse, RuntimeSetting } from "../api/types";

  type EnvRow = { key: string; value: string; editable: boolean; masked?: boolean };

  function normalizeSettingValue(type: string | undefined, value: string) {
    const t = (type ?? "string").toLowerCase();
    if (t === "boolean") return value.toLowerCase() === "true" || value === "1" ? "true" : "false";
    return value ?? "";
  }

  export default function SettingsPage() {
    const [tab, setTab] = useState<"runtime" | "env">("runtime");

    const [adminToken, setToken] = useState(() => localStorage.getItem("adminToken") ?? "");
    const [loading, setLoading] = useState(false);
    const [msg, setMsg] = useState("");

    const [envData, setEnvData] = useState<EnvGetResponse | null>(null);
    const [envRows, setEnvRows] = useState<EnvRow[]>([]);

    const [settingsData, setSettingsData] = useState<SettingsGetResponse | null>(null);
    const [settingsRows, setSettingsRows] = useState<RuntimeSetting[]>([]);

    useEffect(() => {
      setAdminToken(adminToken);
      localStorage.setItem("adminToken", adminToken);
    }, [adminToken]);

    const canEdit = useMemo(() => !!adminToken, [adminToken]);

    async function loadEnv() {
      const res = await api.get<EnvGetResponse>("/api/config/env");
      setEnvData(res.data);
      setEnvRows(res.data.vars);
    }

    async function loadSettings() {
      const res = await api.get<SettingsGetResponse>("/api/config/settings");
      setSettingsData(res.data);
      setSettingsRows(res.data.settings);
    }

    async function loadAll() {
      setMsg("");
      setLoading(true);
      try {
        await Promise.all([loadEnv(), loadSettings()]);
      } catch (e: any) {
        setMsg(e?.response?.data?.error ?? e?.message ?? "Failed to load");
      } finally {
        setLoading(false);
      }
    }

    useEffect(() => {
      loadAll();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    function updateEnvRow(i: number, patch: Partial<EnvRow>) {
      setEnvRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
    }

    function updateSettingRow(i: number, patch: Partial<RuntimeSetting>) {
      setSettingsRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
    }

    async function saveEnv() {
      setMsg("");
      setLoading(true);
      try {
        const payload = envRows
          .filter((r) => r.editable)
          .filter((r) => r.key.trim().length > 0)
          .map((r) => ({ key: r.key.trim(), value: r.value ?? "" }));
        const res = await api.put<EnvPutResponse>("/api/config/env", { vars: payload });
        setMsg(`Saved env: ${res.data.updated.join(", ") || "none"}${res.data.restartRequired ? " (restart required)" : ""}`);
        await loadEnv();
      } catch (e: any) {
        setMsg(e?.response?.data?.error ?? e?.message ?? "Save failed");
      } finally {
        setLoading(false);
      }
    }

    async function restart() {
      setMsg("");
      setLoading(true);
      try {
        await api.post("/api/system/restart");
        setMsg("Restart requested. If Docker has a restart policy, it should come back automatically.");
      } catch (e: any) {
        setMsg(e?.response?.data?.error ?? e?.message ?? "Restart failed");
      } finally {
        setLoading(false);
      }
    }

    async function saveSettings() {
      setMsg("");
      setLoading(true);
      try {
        const payload = settingsRows
          .filter((r) => r.editable)
          .filter((r) => r.key.trim().length > 0)
          .map((r) => ({ key: r.key.trim(), value: normalizeSettingValue(r.type, r.value ?? "") }));
        const res = await api.put<SettingsPutResponse>("/api/config/settings", { settings: payload });
        setMsg(`Saved runtime settings: ${res.data.updated.join(", ") || "none"} (applies live)`);
        await loadSettings();
      } catch (e: any) {
        setMsg(e?.response?.data?.error ?? e?.message ?? "Save failed");
      } finally {
        setLoading(false);
      }
    }

    return (
      <Shell title="Settings">
        <SectionTitle title="Admin & Configuration" subtitle="Runtime settings apply immediately. Container env needs restart." />

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card className="p-5 lg:col-span-1">
            <div className="text-sm font-semibold">Admin token</div>
            <div className="mt-2 text-sm text-zinc-600">
              Set <code className="rounded bg-zinc-100 px-1 py-0.5">ADMIN_TOKEN</code> on the server and enter it here to edit settings.
            </div>

            <div className="mt-4">
              <Input value={adminToken} onChange={(e) => setToken(e.target.value)} placeholder="Paste admin token…" type="password" />
            </div>

            <div className="mt-3 flex items-center gap-2">
              <Badge>{canEdit ? "token set" : "read-only"}</Badge>
              <Button variant="secondary" onClick={loadAll} disabled={loading}>
                Refresh
              </Button>
            </div>

            {msg ? <div className="mt-3 text-sm text-zinc-700">{msg}</div> : null}

            <div className="mt-6">
              <div className="text-sm font-semibold mb-2">Sections</div>
              <div className="flex gap-2">
                <Button variant={tab === "runtime" ? "primary" : "secondary"} onClick={() => setTab("runtime")}>Runtime</Button>
                <Button variant={tab === "env" ? "primary" : "secondary"} onClick={() => setTab("env")}>Container Env</Button>
              </div>
            </div>
          </Card>

          {tab === "runtime" ? (
            <Card className="p-5 lg:col-span-2">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold">Runtime settings (DB)</div>
                  <div className="mt-1 text-sm text-zinc-600">
                    Stored in <code className="rounded bg-zinc-100 px-1 py-0.5">system_settings</code>. Applies live (no restart).
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button onClick={saveSettings} disabled={!canEdit || loading}>Save</Button>
                </div>
              </div>

              <div className="mt-4 overflow-auto">
                <table className="w-full min-w-[860px] border-separate border-spacing-y-2">
                  <thead>
                    <tr className="text-left text-xs text-zinc-500">
                      <th className="px-3">Key</th>
                      <th className="px-3">Value</th>
                      <th className="px-3">Type</th>
                      <th className="px-3">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {settingsRows.map((r, i) => {
                      const type = (r.type ?? "string").toLowerCase();
                      const isBool = type === "boolean";
                      const isNum = type === "integer" || type === "decimal" || type === "number";
                      const disabled = !canEdit || loading || r.masked;

                      return (
                        <tr key={`${r.key}-${i}`} className="rounded-xl bg-zinc-50">
                          <td className="px-3 py-2 align-top">
                            <Input value={r.key} disabled placeholder="key" />
                          </td>
                          <td className="px-3 py-2 align-top">
                            {r.masked ? (
                              <Input value={"••••••••"} disabled type="password" />
                            ) : isBool ? (
                              <Select
                                value={normalizeSettingValue(type, r.value ?? "")}
                                onChange={(e) => updateSettingRow(i, { value: e.target.value })}
                                disabled={disabled}
                              >
                                <option value="true">true</option>
                                <option value="false">false</option>
                              </Select>
                            ) : (
                              <Input
                                value={r.value ?? ""}
                                onChange={(e) => updateSettingRow(i, { value: e.target.value })}
                                disabled={disabled}
                                type={isNum ? "number" : "text"}
                                placeholder="value"
                              />
                            )}
                          </td>
                          <td className="px-3 py-2 align-top text-sm text-zinc-700">{r.type ?? "string"}</td>
                          <td className="px-3 py-2 align-top text-sm text-zinc-700">{r.description ?? ""}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <details className="mt-4 rounded-2xl border border-zinc-200 bg-white p-4">
                <summary className="cursor-pointer text-sm font-semibold">Raw runtime settings JSON</summary>
                <pre className="mt-3 overflow-auto rounded-xl bg-zinc-950 p-3 text-xs text-zinc-100 max-h-[420px]">
{settingsData ? JSON.stringify(settingsData, null, 2) : "Loading…"}
                </pre>
              </details>
            </Card>
          ) : (
            <Card className="p-5 lg:col-span-2">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold">Container environment (.env)</div>
                  <div className="mt-1 text-sm text-zinc-600">
                    Writes to the container’s <code className="rounded bg-zinc-100 px-1 py-0.5">.env</code>. Requires restart to take effect.
                  </div>
                  <div className="mt-2 text-xs text-zinc-500">
                    Allowlist: {envData?.allowlist?.length ? envData.allowlist.join(", ") : "—"}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button onClick={saveEnv} disabled={!canEdit || loading}>Save</Button>
                  <Button variant="danger" onClick={restart} disabled={!canEdit || loading}>Restart</Button>
                </div>
              </div>

              <div className="mt-4 overflow-auto">
                <table className="w-full min-w-[760px] border-separate border-spacing-y-2">
                  <thead>
                    <tr className="text-left text-xs text-zinc-500">
                      <th className="px-3">Key</th>
                      <th className="px-3">Value</th>
                      <th className="px-3">Editable</th>
                    </tr>
                  </thead>
                  <tbody>
                    {envRows.map((r, i) => (
                      <tr key={`${r.key}-${i}`} className="rounded-xl bg-zinc-50">
                        <td className="px-3 py-2 align-top">
                          <Input value={r.key} disabled={!r.editable || !canEdit || loading} onChange={(e) => updateEnvRow(i, { key: e.target.value })} />
                        </td>
                        <td className="px-3 py-2 align-top">
                          <Input
                            value={r.masked ? "••••••••" : r.value}
                            disabled={!r.editable || !canEdit || loading || r.masked}
                            onChange={(e) => updateEnvRow(i, { value: e.target.value })}
                            type={r.masked ? "password" : "text"}
                          />
                          {r.masked ? <div className="mt-1 text-xs text-zinc-500">Masked server-side.</div> : null}
                        </td>
                        <td className="px-3 py-2 align-top text-sm text-zinc-700">{r.editable ? "Yes" : "No"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <details className="mt-4 rounded-2xl border border-zinc-200 bg-white p-4">
                <summary className="cursor-pointer text-sm font-semibold">Raw env JSON</summary>
                <pre className="mt-3 overflow-auto rounded-xl bg-zinc-950 p-3 text-xs text-zinc-100 max-h-[420px]">
{envData ? JSON.stringify(envData, null, 2) : "Loading…"}
                </pre>
              </details>
            </Card>
          )}
        </div>
      </Shell>
    );
  }
