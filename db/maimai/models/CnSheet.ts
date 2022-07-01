import { defineRegionSheet } from '@@/db/_shared/models';
import sequelize from './sequelize';

const CnSheet = defineRegionSheet(sequelize, 'CnSheet');

export default CnSheet;
