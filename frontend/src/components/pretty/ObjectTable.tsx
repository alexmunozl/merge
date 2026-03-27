import React from "react";
import { Card } from "../ui";

type Props = {
  title?: string;
  data: Record<string, any> | null | undefined;
  maxDepth?: number;
  className?: string;
};

function isPlainObject(v: any) {
  return v && typeof v === "object" && !Array.isArray(v);
}

function renderValue(v: any, depth: number, maxDepth: number): React.ReactNode {
  if (v == null) return <span className="text-zinc-500">—</span>;
  if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") return <span>{String(v)}</span>;
  if (Array.isArray(v)) return <span className="text-zinc-700">{`Array(${v.length})`}</span>;
  if (isPlainObject(v)) return <span className="text-zinc-700">{`Object`}</span>;
  return <span>{String(v)}</span>;
}

function flatten(obj: Record<string, any>, maxDepth: number, prefix = "", depth = 0, out: Array<{ k: string; v: any }> = []) {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (depth < maxDepth && isPlainObject(v)) flatten(v, maxDepth, key, depth + 1, out);
    else out.push({ k: key, v });
  }
  return out;
}

export default function ObjectTable({ title, data, maxDepth = 2, className }: Props) {
  const rows = data && typeof data === "object" ? flatten(data as any, maxDepth) : [];
  return (
    <Card className={`p-5 ${className ?? ""}`}>
      {title ? <div className="text-sm font-semibold mb-3">{title}</div> : null}
      {!data ? (
        <div className="text-sm text-zinc-600">No data.</div>
      ) : (
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-zinc-600">
              <tr>
                <th className="text-left p-2">Field</th>
                <th className="text-left p-2">Value</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.k} className="border-t border-zinc-100">
                  <td className="p-2 font-mono text-xs text-zinc-700 whitespace-nowrap">{r.k}</td>
                  <td className="p-2">{renderValue(r.v, 0, maxDepth)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
