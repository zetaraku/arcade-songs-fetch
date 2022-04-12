import { DataTypes } from 'sequelize';
import sequelize from './sequelize';

const IntlSheet = sequelize.define('IntlSheet', {
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

export default IntlSheet;
