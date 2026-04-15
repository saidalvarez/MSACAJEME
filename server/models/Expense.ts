import { DataTypes, Model } from 'sequelize';
import sequelize from '../base_de_datos';

class Expense extends Model {
  declare id: string;
  declare description: string;
  declare amount: number;
  declare type: string;
  declare date: Date;
  declare is_archived: boolean;
}

Expense.init({
  id: {
    type: DataTypes.STRING,
    primaryKey: true
  },
  description: {
    type: DataTypes.STRING,
    allowNull: false
  },
  amount: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false
  },
  type: {
    type: DataTypes.STRING,
    allowNull: false
  },
  date: {
    type: DataTypes.DATE,
    allowNull: false
  },
  is_archived: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
}, {
  sequelize,
  tableName: 'expenses',
  createdAt: 'created_at',
  updatedAt: false,
  paranoid: true
});

export default Expense;
