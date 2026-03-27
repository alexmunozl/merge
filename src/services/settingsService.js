const EventEmitter = require('events');
const SystemSetting = require('../models/SystemSetting');
const logger = require('../utils/logger');

class SettingsService extends EventEmitter {
  constructor() {
    super();
    this.cache = new Map();
    this.meta = new Map();
    this.ready = false;
    this.refreshInFlight = null;
  }

  async init() {
    await this.refresh();
    this.ready = true;
  }

  async refresh() {
    if (this.refreshInFlight) return this.refreshInFlight;
    this.refreshInFlight = (async () => {
      try {
        const rows = await SystemSetting.getAll();
        const next = new Map();
        const meta = new Map();
        for (const r of rows) {
          next.set(r.key, r.value);
          meta.set(r.key, {
            description: r.description ?? '',
            type: r.type ?? 'string',
            is_encrypted: !!r.is_encrypted
          });
        }
        const prev = this.cache;
        this.cache = next;
        this.meta = meta;

        // Emit changes
        for (const [k, v] of next.entries()) {
          if (prev.get(k) !== v) this.emit('changed', { key: k, value: v });
        }
      } catch (e) {
        logger.warn(`SettingsService.refresh failed: ${e.message}`);
      } finally {
        this.refreshInFlight = null;
      }
    })();
    return this.refreshInFlight;
  }

  list() {
    const out = [];
    for (const [key, value] of this.cache.entries()) {
      const m = this.meta.get(key) ?? {};
      out.push({ key, value, ...m });
    }
    return out.sort((a, b) => a.key.localeCompare(b.key));
  }

  getString(key, fallback = '') {
    const v = this.cache.get(key);
    return v == null ? fallback : String(v);
  }

  getNumber(key, fallback = 0) {
    const v = this.cache.get(key);
    const n = v == null ? NaN : Number(v);
    return Number.isFinite(n) ? n : fallback;
  }

  getBoolean(key, fallback = false) {
    const v = this.cache.get(key);
    if (v == null) return fallback;
    const s = String(v).toLowerCase().trim();
    if (['1', 'true', 'yes', 'y', 'on'].includes(s)) return true;
    if (['0', 'false', 'no', 'n', 'off'].includes(s)) return false;
    return fallback;
  }

  async updateMany(pairs) {
    await SystemSetting.upsertMany(pairs);
    await this.refresh();
    for (const p of pairs) this.emit('updated', { key: p.key, value: p.value });
  }
}

module.exports = new SettingsService();
