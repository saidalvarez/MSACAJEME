"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const base_de_datos_1 = __importDefault(require("../base_de_datos"));
class Ticket extends sequelize_1.Model {
}
Ticket.init({
    id: {
        type: sequelize_1.DataTypes.STRING,
        primaryKey: true
    },
    ticket_number: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
        unique: true
    },
    client_id: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: true
    },
    client_name: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false
    },
    client_phone: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: true
    },
    client_email: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: true
    },
    vehicle: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: true
    },
    total: {
        type: sequelize_1.DataTypes.DECIMAL(15, 2),
        allowNull: false
    },
    status: {
        type: sequelize_1.DataTypes.ENUM('pending', 'completed', 'cancelled', 'archived'),
        defaultValue: 'pending'
    },
    format_type: {
        type: sequelize_1.DataTypes.STRING,
        defaultValue: 'basic'
    },
    notes: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: true
    },
    discount: {
        type: sequelize_1.DataTypes.DECIMAL(15, 2),
        defaultValue: 0
    },
    date: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: false
    },
    archived_at: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: true
    },
    service_photo: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: true
    },
    service_category: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: true,
        defaultValue: 'general'
    },
    deletedAt: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: true
    }
}, {
    sequelize: base_de_datos_1.default,
    tableName: 'tickets',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,
    paranoid: true,
    indexes: [
        { fields: ['ticket_number'], unique: true },
        { fields: ['client_id'] },
        { fields: ['client_name'] },
        { fields: ['status'] }
    ]
});
exports.default = Ticket;
