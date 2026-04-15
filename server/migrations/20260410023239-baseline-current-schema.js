'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Usuarios
    await queryInterface.createTable('usuarios', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      username: { type: Sequelize.STRING, allowNull: false, unique: true },
      password: { type: Sequelize.STRING, allowNull: true },
      role: { type: Sequelize.ENUM('admin', 'recepcion', 'mecanico'), defaultValue: 'admin' },
      force_password_change: { type: Sequelize.BOOLEAN, defaultValue: false },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false }
    });

    // 2. Clientes
    await queryInterface.createTable('clientes', {
      id: { type: Sequelize.STRING, primaryKey: true },
      name: { type: Sequelize.STRING, allowNull: false },
      phone: { type: Sequelize.STRING, allowNull: true },
      email: { type: Sequelize.STRING, allowNull: true },
      address: { type: Sequelize.STRING, allowNull: true },
      notes: { type: Sequelize.TEXT, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false }
    });

    // 3. Inventory
    await queryInterface.createTable('inventory', {
      id: { type: Sequelize.STRING, primaryKey: true },
      brand: { type: Sequelize.STRING, allowNull: false },
      type: { type: Sequelize.STRING, allowNull: false },
      viscosity: { type: Sequelize.STRING, allowNull: true },
      category: { type: Sequelize.STRING, allowNull: true },
      initial_stock: { type: Sequelize.INTEGER, allowNull: false },
      current_stock: { type: Sequelize.INTEGER, allowNull: false },
      purchase_number: { type: Sequelize.STRING, allowNull: true },
      image: { type: Sequelize.TEXT, allowNull: true },
      purchase_price: { type: Sequelize.DECIMAL(15, 2), allowNull: true },
      market_price: { type: Sequelize.DECIMAL(15, 2), allowNull: true },
      wholesale_price: { type: Sequelize.DECIMAL(15, 2), allowNull: true },
      barcode: { type: Sequelize.STRING, allowNull: true },
      min_stock: { type: Sequelize.INTEGER, allowNull: true },
      date: { type: Sequelize.DATE, allowNull: false },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false }
    });

    // 4. Tickets
    await queryInterface.createTable('tickets', {
      id: { type: Sequelize.STRING, primaryKey: true },
      ticket_number: { type: Sequelize.INTEGER, allowNull: false },
      client_id: { type: Sequelize.STRING, allowNull: true },
      client_name: { type: Sequelize.STRING, allowNull: false },
      client_phone: { type: Sequelize.STRING, allowNull: true },
      client_email: { type: Sequelize.STRING, allowNull: true },
      vehicle: { type: Sequelize.STRING, allowNull: true },
      total: { type: Sequelize.DECIMAL(15, 2), allowNull: false },
      status: { type: Sequelize.STRING, defaultValue: 'pending' },
      format_type: { type: Sequelize.STRING, defaultValue: 'basic' },
      notes: { type: Sequelize.TEXT, allowNull: true },
      discount: { type: Sequelize.DECIMAL(15, 2), defaultValue: 0 },
      is_archived: { type: Sequelize.BOOLEAN, defaultValue: false },
      date: { type: Sequelize.DATE, allowNull: false },
      service_photo: { type: Sequelize.TEXT, allowNull: true },
      service_category: { type: Sequelize.STRING, defaultValue: 'general' },
      deleted_at: { type: Sequelize.DATE, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false }
    });

    // 5. Ticket Items
    await queryInterface.createTable('ticket_items', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      ticket_id: { type: Sequelize.STRING, allowNull: false },
      inventory_id: { type: Sequelize.STRING, allowNull: true },
      name: { type: Sequelize.STRING, allowNull: false },
      price: { type: Sequelize.DECIMAL(15, 2), allowNull: false },
      quantity: { type: Sequelize.INTEGER, allowNull: false },
      purchase_price: { type: Sequelize.DECIMAL(15, 2), allowNull: true },
      image: { type: Sequelize.TEXT, allowNull: true },
      deleted_at: { type: Sequelize.DATE, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false }
    });

    // 6. Historial Tickets
    await queryInterface.createTable('historial_tickets', {
      id: { type: Sequelize.STRING, primaryKey: true },
      ticket_number: { type: Sequelize.INTEGER, allowNull: false },
      client_id: { type: Sequelize.STRING, allowNull: true },
      client_name: { type: Sequelize.STRING, allowNull: false },
      client_phone: { type: Sequelize.STRING, allowNull: true },
      client_email: { type: Sequelize.STRING, allowNull: true },
      vehicle: { type: Sequelize.STRING, allowNull: true },
      total: { type: Sequelize.DECIMAL(15, 2), allowNull: false },
      status: { type: Sequelize.STRING, defaultValue: 'completed' },
      format_type: { type: Sequelize.STRING, defaultValue: 'basic' },
      notes: { type: Sequelize.TEXT, allowNull: true },
      discount: { type: Sequelize.DECIMAL(15, 2), defaultValue: 0 },
      date: { type: Sequelize.DATE, allowNull: false },
      service_photo: { type: Sequelize.TEXT, allowNull: true },
      service_category: { type: Sequelize.STRING, defaultValue: 'general' },
      archived_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW }
    });

    // 7. Historial Items
    await queryInterface.createTable('historial_items', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      historial_ticket_id: { type: Sequelize.STRING, allowNull: false },
      inventory_id: { type: Sequelize.STRING, allowNull: true },
      name: { type: Sequelize.STRING, allowNull: false },
      price: { type: Sequelize.DECIMAL(15, 2), allowNull: false },
      quantity: { type: Sequelize.INTEGER, allowNull: false },
      purchase_price: { type: Sequelize.DECIMAL(15, 2), allowNull: true },
      image: { type: Sequelize.TEXT, allowNull: true }
    });

    // 8. Sales
    await queryInterface.createTable('sales', {
      id: { type: Sequelize.STRING, primaryKey: true },
      client_id: { type: Sequelize.STRING, allowNull: true },
      client_name: { type: Sequelize.STRING, allowNull: false },
      client_phone: { type: Sequelize.STRING, allowNull: true },
      total: { type: Sequelize.DECIMAL(15, 2), allowNull: false },
      status: { type: Sequelize.STRING, defaultValue: 'completed' },
      date: { type: Sequelize.DATE, allowNull: false },
      is_archived: { type: Sequelize.BOOLEAN, defaultValue: false },
      deleted_at: { type: Sequelize.DATE, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false }
    });

    // 9. Sale Items
    await queryInterface.createTable('sale_items', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      sale_id: { type: Sequelize.STRING, allowNull: false },
      inventory_id: { type: Sequelize.STRING, allowNull: true },
      name: { type: Sequelize.STRING, allowNull: true },
      brand: { type: Sequelize.STRING, allowNull: true },
      type: { type: Sequelize.STRING, allowNull: true },
      viscosity: { type: Sequelize.STRING, allowNull: true },
      barcode: { type: Sequelize.STRING, allowNull: true },
      price: { type: Sequelize.DECIMAL(15, 2), allowNull: false },
      quantity: { type: Sequelize.INTEGER, allowNull: false },
      image: { type: Sequelize.TEXT, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false }
    });

    // 10. Expenses
    await queryInterface.createTable('expenses', {
      id: { type: Sequelize.STRING, primaryKey: true },
      description: { type: Sequelize.STRING, allowNull: false },
      amount: { type: Sequelize.DECIMAL(15, 2), allowNull: false },
      date: { type: Sequelize.DATE, allowNull: false },
      type: { type: Sequelize.STRING, defaultValue: 'expense' },
      payment_method: { type: Sequelize.STRING, allowNull: true },
      is_archived: { type: Sequelize.BOOLEAN, defaultValue: false },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false }
    });

    // 11. Audit Logs
    await queryInterface.createTable('audit_logs', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      action: { type: Sequelize.STRING, allowNull: false },
      entity: { type: Sequelize.STRING, allowNull: false },
      entity_id: { type: Sequelize.STRING, allowNull: true },
      user_id: { type: Sequelize.STRING, allowNull: true },
      details: { type: Sequelize.TEXT, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false }
    });

    // 12. Item Catalogo
    await queryInterface.createTable('item_catalogo', {
      id: { type: Sequelize.STRING, primaryKey: true },
      brand: { type: Sequelize.STRING, allowNull: false },
      viscosity: { type: Sequelize.STRING, allowNull: true },
      type: { type: Sequelize.STRING, allowNull: false },
      image: { type: Sequelize.TEXT, allowNull: true },
      market_price: { type: Sequelize.DECIMAL(15, 2), allowNull: true },
      category: { type: Sequelize.STRING, allowNull: true },
      barcode: { type: Sequelize.STRING, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false }
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('item_catalogo');
    await queryInterface.dropTable('audit_logs');
    await queryInterface.dropTable('expenses');
    await queryInterface.dropTable('sale_items');
    await queryInterface.dropTable('sales');
    await queryInterface.dropTable('historial_items');
    await queryInterface.dropTable('historial_tickets');
    await queryInterface.dropTable('ticket_items');
    await queryInterface.dropTable('tickets');
    await queryInterface.dropTable('inventory');
    await queryInterface.dropTable('clientes');
    await queryInterface.dropTable('usuarios');
    // Drop the ENUM type as well if using Postgres
    if (queryInterface.sequelize.getDialect() === 'postgres') {
      await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_usuarios_role";');
    }
  }
};
