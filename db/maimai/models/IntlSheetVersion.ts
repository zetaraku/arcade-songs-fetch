import { DataTypes } from 'sequelize';
import sequelize from './sequelize';

const IntlSheetVersion = sequelize.define('IntlSheetVersion', {
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

export default IntlSheetVersion;
