import { DataTypes } from 'sequelize';
import sequelize from './sequelize';

const SheetVersion = sequelize.define('SheetVersion', {
  category: {
    type: DataTypes.STRING,
    primaryKey: true,
  },
  title: {
    type: DataTypes.STRING,
    primaryKey: true,
  },
  type: {
    type: DataTypes.STRING,
    primaryKey: true,
  },

  version: DataTypes.STRING,
});

export default SheetVersion;
