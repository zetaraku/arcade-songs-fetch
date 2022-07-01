import { defineSheetInternalLevel } from '@@/db/_shared/models';
import sequelize from './sequelize';

const SheetInternalLevel = defineSheetInternalLevel(sequelize);

export default SheetInternalLevel;
