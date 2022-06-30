import { DataTypes } from 'sequelize';
import sequelize from './sequelize';

const Sheet = sequelize.define('Sheet', {
  songId: {
    type: DataTypes.STRING,
    primaryKey: true,
  },

  category: DataTypes.STRING,
  title: DataTypes.STRING,

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

export default Sheet;
