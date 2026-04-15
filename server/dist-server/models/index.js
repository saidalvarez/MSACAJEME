"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditLog = exports.Usuario = exports.Ticket = exports.SaleItem = exports.Sale = exports.ItemTicket = exports.ItemCatalogo = exports.Inventory = exports.Expense = exports.Cliente = void 0;
const Cliente_1 = __importDefault(require("./Cliente"));
exports.Cliente = Cliente_1.default;
const Expense_1 = __importDefault(require("./Expense"));
exports.Expense = Expense_1.default;
const Inventory_1 = __importDefault(require("./Inventory"));
exports.Inventory = Inventory_1.default;
const ItemCatalogo_1 = __importDefault(require("./ItemCatalogo"));
exports.ItemCatalogo = ItemCatalogo_1.default;
const ItemTicket_1 = __importDefault(require("./ItemTicket"));
exports.ItemTicket = ItemTicket_1.default;
const Sale_1 = __importDefault(require("./Sale"));
exports.Sale = Sale_1.default;
const SaleItem_1 = __importDefault(require("./SaleItem"));
exports.SaleItem = SaleItem_1.default;
const Ticket_1 = __importDefault(require("./Ticket"));
exports.Ticket = Ticket_1.default;
const Usuario_1 = __importDefault(require("./Usuario"));
exports.Usuario = Usuario_1.default;
const AuditLog_1 = __importDefault(require("./AuditLog"));
exports.AuditLog = AuditLog_1.default;
// Associations - Tickets (Active & Archived)
Ticket_1.default.hasMany(ItemTicket_1.default, { foreignKey: 'ticket_id', as: 'items' });
ItemTicket_1.default.belongsTo(Ticket_1.default, { foreignKey: 'ticket_id' });
// Associations - Sales
Sale_1.default.hasMany(SaleItem_1.default, { foreignKey: 'sale_id', as: 'items' });
SaleItem_1.default.belongsTo(Sale_1.default, { foreignKey: 'sale_id' });
