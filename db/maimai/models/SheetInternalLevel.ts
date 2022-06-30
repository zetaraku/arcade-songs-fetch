import { DataTypes } from 'sequelize';
import sequelize from './sequelize';

const SheetInternalLevel = sequelize.define('SheetInternalLevel', {
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

export default SheetInternalLevel;
