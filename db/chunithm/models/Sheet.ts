import { defineSheet } from '@@/db/_shared/models';
import sequelize from './sequelize';

const Sheet = defineSheet(sequelize);

export default Sheet;
