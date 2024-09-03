const { DataTypes } = require('sequelize');

/**
 * @typedef {import('sequelize').QueryInterface} QueryInterface
 */

async function up(/** @type {QueryInterface} */ queryInterface) {
  await queryInterface.addColumn('IntlSheets', 'level', DataTypes.STRING);
}

async function down(/** @type {QueryInterface} */ queryInterface) {
  await queryInterface.removeColumn('IntlSheets', 'level');
}

module.exports = { up, down };
