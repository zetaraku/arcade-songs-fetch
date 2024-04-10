import { Sequelize, DataTypes } from 'sequelize';

export default function defineModel(sequelize: Sequelize, modelName: string = 'Song') {
  return sequelize.define(modelName, {
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

    comment: DataTypes.TEXT,
  });
}
