import { DataTypes } from 'sequelize';
import sequelize from './sequelize';

const SongExtra = sequelize.define('SongExtra', {
  songId: {
    type: DataTypes.STRING,
    primaryKey: true,
  },

  bpm: DataTypes.REAL,
  releaseDate: DataTypes.DATEONLY,
});

export default SongExtra;
