import express from 'express';
import { Cliente, Ticket, Sale } from '../models';
import verifyToken from '../middleware/auth';
import { Op } from 'sequelize';
import sequelize from '../base_de_datos';
import logger from '../utils/logger';

const router = express.Router();
router.use(verifyToken);

router.get('/', async (req, res) => {
  try {
    logger.info('GET /api/clients');
    const query = `
      SELECT c.*,
        CAST(COALESCE(act.visits, 0) AS INTEGER) as total_visits,
        CAST(COALESCE(act.spent, 0) AS NUMERIC) as total_spent,
        COALESCE(act.last_activity, c.created_at) as last_activity
      FROM clients c
      LEFT JOIN (
        SELECT 
          client_id, 
          COUNT(id) as visits, 
          SUM(total) as spent, 
          MAX(date) as last_activity
        FROM (
          SELECT id, client_id, total, date FROM tickets WHERE "deletedAt" IS NULL
          UNION ALL
          SELECT id, client_id, total, date FROM sales WHERE "deletedAt" IS NULL
        ) as combined
        GROUP BY client_id
      ) act ON c.id = act.client_id
      ORDER BY c.created_at DESC
    `;
    const [clients] = await sequelize.query(query);
    res.json(clients);
  } catch (error) {
    logger.error('Error GET /api/clients:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.post('/', async (req, res) => {
  try {
    logger.info('POST /api/clients - Body:', req.body);
    const { name, phone } = req.body;
    
    // GENERATE CUSTOM ID: [Initials] + [Last 4 Phone]
    if (name) {
      const nameParts = name.trim().split(/\s+/);
      let initials = "";
      if (nameParts.length >= 2) {
        initials = (nameParts[0][0] + nameParts[1][0]).toUpperCase();
      } else if (nameParts.length === 1 && nameParts[0].length >= 2) {
        initials = nameParts[0].substring(0, 2).toUpperCase();
      } else if (nameParts.length === 1) {
        initials = (nameParts[0][0] + "X").toUpperCase();
      } else {
        initials = "CL";
      }
      
      const cleanPhone = (phone || "").replace(/\D/g, '');
      const last4 = cleanPhone.slice(-4).padStart(4, '0');
      const baseId = `${initials}${last4}`;
      
      let finalId = baseId;
      let counter = 1;
      // Check for collisions
      while (await Cliente.findByPk(finalId)) {
        finalId = `${baseId}-${counter}`;
        counter++;
      }
      req.body.id = finalId;
    }

    const client = await Cliente.create(req.body);
    logger.info(`Client created: ${client.id}`);
    res.status(201).json(client);
  } catch (error) {
    logger.error('Error POST /api/clients:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.put('/:id', async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;
    const client = await Cliente.findByPk(id, { transaction: t });
    if (!client) {
      await t.rollback();
      return res.status(404).json({ error: 'Client not found' });
    }
    
    const oldName = client.name;
    const oldPhone = client.phone;
    const newName = req.body.name || oldName;
    const newPhone = req.body.phone || oldPhone;

    // GENERATE POTENTIAL NEW ID: [Initials] + [Last 4 Phone]
    let newId = id;
    if (newName !== oldName || newPhone !== oldPhone) {
        const nameParts = newName.trim().split(/\s+/);
        let initials = "";
        if (nameParts.length >= 2) {
            initials = (nameParts[0][0] + nameParts[1][0]).toUpperCase();
        } else if (nameParts.length === 1 && nameParts[0].length >= 2) {
            initials = nameParts[0].substring(0, 2).toUpperCase();
        } else if (nameParts.length === 1) {
            initials = (nameParts[0][0] + "X").toUpperCase();
        } else {
            initials = "CL";
        }
        
        const cleanPhone = (newPhone || "").replace(/\D/g, '');
        const last4 = cleanPhone.slice(-4).padStart(4, '0');
        const baseId = `${initials}${last4}`;
        
        newId = baseId;
        if (newId !== id) {
            let counter = 1;
            while (await Cliente.findByPk(newId, { transaction: t })) {
                newId = `${baseId}-${counter}`;
                counter++;
            }
        }
    }

    // Cascade update to other tables
    if (newName !== oldName || newPhone !== oldPhone || newId !== id) {
      logger.info(`Cascading update for client ID ${id} -> ${newId}: ${oldName} -> ${newName}`);
      
      const whereClause = { client_id: id };
      
      // Update by client_id FIRST in all related tables
      await Ticket.update(
        { client_id: newId, client_name: newName, client_phone: newPhone },
        { where: whereClause, transaction: t }
      );
      
      await Sale.update(
        { client_id: newId, client_name: newName, client_phone: newPhone },
        { where: whereClause, transaction: t }
      );

      // LEGACY FALLBACK: Match by name (for legacy records missing client_id)
      const legacyWhere = { client_name: oldName, client_id: null };
      
      await Ticket.update({ client_id: newId, client_name: newName, client_phone: newPhone }, { where: legacyWhere, transaction: t });
      await Sale.update({ client_id: newId, client_name: newName, client_phone: newPhone }, { where: legacyWhere, transaction: t });
    }

    // Finally update/re-create the client record with NEW ID
    if (newId !== id) {
        // We create a new client and delete the old one to effectively "change" the PK
        const clientData = { ...client.toJSON(), ...req.body, id: newId };
        await client.destroy({ transaction: t });
        const updatedClient = await Cliente.create(clientData, { transaction: t });
        await t.commit();
        res.json(updatedClient);
    } else {
        await client.update(req.body, { transaction: t });
        await t.commit();
        res.json(await Cliente.findByPk(id));
    }
  } catch (error) {
    if (t) await t.rollback();
    logger.error('Error updating client:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const client = await Cliente.findByPk(req.params.id);
    if (!client) return res.status(404).json({ error: 'Client not found' });
    await client.destroy();
    res.json({ message: 'Client deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;
