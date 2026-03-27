const knex = require('knex');
const config = require('./index');

const environment = process.env.NODE_ENV || 'development';
const dbConfig = config.database[environment];

const db = knex(dbConfig);

module.exports = db;
