const { DataTypes } = require('sequelize');

/**
 * @typedef {import('sequelize').QueryInterface} QueryInterface
 */

async function up(/** @type {QueryInterface} */ queryInterface) {
  await queryInterface.createTable('SongExtras', {
    songId: {
      type: DataTypes.STRING,
      primaryKey: true,
    },

    releaseDate: DataTypes.DATEONLY,

    bpm: DataTypes.REAL,
  });
}

async function down(/** @type {QueryInterface} */ queryInterface) {
  await queryInterface.dropTable('SongExtras');
}

module.exports = { up, down };
