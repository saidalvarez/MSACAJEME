"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const JWT_SECRET = process.env.JWT_SECRET || (() => {
    console.error('⚠️⚠️⚠️ [AUTH] JWT_SECRET no configurado — USANDO CLAVE INSEGURA. Configurar en .env para producción ⚠️⚠️⚠️');
    return 'dev_fallback_only';
})();
const verifyToken = (req, res, next) => {
    const token = req.headers['authorization'];
    if (!token)
        return res.status(403).json({ error: 'No token provided' });
    const cleanToken = token.startsWith('Bearer ') ? token.slice(7) : token;
    try {
        const verified = jsonwebtoken_1.default.verify(cleanToken, JWT_SECRET);
        req.user = verified;
        next();
    }
    catch (err) {
        return res.status(401).json({ error: 'Unauthorized token' });
    }
};
exports.verifyToken = verifyToken;
exports.default = exports.verifyToken;
