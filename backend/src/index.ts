import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { testConnection } from './db';
import authRoutes from './routes/auth';
import tabsRoutes from './routes/tabs';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/tabs', tabsRoutes);
// app.use('/api/documents', documentRoutes);
// app.use('/api/users', userRoutes);
// app.use('/api/categories', categoryRoutes);

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Backend is running' });
});

app.listen(port, async () => {
    console.log(`Server running on port ${port}`);
    await testConnection();
});
