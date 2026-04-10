import express from 'express';
import { FinanceController } from '../controllers/financeController';
import verifyToken from '../middleware/auth';

const router = express.Router();

router.use(verifyToken);

router.get('/summary', FinanceController.getMonthlySummary);
router.get('/chart', FinanceController.getHistoricalChart);

export default router;
