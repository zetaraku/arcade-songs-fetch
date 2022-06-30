const path = require('node:path');

module.exports = {
  development: {
    dialect: 'sqlite',
    storage: path.resolve(__dirname, '../../../data/jubeat/db.sqlite3'),
    logging: false,
    define: {
      timestamps: false,
    },
  },
};
