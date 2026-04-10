import { DataTypes, Model } from 'sequelize';
import sequelize from '../base_de_datos';

class AuditLog extends Model {
  declare id: number;
  declare action: string;
  declare entity: string;
  declare entity_id: string;
  declare user_id: string;
  declare details: string;
}

AuditLog.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  action: {
    type: DataTypes.STRING,
    allowNull: false
  },
  entity: {
    type: DataTypes.STRING,
    allowNull: false
  },
  entity_id: {
    type: DataTypes.STRING,
    allowNull: true
  },
  user_id: {
    type: DataTypes.STRING,
    allowNull: true // Optional if no user was authenticated
  },
  details: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  sequelize,
  tableName: 'audit_logs',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false
});

export default AuditLog;
