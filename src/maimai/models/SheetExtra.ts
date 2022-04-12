import { DataTypes } from 'sequelize';
import sequelize from './sequelize';

const SheetExtra = sequelize.define('SheetExtra', {
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
  difficulty: {
    type: DataTypes.STRING,
    primaryKey: true,
  },

  tapCount: DataTypes.INTEGER,
  holdCount: DataTypes.INTEGER,
  slideCount: DataTypes.INTEGER,
  touchCount: DataTypes.INTEGER,
  breakCount: DataTypes.INTEGER,
  totalCount: DataTypes.INTEGER,

  noteDesigner: DataTypes.STRING,
});

export default SheetExtra;
