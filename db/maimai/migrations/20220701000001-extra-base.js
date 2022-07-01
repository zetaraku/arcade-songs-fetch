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
  await queryInterface.createTable('SheetVersions', {
    songId: {
      type: DataTypes.STRING,
      primaryKey: true,
    },
    type: {
      type: DataTypes.STRING,
      primaryKey: true,
    },

    version: DataTypes.STRING,
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
  await queryInterface.createTable('CnSheets', {
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
  await queryInterface.createTable('SongExtras', {
    songId: {
      type: DataTypes.STRING,
      primaryKey: true,
    },

    bpm: DataTypes.REAL,
  });
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
    'noteCounts.touch': DataTypes.INTEGER,
    'noteCounts.break': DataTypes.INTEGER,
    'noteCounts.total': DataTypes.INTEGER,

    noteDesigner: DataTypes.STRING,
  });
  await queryInterface.createTable('SheetInternalLevels', {
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

    internalLevel: DataTypes.STRING,
  });
}

async function down(/** @type {QueryInterface} */ queryInterface) {
  await queryInterface.dropTable('SongOrders');
  await queryInterface.dropTable('SheetVersions');
  await queryInterface.dropTable('JpSheets');
  await queryInterface.dropTable('IntlSheets');
  await queryInterface.dropTable('CnSheets');
  await queryInterface.dropTable('SongExtras');
  await queryInterface.dropTable('SheetExtras');
  await queryInterface.dropTable('SheetInternalLevels');
}

module.exports = { up, down };
