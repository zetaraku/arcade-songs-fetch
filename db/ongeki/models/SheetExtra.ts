import { DataTypes } from 'sequelize';
import sequelize from './sequelize';

const SheetExtra = sequelize.define('SheetExtra', {
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

  'noteCounts.bell': DataTypes.INTEGER,
  'noteCounts.total': DataTypes.INTEGER,

  noteDesigner: DataTypes.STRING,
});

export default SheetExtra;
