import { Router } from 'express';
import { db } from '../db';

const router = Router();

router.get('/', (req, res) => {
    try {
        const stmt = db.prepare('SELECT * FROM navigation_tabs ORDER BY order_index ASC');
        const rows = stmt.all();
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener tabs' });
    }
});

export default router;
