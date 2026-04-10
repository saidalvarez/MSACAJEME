import { DataTypes, Model } from 'sequelize';
import sequelize from '../base_de_datos';

class ItemTicket extends Model {
  declare id: number;
  declare ticket_id: string;
  declare name: string;
  declare price: number;
  declare quantity: number;
  declare purchase_price: number;
  declare inventory_id: string;
  declare image: string;
  declare deletedAt: Date;
}

ItemTicket.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  ticket_id: {
    type: DataTypes.STRING,
    allowNull: false
  },
  inventory_id: {
    type: DataTypes.STRING,
    allowNull: true
  },
  name: {
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
  image: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  deletedAt: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  sequelize,
  tableName: 'ticket_items',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false,
  paranoid: true
});

export default ItemTicket;
