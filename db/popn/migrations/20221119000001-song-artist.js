const { DataTypes } = require('sequelize');

/**
 * @typedef {import('sequelize').QueryInterface} QueryInterface
 */

async function up(/** @type {QueryInterface} */ queryInterface) {
  await queryInterface.createTable('SongArtists', {
    songId: {
      type: DataTypes.STRING,
      primaryKey: true,
    },

    artist: DataTypes.STRING,
  });
}

async function down(/** @type {QueryInterface} */ queryInterface) {
  await queryInterface.dropTable('SongArtists');
}

module.exports = { up, down };
