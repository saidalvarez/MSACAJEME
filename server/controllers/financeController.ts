import { Request, Response } from 'express';
import { FinanceService } from '../services/financeService';
import logger from '../utils/logger';

export class FinanceController {
  static async getMonthlySummary(req: Request, res: Response) {
    try {
      const { month } = req.query;
      if (!month || typeof month !== 'string') {
        return res.status(400).json({ error: 'Month param YYYY-MM is required' });
      }

      const summary = await FinanceService.getMonthlySummary(month);
      
      let totalTickets = 0;
      let extraIncome = 0;
      let totalExpenses = 0;
      
      summary.tickets.forEach(t => totalTickets += Number(t.total || 0));
      summary.sales.forEach(s => extraIncome += Number(s.total || 0));
      summary.expenses.forEach(e => {
        if (e.type === 'income') extraIncome += Number(e.amount || 0);
        else totalExpenses += Number(e.amount || 0);
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
    } catch (error: any) {
      logger.error('[FINANCE] Error:', error);
      res.status(500).json({ error: 'Error calculating monthly summary' });
    }
  }

  static async getHistoricalChart(req: Request, res: Response) {
    try {
      const chartData = await FinanceService.getSixMonthChart();
      res.json(chartData);
    } catch (error: any) {
      logger.error('[FINANCE] Error Chart:', error);
      res.status(500).json({ error: 'Error calculating historical chart' });
    }
  }
}
