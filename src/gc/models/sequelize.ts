import { Sequelize } from 'sequelize';

export default new Sequelize('sqlite:data/gc/db.sqlite3', {
  logging: false,
  define: {
    timestamps: false,
  },
});
