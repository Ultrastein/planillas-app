-- SQLite no requiere "CREATE DATABASE" o "USE". La base de datos es el archivo en sí.

-- 1. Create Users Table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('admin', 'titular', 'colaborador')),
  auth_provider TEXT NOT NULL DEFAULT 'local',
  last_access DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. Create Documents Table
CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  author_id TEXT NOT NULL,
  author_name TEXT NOT NULL,
  author_role TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  file_type TEXT NOT NULL CHECK(file_type IN ('pdf', 'word', 'gdoc', 'editor')),
  file_url TEXT,
  content TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'deleted')),
  delete_reason TEXT,
  curso TEXT,
  grado TEXT,
  anio TEXT,
  carga_horaria TEXT,
  tematica TEXT,
  num_clase TEXT,
  recursos TEXT,
  etiquetas TEXT,
  next_class_id TEXT,
  FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (next_class_id) REFERENCES documents(id) ON DELETE SET NULL
);

-- 3. Create Comments Table
CREATE TABLE IF NOT EXISTS comments (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL,
  author_id TEXT NOT NULL,
  author_name TEXT NOT NULL,
  text TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
  FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 4. Create Document Versions Table
CREATE TABLE IF NOT EXISTS document_versions (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL,
  author_id TEXT NOT NULL,
  author_name TEXT NOT NULL,
  content TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
  FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 5. Create Navigation Tabs Table
CREATE TABLE IF NOT EXISTS navigation_tabs (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  path TEXT NOT NULL DEFAULT '/editor',
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 6. Create Thematic Categories Table
CREATE TABLE IF NOT EXISTS thematic_categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Default inserts
INSERT OR IGNORE INTO thematic_categories (id, name) VALUES 
('cat-1', 'Manualidades'),
('cat-2', 'Proyecto Institucional'),
('cat-3', 'Programación y Robótica'),
('cat-4', 'Ciudadanía Digital'),
('cat-5', 'Cuidado Digital'),
('cat-6', 'Alfabetización');

-- Crear usuario administrador inicial
-- Password is '123456' hashed with bcrypt (cost 10)
INSERT OR IGNORE INTO users (id, email, password_hash, name, role) 
VALUES ('admin-uuid-1234', 'admin@eduplan.com', '$2b$10$G0x26k8wF.tI1k1jD9.P2emgKx1pC9gW6gP1dF8Y5k1gY5gG0k2Pq', 'Administrador', 'admin');
