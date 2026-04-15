"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const base_de_datos_1 = __importDefault(require("../base_de_datos"));
class AuditLog extends sequelize_1.Model {
}
AuditLog.init({
    id: {
        type: sequelize_1.DataTypes.STRING,
        primaryKey: true,
        defaultValue: sequelize_1.DataTypes.UUIDV4
    },
    action: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false
    },
    entity: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false
    },
    entity_id: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: true
    },
    user_id: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: true // Optional if no user was authenticated
    },
    details: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: true
    }
}, {
    sequelize: base_de_datos_1.default,
    tableName: 'audit_logs',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false
});
exports.default = AuditLog;
