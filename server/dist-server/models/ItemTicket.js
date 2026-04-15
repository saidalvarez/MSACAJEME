"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const base_de_datos_1 = __importDefault(require("../base_de_datos"));
class ItemTicket extends sequelize_1.Model {
}
ItemTicket.init({
    id: {
        type: sequelize_1.DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    ticket_id: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false
    },
    inventory_id: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: true
    },
    name: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false
    },
    price: {
        type: sequelize_1.DataTypes.DECIMAL(15, 2),
        allowNull: false
    },
    quantity: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false
    },
    purchase_price: {
        type: sequelize_1.DataTypes.DECIMAL(15, 2),
        allowNull: true
    },
    image: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: true
    },
    deletedAt: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: true
    }
}, {
    sequelize: base_de_datos_1.default,
    tableName: 'ticket_items',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,
    paranoid: true
});
exports.default = ItemTicket;
