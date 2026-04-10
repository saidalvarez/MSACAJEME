import { DataTypes, Model } from 'sequelize';
import sequelize from '../base_de_datos';

class ItemCatalogo extends Model {
  declare id: number;
  declare brand: string;
  declare viscosity: string;
  declare type: string;
  declare category: string;
  declare image: string;
  declare marketPrice: number;
  declare wholesalePrice: number;
  declare is_custom: boolean;
  declare barcode: string;
  declare created_at: Date;
}

ItemCatalogo.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
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
  image: {
    type: DataTypes.TEXT,
    allowNull: true
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
  is_custom: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  barcode: {
    type: DataTypes.STRING,
    allowNull: true
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  sequelize,
  tableName: 'item_catalogo',
  timestamps: false
});

export default ItemCatalogo;
