const path = require('node:path');

module.exports = {
  development: {
    dialect: 'sqlite',
    storage: path.resolve(__dirname, '../../../data/sdvx/db.sqlite3'),
    logging: false,
    define: {
      timestamps: false,
    },
  },
};
