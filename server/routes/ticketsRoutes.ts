import express from 'express';
import verifyToken from '../middleware/auth';
import authorize from '../middleware/authorize';
import { TicketController } from '../controllers/ticketController';
import { validateRequest } from '../middleware/validateRequest';
import { createTicketSchema, updateTicketSchema } from '../schemas/ticket';

const router = express.Router();

router.use(verifyToken);

// All authenticated users can read and create tickets
router.get('/', TicketController.getTickets);
router.post('/', validateRequest(createTicketSchema), TicketController.createTicket);
router.put('/:id', validateRequest(updateTicketSchema), TicketController.updateTicket);

// Only admin and recepcion can delete individual tickets
router.delete('/:id', authorize('admin', 'recepcion'), TicketController.deleteTicket);

// Only admin can archive (corte de día) or clear all tickets
router.post('/archive-by-date', authorize('admin'), TicketController.archiveByDate);
router.delete('/clear', authorize('admin'), TicketController.clearTickets);

export default router;
