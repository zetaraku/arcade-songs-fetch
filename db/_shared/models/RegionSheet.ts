import { Sequelize, DataTypes } from 'sequelize';

export default function defineModel(sequelize: Sequelize, modelName: string) {
  return sequelize.define(modelName, {
    songId: {
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
  });
}
