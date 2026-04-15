import { DataTypes, Model } from 'sequelize';
import sequelize from '../base_de_datos';

class Cliente extends Model {
  declare id: string;
  declare name: string;
  declare phone: string;
  declare email: string;
  declare created_at: Date;
}

Cliente.init({
  id: {
    type: DataTypes.STRING,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: true
  },
  email: {
    type: DataTypes.STRING,
    allowNull: true
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  sequelize,
  tableName: 'clients',
  timestamps: false
});

export default Cliente;
