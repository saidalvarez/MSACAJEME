import { DataTypes, Model } from 'sequelize';
import sequelize from '../base_de_datos';

class Usuario extends Model {
  declare id: string;
  declare username: string;
  declare password: string;
  declare role: string;
  declare force_password_change: boolean;
}

Usuario.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  username: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  password: {
    type: DataTypes.STRING,
    allowNull: true
  },
  role: {
    type: DataTypes.ENUM('admin', 'recepcion', 'mecanico'),
    defaultValue: 'admin'
  },
  force_password_change: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
}, {
  sequelize,
  tableName: 'usuarios',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

export default Usuario;

