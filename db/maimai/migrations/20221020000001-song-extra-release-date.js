const { DataTypes } = require('sequelize');

/**
 * @typedef {import('sequelize').QueryInterface} QueryInterface
 */

async function up(/** @type {QueryInterface} */ queryInterface) {
  await queryInterface.addColumn('SongExtras', 'releaseDate', DataTypes.DATEONLY);
}

async function down(/** @type {QueryInterface} */ queryInterface) {
  await queryInterface.removeColumn('SongExtras', 'releaseDate');
}

module.exports = { up, down };
