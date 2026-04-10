import { getDb } from './db';

export const migrateFromLocalStorage = async () => {
  const isMigrated = localStorage.getItem('msa_migrated_to_sql');
  if (isMigrated === 'true') return;

  const db = await getDb();

  // 1. Migrar Clientes
  const rawClients = localStorage.getItem('clients');
  if (rawClients) {
    const clients = JSON.parse(rawClients);
    for (const client of clients) {
      await db.execute(
        'INSERT INTO clients (id, name, phone, email, notes, created_at) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT DO NOTHING',
        [client.id, client.name, client.phone, client.email, client.notes, client.registrationDate]
      );
    }
  }

  // 2. Migrar Inventario
  const rawInventory = localStorage.getItem('inventory');
  if (rawInventory) {
    const inventory = JSON.parse(rawInventory);
    for (const item of inventory) {
      await db.execute(
        'INSERT INTO inventory (id, brand, viscosity, type, stock, purchase_price, market_price, wholesale_price, image) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) ON CONFLICT DO NOTHING',
        [item.id, item.brand, item.viscosity, item.type, item.stock, item.purchasePrice, item.marketPrice, item.wholesalePrice, item.image]
      );
    }
  }

  // 3. Migrar Gastos
  const rawExpenses = localStorage.getItem('expenses');
  if (rawExpenses) {
    const expenses = JSON.parse(rawExpenses);
    for (const exp of expenses) {
      await db.execute(
        'INSERT INTO expenses (id, description, amount, date, type, is_archived) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT DO NOTHING',
        [exp.id, exp.description, exp.amount, exp.date, exp.type || 'expense', exp.isArchived ? true : false]
      );
    }
  }

  // 4. Migrar Tickets e Items
  const rawTickets = localStorage.getItem('tickets');
  if (rawTickets) {
    const tickets = JSON.parse(rawTickets);
    for (const ticket of tickets) {
      // Intentar encontrar el ID del cliente basado en el nombre (integridad retroactiva)
      let clientId = null;
      const rawClientsSearch = localStorage.getItem('clients');
      if (rawClientsSearch) {
          const clientsList = JSON.parse(rawClientsSearch);
          const found = clientsList.find((c: any) => c.name === ticket.clientName);
          if (found) clientId = found.id;
      }

      await db.execute(
        'INSERT INTO tickets (id, ticket_number, client_id, client_name, client_phone, client_email, vehicle, total, status, notes, is_archived, format_type, discount, date) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) ON CONFLICT DO NOTHING',
        [ticket.id, ticket.ticketNumber, clientId, ticket.clientName, ticket.clientPhone, ticket.clientEmail, ticket.vehicle, ticket.total, ticket.status, ticket.notes, ticket.isArchived ? true : false, ticket.formatType, ticket.discount, ticket.date]
      );

      if (ticket.items && Array.isArray(ticket.items)) {
        for (const item of ticket.items) {
          await db.execute(
            'INSERT INTO ticket_items (ticket_id, name, price, quantity, image) VALUES ($1, $2, $3, $4, $5)',
            [ticket.id, item.name, item.price, item.quantity, item.image]
          );
        }
      }
    }
  }

  // 5. Migrar Ventas Directas
  const rawSales = localStorage.getItem('sales');
  if (rawSales) {
    const sales = JSON.parse(rawSales);
    for (const sale of sales) {
      await db.execute(
        'INSERT INTO sales (id, sale_number, client_name, total, payment_method, date) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT DO NOTHING',
        [sale.id, sale.saleNumber, sale.clientName, sale.total, sale.paymentMethod, sale.date]
      );

      if (sale.items && Array.isArray(sale.items)) {
        for (const item of sale.items) {
          await db.execute(
            'INSERT INTO sale_items (sale_id, brand, viscosity, type, quantity, price) VALUES ($1, $2, $3, $4, $5, $6)',
            [sale.id, item.brand, item.viscosity, item.type, item.quantity, item.price]
          );
        }
      }
    }
  }

  localStorage.setItem('msa_migrated_to_sql', 'true');
  console.log('✅ Migración a PostgreSQL completada con éxito.');
};
