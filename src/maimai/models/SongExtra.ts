import { DataTypes } from 'sequelize';
import sequelize from './sequelize';

export default sequelize.define('SongExtra', {
  category: {
    type: DataTypes.STRING,
    primaryKey: true,
  },
  title: {
    type: DataTypes.STRING,
    primaryKey: true,
  },

  bpm: DataTypes.REAL,
});
