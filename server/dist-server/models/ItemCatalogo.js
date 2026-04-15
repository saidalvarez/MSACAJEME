"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const base_de_datos_1 = __importDefault(require("../base_de_datos"));
class ItemCatalogo extends sequelize_1.Model {
}
ItemCatalogo.init({
    id: {
        type: sequelize_1.DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
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
    image: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: true
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
    is_custom: {
        type: sequelize_1.DataTypes.BOOLEAN,
        defaultValue: false
    },
    barcode: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: true
    },
    created_at: {
        type: sequelize_1.DataTypes.DATE,
        defaultValue: sequelize_1.DataTypes.NOW
    }
}, {
    sequelize: base_de_datos_1.default,
    tableName: 'item_catalogo',
    timestamps: false
});
exports.default = ItemCatalogo;
