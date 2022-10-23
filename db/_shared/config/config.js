const path = require('node:path');

const baseConfig = {
  logging: false,
  define: {
    timestamps: false,
  },
};

const defineConfigs = (gameCode) => ({
  development: {
    ...baseConfig,
    dialect: 'sqlite',
    storage: path.resolve(__dirname, `../../../data/${gameCode}/db.sqlite3`),
  },
  // development: {
  //   ...baseConfig,
  //   dialect: 'postgres',
  //   host: '127.0.0.1',
  //   port: '5432',
  //   username: 'postgres',
  //   password: '',
  //   database: gameCode,
  // },
});

module.exports = defineConfigs;
