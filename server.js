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
    isDatabaseReady = true;
    console.log('Database initialized');
  } catch (err) {
    isDatabaseReady = false;
    console.error('Error initializing database:', err);
    console.warn('Falling back to in-memory user storage until PostgreSQL is available.');
  }
};
initDB();

app.post('/api/signup', async (req, res) => {
  const { name, email, password } = req.body;
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
    };
    fallbackUsers.push(createdUser);

    return res.json({
      id: createdUser.id,
      name: createdUser.name,
      email: createdUser.email,
    });
  }

  try {
    const result = await pool.query(
      'INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING id, name, email',
      [name, email, password]
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
    });
  }

  try {
    const result = await pool.query(
      'SELECT id, name, email FROM users WHERE email = $1 AND password = $2',
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

const PORT = 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
