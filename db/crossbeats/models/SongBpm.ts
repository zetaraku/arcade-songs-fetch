import { DataTypes } from 'sequelize';
import sequelize from './sequelize';

const SongBpm = sequelize.define('SongBpm', {
  songId: {
    type: DataTypes.STRING,
    primaryKey: true,
  },

  bpm: DataTypes.REAL,
});

export default SongBpm;
