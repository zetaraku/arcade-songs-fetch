import { DataTypes } from 'sequelize';
import sequelize from './sequelize';

const SongOrder = sequelize.define('SongOrder', {
  songId: {
    type: DataTypes.STRING,
    primaryKey: true,
  },

  sortOrder: DataTypes.INTEGER,
});

export default SongOrder;
