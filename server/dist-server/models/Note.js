"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const base_de_datos_1 = __importDefault(require("../base_de_datos"));
class Note extends sequelize_1.Model {
}
Note.init({
    id: {
        type: sequelize_1.DataTypes.STRING,
        primaryKey: true,
        defaultValue: sequelize_1.DataTypes.UUIDV4
    },
    text: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: false,
        defaultValue: ''
    },
    color: {
        type: sequelize_1.DataTypes.STRING,
        defaultValue: 'yellow'
    },
    pinned: {
        type: sequelize_1.DataTypes.BOOLEAN,
        defaultValue: false
    },
    priority: {
        type: sequelize_1.DataTypes.STRING,
        defaultValue: 'normal'
    }
}, {
    sequelize: base_de_datos_1.default,
    tableName: 'notes',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});
exports.default = Note;
