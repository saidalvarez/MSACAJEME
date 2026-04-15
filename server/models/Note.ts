import { DataTypes, Model } from 'sequelize';
import sequelize from '../base_de_datos';

class Note extends Model {
  declare id: string;
  declare text: string;
  declare color: string;
  declare pinned: boolean;
  declare priority: string;
}

Note.init({
  id: {
    type: DataTypes.STRING,
    primaryKey: true,
    defaultValue: DataTypes.UUIDV4
  },
  text: {
    type: DataTypes.TEXT,
    allowNull: false,
    defaultValue: ''
  },
  color: {
    type: DataTypes.STRING,
    defaultValue: 'yellow'
  },
  pinned: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  priority: {
    type: DataTypes.STRING,
    defaultValue: 'normal'
  }
}, {
  sequelize,
  tableName: 'notes',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

export default Note;
