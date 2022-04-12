import { DataTypes } from 'sequelize';
import sequelize from './sequelize';

const SongExtra = sequelize.define('SongExtra', {
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

export default SongExtra;
