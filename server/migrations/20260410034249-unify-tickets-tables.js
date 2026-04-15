'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Add archived_at to tickets (outside transaction if needed, but usually fine)
    await queryInterface.addColumn('tickets', 'archived_at', {
      type: Sequelize.DATE,
      allowNull: true
    });

    // 2. Update status ENUM to include 'archived' and 'cancelled'
    // Postgres doesn't allow adding ENUM values in a transaction that uses them.
    if (queryInterface.sequelize.getDialect() === 'postgres') {
      try {
        await queryInterface.sequelize.query('ALTER TYPE "enum_tickets_status" ADD VALUE IF NOT EXISTS \'archived\';');
        await queryInterface.sequelize.query('ALTER TYPE "enum_tickets_status" ADD VALUE IF NOT EXISTS \'cancelled\';');
      } catch (e) {
        // Ignorar si ya existen o si falla el ALTER TYPE por estar en transacción implícita
        console.warn('Enum status update warning (likely already exists):', e.message);
      }
    }

    const transaction = await queryInterface.sequelize.transaction();
    try {
      // 3. Migrate data from historial_tickets to tickets
      await queryInterface.sequelize.query(`
        INSERT INTO tickets (
          id, ticket_number, client_id, client_name, client_phone, client_email, 
          vehicle, total, status, format_type, notes, discount, 
          date, service_photo, service_category, archived_at, created_at
        )
        SELECT 
          id, ticket_number, client_id, client_name, client_phone, client_email, 
          vehicle, total, 'archived' as status, format_type, notes, discount, 
          date, service_photo, service_category, archived_at,
          archived_at as created_at
        FROM historial_tickets
        ON CONFLICT (id) DO NOTHING;
      `, { transaction });

      // 4. Migrate data from historial_items to ticket_items
      await queryInterface.sequelize.query(`
        INSERT INTO ticket_items (
          ticket_id, inventory_id, name, price, quantity, purchase_price, image, created_at
        )
        SELECT 
          historial_ticket_id, inventory_id, name, price, quantity, purchase_price, image, NOW()
        FROM historial_items;
      `, { transaction });

      // 5. Drop old tables
      await queryInterface.dropTable('historial_items', { transaction });
      await queryInterface.dropTable('historial_tickets', { transaction });

      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  },

  async down(queryInterface, Sequelize) {
  }
};
