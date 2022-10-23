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
});

module.exports = defineConfigs;
