import { Sequelize } from 'sequelize';

export default new Sequelize('sqlite:data/sdvx/db.sqlite3', {
  logging: false,
  define: {
    timestamps: false,
  },
});
