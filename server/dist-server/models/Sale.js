"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const base_de_datos_1 = __importDefault(require("../base_de_datos"));
class Sale extends sequelize_1.Model {
}
Sale.init({
    id: {
        type: sequelize_1.DataTypes.STRING,
        primaryKey: true
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
    total: {
        type: sequelize_1.DataTypes.DECIMAL(15, 2),
        allowNull: false
    },
    payment_method: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: true
    },
    status: {
        type: sequelize_1.DataTypes.ENUM('completed', 'pending', 'cancelled'),
        defaultValue: 'completed'
    },
    date: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: false
    },
    is_archived: {
        type: sequelize_1.DataTypes.BOOLEAN,
        defaultValue: false
    },
    deletedAt: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: true
    }
}, {
    sequelize: base_de_datos_1.default,
    tableName: 'sales',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,
    paranoid: true
});
exports.default = Sale;
