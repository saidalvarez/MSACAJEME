import { DataTypes, Model } from 'sequelize';
import sequelize from '../base_de_datos';

class SaleItem extends Model {
  declare id: number;
  declare sale_id: string;
  declare brand: string;
  declare viscosity: string;
  declare type: string;
  declare price: number;
  declare quantity: number;
  declare purchase_price: number;
  declare inventory_id: string;
  declare deletedAt: Date;
}

SaleItem.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  sale_id: {
    type: DataTypes.STRING,
    allowNull: false
  },
  inventory_id: {
    type: DataTypes.STRING,
    allowNull: true
  },
  brand: {
    type: DataTypes.STRING,
    allowNull: false
  },
  viscosity: {
    type: DataTypes.STRING,
    allowNull: true
  },
  type: {
    type: DataTypes.STRING,
    allowNull: false
  },
  price: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false
  },
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  purchase_price: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: true
  },
  deletedAt: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  sequelize,
  tableName: 'sale_items',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false,
  paranoid: true
});

export default SaleItem;
