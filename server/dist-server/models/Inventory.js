"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const base_de_datos_1 = __importDefault(require("../base_de_datos"));
class Inventory extends sequelize_1.Model {
}
Inventory.init({
    id: {
        type: sequelize_1.DataTypes.STRING,
        primaryKey: true
    },
    brand: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false
    },
    viscosity: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: true
    },
    type: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false
    },
    category: {
        type: sequelize_1.DataTypes.STRING,
        defaultValue: 'Aceite'
    },
    initialStock: {
        type: sequelize_1.DataTypes.INTEGER,
        defaultValue: 0,
        field: 'initial_stock'
    },
    currentStock: {
        type: sequelize_1.DataTypes.INTEGER,
        defaultValue: 0,
        field: 'current_stock'
    },
    purchaseNumber: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: true,
        field: 'purchase_number'
    },
    image: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: true
    },
    purchasePrice: {
        type: sequelize_1.DataTypes.DECIMAL(15, 2),
        allowNull: true,
        field: 'purchase_price'
    },
    marketPrice: {
        type: sequelize_1.DataTypes.DECIMAL(15, 2),
        allowNull: true,
        field: 'market_price'
    },
    wholesalePrice: {
        type: sequelize_1.DataTypes.DECIMAL(15, 2),
        allowNull: true,
        field: 'wholesale_price'
    },
    date: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: true
    },
    created_at: {
        type: sequelize_1.DataTypes.DATE,
        defaultValue: sequelize_1.DataTypes.NOW
    },
    min_stock: {
        type: sequelize_1.DataTypes.INTEGER,
        defaultValue: 5
    },
    barcode: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: true
    }
}, {
    sequelize: base_de_datos_1.default,
    tableName: 'inventory',
    timestamps: false
});
exports.default = Inventory;
