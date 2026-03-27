exports.up = function(knex) {
  return knex.schema.createTable('polling_logs', function(table) {
    table.increments('id').primary();
    table.timestamp('poll_timestamp').defaultTo(knex.fn.now());
    table.integer('profiles_found').defaultTo(0);
    table.integer('profiles_processed').defaultTo(0);
    table.integer('duplicates_detected').defaultTo(0);
    table.integer('auto_merges').defaultTo(0);
    table.integer('manual_reviews_queued').defaultTo(0);
    table.integer('errors').defaultTo(0);
    table.text('error_details');
    table.integer('processing_time_ms');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    
    table.index(['poll_timestamp']);
    table.index(['profiles_found']);
    table.index(['auto_merges']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('polling_logs');
};
