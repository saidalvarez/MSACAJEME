"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = __importDefault(require("../middleware/auth"));
const authorize_1 = __importDefault(require("../middleware/authorize"));
const ticketController_1 = require("../controllers/ticketController");
const validateRequest_1 = require("../middleware/validateRequest");
const ticket_1 = require("../schemas/ticket");
const router = express_1.default.Router();
router.use(auth_1.default);
// All authenticated users can read and create tickets
router.get('/', ticketController_1.TicketController.getTickets);
router.post('/', (0, validateRequest_1.validateRequest)(ticket_1.createTicketSchema), ticketController_1.TicketController.createTicket);
router.put('/:id', (0, validateRequest_1.validateRequest)(ticket_1.updateTicketSchema), ticketController_1.TicketController.updateTicket);
// Only admin and recepcion can delete individual tickets
router.delete('/:id', (0, authorize_1.default)('admin', 'recepcion'), ticketController_1.TicketController.deleteTicket);
// Only admin can archive (corte de día) or clear all tickets
router.post('/archive-by-date', (0, authorize_1.default)('admin'), ticketController_1.TicketController.archiveByDate);
router.delete('/clear', (0, authorize_1.default)('admin'), ticketController_1.TicketController.clearTickets);
exports.default = router;
