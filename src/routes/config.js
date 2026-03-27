const fs = require('fs');
const path = require('path');
const settingsService = require('../services/settingsService');

function requireAdmin(req, res, next) {
  const token = req.header('X-Admin-Token') || '';
  const expected = process.env.ADMIN_TOKEN || '';
  if (!expected) return res.status(403).json({ error: 'ADMIN_TOKEN not set on server; env editing disabled.' });
  if (!token || token !== expected) return res.status(401).json({ error: 'Unauthorized (missing/invalid admin token).' });
  next();
}

function getAllowlist() {
  const raw = process.env.ENV_EDIT_ALLOWLIST || '';
  return raw.split(',').map(s => s.trim()).filter(Boolean);
}

function parseDotEnv(contents) {
  const out = new Map();
  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx < 0) continue;
    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    out.set(key, value);
  }
  return out;
}

function serializeDotEnv(map, originalContents) {
  const lines = originalContents.split(/\r?\n/);
  const seen = new Set();
  const updatedLines = lines.map((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return line;
    const idx = trimmed.indexOf('=');
    if (idx < 0) return line;
    const key = trimmed.slice(0, idx).trim();
    if (!map.has(key)) return line;
    seen.add(key);
    const val = map.get(key) ?? '';
    const safe = /[\s"#'=]/.test(val) ? JSON.stringify(val) : val;
    return `${key}=${safe}`;
  });

  for (const [k, v] of map.entries()) {
    if (seen.has(k)) continue;
    const safe = /[\s"#'=]/.test(v) ? JSON.stringify(v) : v;
    updatedLines.push(`${k}=${safe}`);
  }
  return updatedLines.join('\n').replace(/\n{3,}/g, '\n\n');
}

module.exports = function mountConfigRoutes(app) {
  const envFilePath = process.env.ENV_FILE_PATH
    ? path.resolve(process.env.ENV_FILE_PATH)
    : path.resolve(process.cwd(), '.env');

  app.get('/api/config/env', (req, res) => {
    const allowlist = getAllowlist();
    const masked = new Set((process.env.ENV_EDIT_MASKED || '').split(',').map(s => s.trim()).filter(Boolean));

    let contents = '';
    try { contents = fs.existsSync(envFilePath) ? fs.readFileSync(envFilePath, 'utf8') : ''; } catch { contents = ''; }
    const parsed = parseDotEnv(contents);

    const vars = allowlist.map((key) => {
      const value = masked.has(key) ? '' : (parsed.get(key) ?? process.env[key] ?? '');
      return { key, value, editable: true, masked: masked.has(key) };
    });

    res.json({ allowlist, vars, restartRequired: true });
  });

  app.put('/api/config/env', requireAdmin, (req, res) => {
    const allowlist = new Set(getAllowlist());
    const vars = Array.isArray(req.body?.vars) ? req.body.vars : [];
    const invalid = vars.find((v) => !v?.key || typeof v.key !== 'string' || !allowlist.has(v.key));
    if (invalid) return res.status(400).json({ error: 'One or more keys are not in the allowlist.' });

    let contents = '';
    try { contents = fs.existsSync(envFilePath) ? fs.readFileSync(envFilePath, 'utf8') : ''; } catch { contents = ''; }

    const parsed = parseDotEnv(contents);
    const updated = [];

    for (const v of vars) {
      const key = String(v.key).trim();
      const value = v.value == null ? '' : String(v.value);
      parsed.set(key, value);
      updated.push(key);
    }

    const nextContents = serializeDotEnv(parsed, contents);
    fs.writeFileSync(envFilePath, nextContents, 'utf8');

    res.json({ updated, restartRequired: true });
  });

  // Runtime settings (stored in DB) — applied without restart
app.get('/api/config/settings', async (_req, res) => {
  try {
    await settingsService.refresh();
    const rows = settingsService.list().map(r => ({
      key: r.key,
      value: r.is_encrypted ? '' : r.value,
      description: r.description,
      type: r.type,
      editable: true,
      masked: r.is_encrypted
    }));
    res.json({ settings: rows, liveApply: true });
  } catch (e) {
    res.status(500).json({ error: 'Failed to load settings', message: e.message });
  }
});

app.put('/api/config/settings', requireAdmin, async (req, res) => {
  try {
    const updates = Array.isArray(req.body?.settings) ? req.body.settings : [];
    const allowlist = new Set((process.env.SETTINGS_EDIT_ALLOWLIST || '').split(',').map(s => s.trim()).filter(Boolean));

    const invalid = updates.find(u => !u?.key || typeof u.key !== 'string' || (allowlist.size && !allowlist.has(u.key)));
    if (invalid) return res.status(400).json({ error: 'One or more keys are not allowed.' });

    const pairs = updates.map(u => ({
      key: String(u.key).trim(),
      value: u.value == null ? '' : String(u.value),
      description: u.description,
      type: u.type,
      is_encrypted: !!u.is_encrypted
    }));

    await settingsService.updateMany(pairs);
    res.json({ updated: pairs.map(p => p.key), liveApply: true });
  } catch (e) {
    res.status(500).json({ error: 'Failed to update settings', message: e.message });
  }
});

app.post('/api/system/restart', requireAdmin, (_req, res) => {
    res.json({ ok: true, message: 'Restarting process…' });
    setTimeout(() => process.exit(0), 250);
  });
};
