import { Sequelize } from 'sequelize';

export default new Sequelize('sqlite:data/taiko/db.sqlite3', {
  logging: false,
  define: {
    timestamps: false,
  },
});
