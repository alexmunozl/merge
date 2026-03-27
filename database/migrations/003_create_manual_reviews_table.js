exports.up = function(knex) {
  return knex.schema.createTable('manual_reviews', function(table) {
    table.increments('id').primary();
    table.string('profile_id').notNullable();
    table.json('new_profile_data');
    table.json('candidate_profiles');
    table.json('merge_analysis');
    table.string('status').defaultTo('PENDING_REVIEW');
    table.string('reviewed_by');
    table.text('review_notes');
    table.string('decision');
    table.timestamp('reviewed_at');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    table.index(['profile_id']);
    table.index(['status']);
    table.index(['created_at']);
    table.index(['reviewed_by']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('manual_reviews');
};
