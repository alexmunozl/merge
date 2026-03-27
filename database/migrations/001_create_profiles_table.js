exports.up = function(knex) {
  return knex.schema.createTable('profiles', function(table) {
    table.string('profile_id').primary();
    table.string('profile_type').notNullable();
    table.string('status_code').defaultTo('Active');
    table.timestamp('create_date_time');
    table.timestamp('update_date_time');
    table.json('profile_data');
    table.json('keywords');
    table.boolean('has_master_keyword').defaultTo(false);
    table.timestamp('last_synced_at');
    table.timestamps(true, true);
    
    table.index(['profile_type']);
    table.index(['status_code']);
    table.index(['create_date_time']);
    table.index(['has_master_keyword']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('profiles');
};
