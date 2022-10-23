import type { Options } from 'sequelize';

declare const defineConfigs: (gameCode: string) => { development: Options };

export = defineConfigs;
