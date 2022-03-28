import { Sequelize } from 'sequelize';

export default new Sequelize('sqlite:data/maimai/db.sqlite3', {
  logging: false,
});
