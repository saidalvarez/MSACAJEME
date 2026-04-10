import { DataTypes, Model } from 'sequelize';
import sequelize from '../base_de_datos';

class Sale extends Model {
  declare id: string;
  declare client_id: string;
  declare client_name: string;
  declare client_phone: string;
  declare total: number;
  declare status: string;
  declare payment_method: string;
  declare date: Date;
  declare is_archived: boolean;
  declare deletedAt: Date;
}

Sale.init({
  id: {
    type: DataTypes.STRING,
    primaryKey: true
  },
  client_id: {
    type: DataTypes.STRING,
    allowNull: true
  },
  client_name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  client_phone: {
    type: DataTypes.STRING,
    allowNull: true
  },
  total: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false
  },
  payment_method: {
    type: DataTypes.STRING,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('completed', 'pending', 'cancelled'),
    defaultValue: 'completed'
  },
  date: {
    type: DataTypes.DATE,
    allowNull: false
  },
  is_archived: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  deletedAt: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  sequelize,
  tableName: 'sales',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false,
  paranoid: true
});

export default Sale;
