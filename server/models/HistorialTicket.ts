import { DataTypes, Model } from 'sequelize';
import sequelize from '../base_de_datos';

class HistorialTicket extends Model {
  declare id: string;
  declare ticket_number: number;
  declare client_id: string;
  declare client_name: string;
  declare client_phone: string;
  declare client_email: string;
  declare vehicle: string;
  declare total: number;
  declare status: string;
  declare format_type: string;
  declare notes: string;
  declare discount: number;
  declare date: Date;
  declare service_photo: string;
  declare service_category: string;
  declare archived_at: Date;
}

HistorialTicket.init({
  id: {
    type: DataTypes.STRING,
    primaryKey: true
  },
  ticket_number: {
    type: DataTypes.INTEGER,
    allowNull: false
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
  client_email: {
    type: DataTypes.STRING,
    allowNull: true
  },
  vehicle: {
    type: DataTypes.STRING,
    allowNull: true
  },
  total: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false
  },
  status: {
    type: DataTypes.STRING,
    defaultValue: 'completed'
  },
  format_type: {
    type: DataTypes.STRING,
    defaultValue: 'basic'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  discount: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0
  },
  date: {
    type: DataTypes.DATE,
    allowNull: false
  },
  service_photo: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  service_category: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: 'general'
  },
  archived_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  sequelize,
  tableName: 'historial_tickets',
  timestamps: false,
  indexes: [
    { fields: ['ticket_number'] },
    { fields: ['client_name'] },
    { fields: ['date'] }
  ]
});

export default HistorialTicket;
