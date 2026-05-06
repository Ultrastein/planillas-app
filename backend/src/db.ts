import Database from 'better-sqlite3';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config();

const dbPath = path.resolve(__dirname, '../database.sqlite');
export const db = new Database(dbPath, { verbose: console.log });

export async function testConnection() {
    try {
        // En SQLite la conexión es síncrona y ya está abierta, 
        // pero podemos probar hacer una consulta básica.
        const stmt = db.prepare('SELECT sqlite_version() AS version');
        const row = stmt.get();
        console.log('Successfully connected to SQLite database.', row);
        
        // Inicializar la base de datos si está vacía
        initializeDatabase();
    } catch (error) {
        console.error('Error connecting to SQLite database:', error);
    }
}

function initializeDatabase() {
    try {
        // Comprobar si la tabla de usuarios existe
        const tableCheck = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='users'").get();
        
        if (!tableCheck) {
            console.log('Base de datos vacía. Inicializando desde database.sql...');
            const sqlPath = path.resolve(__dirname, '../database.sql');
            const sqlFile = fs.readFileSync(sqlPath, 'utf-8');
            db.exec(sqlFile);
            console.log('Base de datos inicializada correctamente.');
        } else {
            console.log('La base de datos ya contiene tablas.');
        }
    } catch (error) {
        console.error('Error al inicializar la base de datos:', error);
    }
}
