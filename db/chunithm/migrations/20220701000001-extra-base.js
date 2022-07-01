const { DataTypes } = require('sequelize');

/**
 * @typedef {import('sequelize').QueryInterface} QueryInterface
 */

async function up(/** @type {QueryInterface} */ queryInterface) {
  await queryInterface.createTable('SongOrders', {
    songId: {
      type: DataTypes.STRING,
      primaryKey: true,
    },

    sortOrder: DataTypes.INTEGER,
  });
  await queryInterface.createTable('JpSheets', {
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
  });
  await queryInterface.createTable('IntlSheets', {
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
  });
}

async function down(/** @type {QueryInterface} */ queryInterface) {
  await queryInterface.dropTable('SongOrders');
  await queryInterface.dropTable('JpSheets');
  await queryInterface.dropTable('IntlSheets');
}

module.exports = { up, down };
