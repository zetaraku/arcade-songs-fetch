const path = require('node:path');

module.exports = {
  development: {
    dialect: 'sqlite',
    storage: path.resolve(__dirname, '../../../data/ongeki/db.sqlite3'),
    logging: false,
    define: {
      timestamps: false,
    },
  },
};
