import { DataTypes, Model } from 'sequelize';
import sequelize from '../base_de_datos';

class Inventory extends Model {
  declare id: string;
  declare brand: string;
  declare viscosity: string;
  declare type: string;
  declare category: string;
  declare initialStock: number;
  declare currentStock: number;
  declare purchaseNumber: string;
  declare image: string;
  declare purchasePrice: number;
  declare marketPrice: number;
  declare wholesalePrice: number;
  declare min_stock: number;
  declare barcode: string;
  declare date: string;
  declare created_at: Date;
}

Inventory.init({
  id: {
    type: DataTypes.STRING,
    primaryKey: true
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
  category: {
    type: DataTypes.STRING,
    defaultValue: 'Aceite'
  },
  initialStock: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'initial_stock'
  },
  currentStock: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'current_stock'
  },
  purchaseNumber: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'purchase_number'
  },
  image: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  purchasePrice: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: true,
    field: 'purchase_price'
  },
  marketPrice: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: true,
    field: 'market_price'
  },
  wholesalePrice: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: true,
    field: 'wholesale_price'
  },
  date: {
    type: DataTypes.STRING,
    allowNull: true
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  min_stock: {
    type: DataTypes.INTEGER,
    defaultValue: 5
  },
  barcode: {
    type: DataTypes.STRING,
    allowNull: true
  }
}, {
  sequelize,
  tableName: 'inventory',
  timestamps: false
});

export default Inventory;
