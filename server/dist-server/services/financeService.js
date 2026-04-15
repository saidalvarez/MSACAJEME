"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FinanceService = void 0;
const models_1 = require("../models");
const sequelize_1 = require("sequelize");
class FinanceService {
    static async getMonthlySummary(monthYYYYMM) {
        const startOfMonth = new Date(`${monthYYYYMM}-01T00:00:00`);
        const endOfMonth = new Date(startOfMonth.getFullYear(), startOfMonth.getMonth() + 1, 0, 23, 59, 59);
        const dateFilter = { [sequelize_1.Op.between]: [startOfMonth, endOfMonth] };
        // Get Tickets (Completed + Archived) - both count as revenue
        const completedTickets = await models_1.Ticket.findAll({
            where: { status: { [sequelize_1.Op.in]: ['completed', 'archived'] }, date: dateFilter },
            raw: true
        });
        // Get Expenses
        const expenses = await models_1.Expense.findAll({
            where: { date: dateFilter, is_archived: { [sequelize_1.Op.or]: [false, null] } },
            raw: true
        });
        // Get Sales
        const sales = await models_1.Sale.findAll({
            where: { date: dateFilter, is_archived: { [sequelize_1.Op.or]: [false, null] } },
            raw: true
        });
        return {
            tickets: completedTickets,
            expenses,
            sales
        };
    }
    static async getSixMonthChart() {
        const data = [];
        const now = new Date();
        for (let i = 5; i >= 0; i--) {
            const targetMonth = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const yyyymm = targetMonth.toISOString().slice(0, 7);
            const label = targetMonth.toLocaleDateString('es-MX', { month: 'short' }).replace(/^\w/, c => c.toUpperCase());
            const summary = await this.getMonthlySummary(yyyymm);
            let mExtraIncome = 0;
            let mOutcome = 0;
            summary.expenses.forEach((e) => {
                if (e.type === 'income')
                    mExtraIncome += Number(e.amount || 0);
                else
                    mOutcome += Number(e.amount || 0);
            });
            const totalSales = summary.sales.reduce((acc, s) => acc + Number(s.total || 0), 0);
            mExtraIncome += totalSales;
            const mIncome = summary.tickets.reduce((acc, t) => acc + Number(t.total || 0), 0) + mExtraIncome;
            data.push({ name: label, VENTAS: mIncome, GASTOS: mOutcome });
        }
        return data;
    }
}
exports.FinanceService = FinanceService;
