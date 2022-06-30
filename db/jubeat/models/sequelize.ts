import { Sequelize } from 'sequelize';
import configs from '../config/config';

export default new Sequelize(configs.development);
