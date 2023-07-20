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

  'noteCounts.tap': DataTypes.INTEGER,
  'noteCounts.hold': DataTypes.INTEGER,
  'noteCounts.slide': DataTypes.INTEGER,
  'noteCounts.air': DataTypes.INTEGER,
  'noteCounts.flick': DataTypes.INTEGER,
  'noteCounts.total': DataTypes.INTEGER,

  noteDesigner: DataTypes.STRING,
});

export default SheetExtra;
