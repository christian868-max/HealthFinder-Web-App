import express from 'express';
import cors from 'cors';
import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD || 'postgres',
  host: process.env.PGHOST || 'localhost',
  port: process.env.PGPORT || 5432,
  database: process.env.PGDATABASE || 'healthfinder',
});

let isDatabaseReady = false;
let fallbackUsers = [];
let fallbackUserId = 1;

// Initialize DB
const initDB = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(100) NOT NULL
      );
    `);
    
    // Add role column for existing databases that don't have it
    await pool.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'user';
    `);
    
    isDatabaseReady = true;
    console.log('Database initialized with role support');
  } catch (err) {
    isDatabaseReady = false;
    console.error('Error initializing database:', err);
    console.warn('Falling back to in-memory user storage until PostgreSQL is available.');
  }
};
initDB();

app.post('/api/signup', async (req, res) => {
  const { name, email, password, role = 'user' } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password are required' });
  }

  if (!isDatabaseReady) {
    const existingUser = fallbackUsers.find((user) => user.email === email);
    if (existingUser) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    const createdUser = {
      id: fallbackUserId++,
      name,
      email,
      password,
      role,
    };
    fallbackUsers.push(createdUser);

    return res.json({
      id: createdUser.id,
      name: createdUser.name,
      email: createdUser.email,
      role: createdUser.role,
    });
  }

  try {
    const result = await pool.query(
      'INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role',
      [name, email, password, role]
    );
    res.json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(400).json({ error: 'Email already exists' });
    }
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/signin', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  if (!isDatabaseReady) {
    const foundUser = fallbackUsers.find((user) => user.email === email && user.password === password);
    if (!foundUser) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    return res.json({
      id: foundUser.id,
      name: foundUser.name,
      email: foundUser.email,
      role: foundUser.role || 'user',
    });
  }

  try {
    const result = await pool.query(
      'SELECT id, name, email, role FROM users WHERE email = $1 AND password = $2',
      [email, password]
    );
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/users', async (req, res) => {
  if (!isDatabaseReady) {
    return res.json(fallbackUsers.map(u => ({ id: u.id, name: u.name, email: u.email, role: u.role || 'user' })));
  }

  try {
    const result = await pool.query('SELECT id, name, email, role FROM users');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/check-admin', async (req, res) => {
  if (!isDatabaseReady) {
    const hasAdmin = fallbackUsers.some(u => u.role === 'admin');
    return res.json({ hasAdmin });
  }

  try {
    const result = await pool.query("SELECT 1 FROM users WHERE role = 'admin' LIMIT 1");
    res.json({ hasAdmin: result.rows.length > 0 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/users/:email', async (req, res) => {
  const email = req.params.email;
  if (!isDatabaseReady) {
    fallbackUsers = fallbackUsers.filter(u => u.email !== email);
    return res.json({ success: true });
  }

  try {
    await pool.query('DELETE FROM users WHERE email = $1', [email]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
