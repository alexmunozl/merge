exports.up = function(knex) {
  return knex.schema.createTable('system_settings', function(table) {
    table.string('key').primary();
    table.text('value');
    table.text('description');
    table.string('type').defaultTo('string');
    table.boolean('is_encrypted').defaultTo(false);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    table.index(['type']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('system_settings');
};
