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
let fallbackAppointments = [];
let fallbackAppointmentId = 1;

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

    // Appointments table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS appointments (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255),
        user_email VARCHAR(100),
        patient_name VARCHAR(100),
        patient_email VARCHAR(100),
        patient_phone VARCHAR(50),
        reason TEXT,
        facility_name VARCHAR(100),
        facility_address TEXT,
        facility_phone VARCHAR(50),
        selected_date VARCHAR(20),
        selected_time VARCHAR(20),
        status VARCHAR(20) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
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

app.post('/api/appointments', async (req, res) => {
  const {
    userId, userEmail, patientName, patientEmail, patientPhone,
    reason, facilityName, facilityAddress, facilityPhone,
    selectedDate, selectedTime, status, createdAt
  } = req.body;

  if (!isDatabaseReady) {
    const created = {
      id: String(fallbackAppointmentId++),
      userId, userEmail, patientName, patientEmail, patientPhone,
      reason, facilityName, facilityAddress, facilityPhone,
      selectedDate, selectedTime, status: status || 'pending',
      createdAt: createdAt || new Date().toISOString()
    };
    fallbackAppointments.push(created);
    return res.json(created);
  }

  try {
    const result = await pool.query(`
      INSERT INTO appointments (
        user_id, user_email, patient_name, patient_email, patient_phone,
        reason, facility_name, facility_address, facility_phone,
        selected_date, selected_time, status, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING id, user_id as "userId", user_email as "userEmail", 
                patient_name as "patientName", patient_email as "patientEmail", 
                patient_phone as "patientPhone", reason, 
                facility_name as "facilityName", facility_address as "facilityAddress", 
                facility_phone as "facilityPhone", selected_date as "selectedDate", 
                selected_time as "selectedTime", status, created_at as "createdAt"
    `, [
      userId, userEmail, patientName, patientEmail, patientPhone,
      reason, facilityName, facilityAddress, facilityPhone,
      selectedDate, selectedTime, status || 'pending', createdAt || new Date().toISOString()
    ]);
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/appointments', async (req, res) => {
  if (!isDatabaseReady) {
    return res.json(fallbackAppointments);
  }

  try {
    const result = await pool.query(`
      SELECT id, user_id as "userId", user_email as "userEmail", 
             patient_name as "patientName", patient_email as "patientEmail", 
             patient_phone as "patientPhone", reason, 
             facility_name as "facilityName", facility_address as "facilityAddress", 
             facility_phone as "facilityPhone", selected_date as "selectedDate", 
             selected_time as "selectedTime", status, created_at as "createdAt",
             updated_at as "updatedAt"
      FROM appointments ORDER BY created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/appointments/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  
  if (!isDatabaseReady) {
    const index = fallbackAppointments.findIndex(a => String(a.id) === String(id));
    if (index >= 0) {
      fallbackAppointments[index].status = status;
      fallbackAppointments[index].updatedAt = new Date().toISOString();
      return res.json({ success: true });
    }
    return res.status(404).json({ error: 'Not found' });
  }

  try {
    await pool.query('UPDATE appointments SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [status, id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/appointments/:id', async (req, res) => {
  const { id } = req.params;
  if (!isDatabaseReady) {
    fallbackAppointments = fallbackAppointments.filter(a => String(a.id) !== String(id));
    return res.json({ success: true });
  }

  try {
    await pool.query('DELETE FROM appointments WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
