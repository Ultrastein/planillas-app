const db = require('better-sqlite3')('./database.sqlite');
const hash = '$2b$10$Cz4s/.0UKCdXirJhLW2jceC7qHcTlW/TNX0/9Rhnr11jascF1sV2y';
db.prepare('UPDATE users SET password_hash = ? WHERE email = ?').run(hash, 'admin@eduplan.com');
console.log(db.prepare('SELECT * FROM users').get());
