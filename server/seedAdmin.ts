import { Usuario } from './models';
import bcrypt from 'bcryptjs';

/**
 * Seeds initial admin users ONLY if they don't already exist.
 * New users are flagged to force a password change on first login.
 */
const seedAdmin = async () => {
  try {
    const usersToSeed = ['admin', 'administrador'];
    const defaultPassword = '1234';
    const hashedPassword = await bcrypt.hash(defaultPassword, 12);

    for (const username of usersToSeed) {
      const user = await Usuario.findOne({ where: { username } });
      if (!user) {
        await Usuario.create({
          username,
          password: hashedPassword,
          role: 'admin',
          force_password_change: true
        });
        console.log(`[SEED] Usuario "${username}" creado con contraseña temporal. Cambiar al primer inicio.`);
      } else {
        console.log(`[SEED] Usuario "${username}" ya existe — no se modificó.`);
      }
    }
  } catch (error) {
    console.error('[SEED] Error al poblar administrador inicial:', error);
  }
};

export default seedAdmin;

