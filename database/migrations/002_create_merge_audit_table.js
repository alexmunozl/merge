exports.up = function(knex) {
  return knex.schema.createTable('merge_audit', function(table) {
    table.increments('id').primary();
    table.string('survivor_profile_id').notNullable();
    table.string('victim_profile_id').notNullable();
    table.decimal('similarity_score', 5, 4);
    table.json('similarity_details');
    table.json('merge_analysis');
    table.string('merge_decision').notNullable();
    table.string('merge_status').defaultTo('PENDING');
    table.string('executed_by');
    table.text('notes');
    table.timestamp('merge_timestamp');
    table.json('merge_result');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    table.index(['survivor_profile_id']);
    table.index(['victim_profile_id']);
    table.index(['merge_status']);
    table.index(['merge_timestamp']);
    table.index(['executed_by']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('merge_audit');
};
