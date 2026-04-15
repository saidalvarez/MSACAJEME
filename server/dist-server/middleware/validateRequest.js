"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateRequest = void 0;
const zod_1 = require("zod");
const validateRequest = (schema) => {
    return async (req, res, next) => {
        try {
            await schema.parseAsync({
                body: req.body,
                query: req.query,
                params: req.params,
            });
            return next();
        }
        catch (error) {
            if (error instanceof zod_1.ZodError) {
                const issues = error.issues || error.errors || [];
                return res.status(400).json({
                    error: 'Error de validación de datos',
                    details: issues.map((e) => `${e.path?.join('.') || 'body'}: ${e.message}`)
                });
            }
            return res.status(500).json({ error: 'Error interno de validación' });
        }
    };
};
exports.validateRequest = validateRequest;
