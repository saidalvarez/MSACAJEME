import { DataTypes, Model } from 'sequelize';
import sequelize from '../base_de_datos';

class ItemHistorial extends Model {
  declare id: number;
  declare historial_ticket_id: string;
  declare name: string;
  declare price: number;
  declare quantity: number;
  declare purchase_price: number;
  declare inventory_id: string;
  declare image: string;
}

ItemHistorial.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  historial_ticket_id: {
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
  }
}, {
  sequelize,
  tableName: 'historial_items',
  timestamps: false
});

export default ItemHistorial;
