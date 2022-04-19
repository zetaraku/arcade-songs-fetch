import { DataTypes } from 'sequelize';
import sequelize from './sequelize';

const JpSheet = sequelize.define('JpSheet', {
  category: {
    type: DataTypes.STRING,
    primaryKey: true,
  },
  title: {
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

export default JpSheet;
