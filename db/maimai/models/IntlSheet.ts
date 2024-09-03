import { defineSheet } from '@@/db/_shared/models';
import sequelize from './sequelize';

const IntlSheet = defineSheet(sequelize, 'IntlSheet');

export default IntlSheet;
