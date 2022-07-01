import { defineRegionSheet } from '@@/db/_shared/models';
import sequelize from './sequelize';

const JpSheet = defineRegionSheet(sequelize, 'JpSheet');

export default JpSheet;
