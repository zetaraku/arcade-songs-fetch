const { DataTypes } = require('sequelize');

/**
 * @typedef {import('sequelize').QueryInterface} QueryInterface
 */

async function up(/** @type {QueryInterface} */ queryInterface) {
  await queryInterface.addColumn('Songs', 'comment', DataTypes.TEXT);
}

async function down(/** @type {QueryInterface} */ queryInterface) {
  await queryInterface.removeColumn('Songs', 'comment');
}

module.exports = { up, down };
