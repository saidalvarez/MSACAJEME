"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FinanceController = void 0;
const financeService_1 = require("../services/financeService");
const logger_1 = __importDefault(require("../utils/logger"));
class FinanceController {
    static async getMonthlySummary(req, res) {
        try {
            const { month } = req.query;
            if (!month || typeof month !== 'string') {
                return res.status(400).json({ error: 'Month param YYYY-MM is required' });
            }
            const summary = await financeService_1.FinanceService.getMonthlySummary(month);
            let totalTickets = 0;
            let extraIncome = 0;
            let totalExpenses = 0;
            summary.tickets.forEach(t => totalTickets += Number(t.total || 0));
            summary.sales.forEach(s => extraIncome += Number(s.total || 0));
            summary.expenses.forEach(e => {
                if (e.type === 'income')
                    extraIncome += Number(e.amount || 0);
                else
                    totalExpenses += Number(e.amount || 0);
            });
            const totalIncome = totalTickets + extraIncome;
            const netIncome = totalIncome - totalExpenses;
            res.json({
                totalIncome,
                totalExpenses,
                netIncome,
                tickets: summary.tickets,
                sales: summary.sales,
                expenses: summary.expenses
            });
        }
        catch (error) {
            logger_1.default.error('[FINANCE] Error:', error);
            res.status(500).json({ error: 'Error calculating monthly summary' });
        }
    }
    static async getHistoricalChart(req, res) {
        try {
            const chartData = await financeService_1.FinanceService.getSixMonthChart();
            res.json(chartData);
        }
        catch (error) {
            logger_1.default.error('[FINANCE] Error Chart:', error);
            res.status(500).json({ error: 'Error calculating historical chart' });
        }
    }
}
exports.FinanceController = FinanceController;
