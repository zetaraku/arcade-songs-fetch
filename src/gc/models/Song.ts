import { DataTypes } from 'sequelize';
import sequelize from './sequelize';

const Song = sequelize.define('Song', {
  songId: {
    type: DataTypes.STRING,
    primaryKey: true,
  },

  category: DataTypes.STRING,
  title: DataTypes.STRING,
  artist: DataTypes.STRING,

  imageName: DataTypes.STRING,
  imageUrl: DataTypes.STRING,

  version: DataTypes.STRING,
  releaseDate: DataTypes.DATEONLY,

  isNew: DataTypes.BOOLEAN,
  isLocked: DataTypes.BOOLEAN,
});

export default Song;
