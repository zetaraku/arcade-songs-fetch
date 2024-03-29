const { DataTypes } = require('sequelize');

/**
 * @typedef {import('sequelize').QueryInterface} QueryInterface
 */

async function up(/** @type {QueryInterface} */ queryInterface) {
  await queryInterface.createTable('SongBpms', {
    songId: {
      type: DataTypes.STRING,
      primaryKey: true,
    },

    bpm: DataTypes.REAL,
  });
}

async function down(/** @type {QueryInterface} */ queryInterface) {
  await queryInterface.dropTable('SongBpms');
}

module.exports = { up, down };
