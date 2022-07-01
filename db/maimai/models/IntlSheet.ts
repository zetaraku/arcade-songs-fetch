import { defineRegionSheet } from '@@/db/_shared/models';
import sequelize from './sequelize';

const IntlSheet = defineRegionSheet(sequelize, 'IntlSheet');

export default IntlSheet;
