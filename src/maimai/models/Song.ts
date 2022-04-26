import { DataTypes } from 'sequelize';
import sequelize from './sequelize';

const Song = sequelize.define('Song', {
  category: {
    type: DataTypes.STRING,
    primaryKey: true,
  },
  title: {
    type: DataTypes.STRING,
    primaryKey: true,
  },

  // titleKana: DataTypes.STRING,
  artist: DataTypes.STRING,

  imageName: DataTypes.STRING,
  imageUrl: DataTypes.STRING,

  // versionId: DataTypes.INTEGER,
  // releaseBatchNo: DataTypes.INTEGER,
  // sortOrder: DataTypes.INTEGER,
  releaseId: DataTypes.STRING,
  version: DataTypes.STRING,
  releaseDate: DataTypes.DATEONLY,

  isNew: DataTypes.BOOLEAN,
  isLocked: DataTypes.BOOLEAN,
});

export default Song;
