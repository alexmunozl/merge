import React, { useMemo, useState } from "react";
import { Input } from "../ui";

type Props = {
  rows: any[];
  title?: string;
  onRowClick?: (row: any) => void;
  defaultColumns?: string[];
  className?: string;
};

function pickColumns(rows: any[], defaultColumns?: string[]) {
  if (defaultColumns?.length) return defaultColumns;
  const cols = new Set<string>();
  for (const r of rows.slice(0, 50)) {
    if (r && typeof r === "object") Object.keys(r).forEach((k) => cols.add(k));
  }
  return Array.from(cols).slice(0, 10);
}

export default function DataTable({ rows, title, onRowClick, defaultColumns, className }: Props) {
  const [q, setQ] = useState("");
  const columns = useMemo(() => pickColumns(rows, defaultColumns), [rows, defaultColumns]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return rows;
    return rows.filter((r) => JSON.stringify(r).toLowerCase().includes(query));
  }, [rows, q]);

  return (
    <div className={className}>
      <div className="flex items-center justify-between gap-2 mb-2">
        {title ? <div className="text-sm font-semibold">{title}</div> : <div />}
        <div className="w-64">
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" />
        </div>
      </div>
      <div className="rounded-xl border border-zinc-200 bg-white overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-zinc-50 text-xs text-zinc-600">
            <tr>
              {columns.map((c) => (
                <th key={c} className="text-left p-2 whitespace-nowrap">{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((r, i) => (
              <tr
                key={i}
                className={`border-t border-zinc-100 ${onRowClick ? "cursor-pointer hover:bg-zinc-50" : ""}`}
                onClick={() => onRowClick?.(r)}
              >
                {columns.map((c) => (
                  <td key={c} className="p-2 align-top">
                    {r?.[c] == null ? <span className="text-zinc-500">—</span> : String(r[c])}
                  </td>
                ))}
              </tr>
            ))}
            {!filtered.length ? (
              <tr><td className="p-4 text-sm text-zinc-600" colSpan={columns.length}>No results.</td></tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
