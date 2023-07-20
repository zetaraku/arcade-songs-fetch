const { DataTypes } = require('sequelize');

/**
 * @typedef {import('sequelize').QueryInterface} QueryInterface
 */

async function up(/** @type {QueryInterface} */ queryInterface) {
  await queryInterface.createTable('SheetExtras', {
    songId: {
      type: DataTypes.STRING,
      primaryKey: true,
    },
    type: {
      type: DataTypes.STRING,
      primaryKey: true,
    },
    difficulty: {
      type: DataTypes.STRING,
      primaryKey: true,
    },

    'noteCounts.tap': DataTypes.INTEGER,
    'noteCounts.hold': DataTypes.INTEGER,
    'noteCounts.slide': DataTypes.INTEGER,
    'noteCounts.air': DataTypes.INTEGER,
    'noteCounts.flick': DataTypes.INTEGER,
    'noteCounts.total': DataTypes.INTEGER,

    noteDesigner: DataTypes.STRING,
  });
}

async function down(/** @type {QueryInterface} */ queryInterface) {
  await queryInterface.dropTable('SheetExtras');
}

module.exports = { up, down };
