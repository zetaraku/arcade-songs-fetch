const { DataTypes } = require('sequelize');

/**
 * @typedef {import('sequelize').QueryInterface} QueryInterface
 */

async function up(/** @type {QueryInterface} */ queryInterface) {
  await queryInterface.createTable('Songs', {
    songId: {
      type: DataTypes.STRING,
      primaryKey: true,
    },

    category: DataTypes.STRING,
    title: DataTypes.STRING,
    artist: DataTypes.STRING,

    imageName: DataTypes.STRING,
    imageUrl: DataTypes.STRING,

    version: DataTypes.STRING,
    releaseDate: DataTypes.DATEONLY,

    isNew: DataTypes.BOOLEAN,
    isLocked: DataTypes.BOOLEAN,
  });
  await queryInterface.createTable('Sheets', {
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

    level: DataTypes.STRING,
  });
}

async function down(/** @type {QueryInterface} */ queryInterface) {
  await queryInterface.dropTable('Songs');
  await queryInterface.dropTable('Sheets');
}

module.exports = { up, down };
