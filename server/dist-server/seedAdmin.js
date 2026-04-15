"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const models_1 = require("./models");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
/**
 * Seeds initial admin users ONLY if they don't already exist.
 * New users are flagged to force a password change on first login.
 */
const seedAdmin = async () => {
    try {
        const usersToSeed = ['admin', 'administrador'];
        const defaultPassword = '1234';
        const hashedPassword = await bcryptjs_1.default.hash(defaultPassword, 12);
        for (const username of usersToSeed) {
            const user = await models_1.Usuario.findOne({ where: { username } });
            if (!user) {
                await models_1.Usuario.create({
                    username,
                    password: hashedPassword,
                    role: 'admin',
                    force_password_change: true
                });
                console.log(`[SEED] Usuario "${username}" creado con contraseña temporal. Cambiar al primer inicio.`);
            }
            else {
                console.log(`[SEED] Usuario "${username}" ya existe — no se modificó.`);
            }
        }
    }
    catch (error) {
        console.error('[SEED] Error al poblar administrador inicial:', error);
    }
};
exports.default = seedAdmin;
