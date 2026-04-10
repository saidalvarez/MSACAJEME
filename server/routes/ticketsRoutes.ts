import express from 'express';
import verifyToken from '../middleware/auth';
import { TicketController } from '../controllers/ticketController';
import { validateRequest } from '../middleware/validateRequest';
import { createTicketSchema, updateTicketSchema } from '../schemas/ticket';

const router = express.Router();

router.use(verifyToken);

router.get('/', TicketController.getTickets);
router.post('/', validateRequest(createTicketSchema), TicketController.createTicket);
router.put('/:id', validateRequest(updateTicketSchema), TicketController.updateTicket);
router.delete('/:id', TicketController.deleteTicket);
router.post('/archive-by-date', TicketController.archiveByDate);
router.delete('/clear', TicketController.clearTickets);

export default router;
