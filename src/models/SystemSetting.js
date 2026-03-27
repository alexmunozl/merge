const db = require('../config/database');

class SystemSetting {
  static async getAll() {
    return db('system_settings').select('*').orderBy('key', 'asc');
  }

  static async getByKey(key) {
    return db('system_settings').where({ key }).first();
  }

  static async upsertMany(pairs) {
    const now = new Date();
    // Postgres upsert
    return db('system_settings')
      .insert(pairs.map(p => ({
        key: p.key,
        value: p.value,
        description: p.description ?? null,
        type: p.type ?? 'string',
        is_encrypted: !!p.is_encrypted,
        updated_at: now
      })))
      .onConflict('key')
      .merge({
        value: db.raw('EXCLUDED.value'),
        description: db.raw('COALESCE(EXCLUDED.description, system_settings.description)'),
        type: db.raw('COALESCE(EXCLUDED.type, system_settings.type)'),
        is_encrypted: db.raw('COALESCE(EXCLUDED.is_encrypted, system_settings.is_encrypted)'),
        updated_at: now
      });
  }

  static async updateValue(key, value) {
    return db('system_settings')
      .where({ key })
      .update({ value, updated_at: db.fn.now() });
  }
}

module.exports = SystemSetting;
