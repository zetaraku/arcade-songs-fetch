import { DataTypes } from 'sequelize';
import sequelize from './sequelize';

const SongArtist = sequelize.define('SongArtist', {
  songId: {
    type: DataTypes.STRING,
    primaryKey: true,
  },

  artist: DataTypes.STRING,
});

export default SongArtist;
