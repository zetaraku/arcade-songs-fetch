import { defineSong } from '@@/db/_shared/models';
import sequelize from './sequelize';

const Song = defineSong(sequelize);

export default Song;
