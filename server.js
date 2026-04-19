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
let fallbackFacilities = [];
let fallbackFacilityId = 1;

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

    // Add last_active_at column
    await pool.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMP;
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
    
    // Facilities table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS facilities (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        type VARCHAR(100),
        address TEXT,
        distance NUMERIC,
        rating NUMERIC,
        crowd_level VARCHAR(50),
        wait_time INTEGER,
        available_today BOOLEAN,
        next_available VARCHAR(100),
        capabilities JSONB,
        specialties JSONB,
        phone_number VARCHAR(100),
        operating_hours VARCHAR(255),
        emergency_services BOOLEAN,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    isDatabaseReady = true;
    console.log('Database initialized with role support');

    // Seed Facilities if empty
    const facilityCount = await pool.query('SELECT COUNT(*) FROM facilities');
    if (parseInt(facilityCount.rows[0].count) === 0) {
      const mockFacilities = [
        { name: 'Central Medical Hospital', type: 'Hospital', address: '123 Main Street, Downtown', distance: 2.3, rating: 4.5, crowdLevel: 'Moderate', waitTime: 25, availableToday: true, nextAvailable: 'Today at 2:00 PM', capabilities: ['Emergency Care', 'Surgery', 'Diagnostics', 'Pharmacy', 'Laboratory'], specialties: ['Cardiology', 'Neurology', 'Orthopedics', 'General Medicine', 'Pediatrics'], phoneNumber: '+1 (555) 123-4567', operatingHours: '24/7', emergencyServices: true },
        { name: 'QuickCare Urgent Care', type: 'Urgent Care', address: '456 Oak Avenue, Midtown', distance: 1.5, rating: 4.3, crowdLevel: 'Low', waitTime: 10, availableToday: true, nextAvailable: 'Now', capabilities: ['Minor Injuries', 'X-Ray', 'Laboratory', 'Vaccinations'], specialties: ['General Medicine', 'Minor Emergencies'], phoneNumber: '+1 (555) 234-5678', operatingHours: '8:00 AM - 10:00 PM', emergencyServices: false },
        { name: 'Wellness Family Clinic', type: 'Clinic', address: '789 Elm Street, Suburb', distance: 3.8, rating: 4.7, crowdLevel: 'Low', waitTime: 15, availableToday: true, nextAvailable: 'Today at 3:30 PM', capabilities: ['Consultation', 'Basic Diagnostics', 'Pharmacy'], specialties: ['Family Medicine', 'Pediatrics', 'Preventive Care'], phoneNumber: '+1 (555) 345-6789', operatingHours: '9:00 AM - 6:00 PM', emergencyServices: false },
        { name: 'Metro General Hospital', type: 'Hospital', address: '321 Park Boulevard, City Center', distance: 4.2, rating: 4.6, crowdLevel: 'High', waitTime: 45, availableToday: true, nextAvailable: 'Today at 5:00 PM', capabilities: ['Emergency Care', 'ICU', 'Surgery', 'Diagnostics', 'Pharmacy', 'Laboratory'], specialties: ['Cardiology', 'Oncology', 'General Surgery', 'Emergency Medicine', 'Internal Medicine'], phoneNumber: '+1 (555) 456-7890', operatingHours: '24/7', emergencyServices: true },
        { name: 'Riverside Medical Clinic', type: 'Clinic', address: '654 River Road, Riverside', distance: 5.1, rating: 4.2, crowdLevel: 'Moderate', waitTime: 20, availableToday: true, nextAvailable: 'Today at 4:15 PM', capabilities: ['Consultation', 'Laboratory', 'Pharmacy', 'Physical Therapy'], specialties: ['General Medicine', 'Physical Therapy', 'Dermatology'], phoneNumber: '+1 (555) 567-8901', operatingHours: '8:00 AM - 8:00 PM', emergencyServices: false },
        { name: 'Heart & Lung Specialized Center', type: 'Specialized Center', address: '987 Medical Plaza, Healthcare District', distance: 6.3, rating: 4.8, crowdLevel: 'Low', waitTime: 30, availableToday: false, nextAvailable: 'Tomorrow at 10:00 AM', capabilities: ['Advanced Diagnostics', 'Surgery', 'Specialized Treatment'], specialties: ['Cardiology', 'Pulmonology', 'Thoracic Surgery'], phoneNumber: '+1 (555) 678-9012', operatingHours: '7:00 AM - 7:00 PM', emergencyServices: false },
        { name: 'ExpressCare Walk-In Clinic', type: 'Urgent Care', address: '147 Commerce Street, Shopping District', distance: 2.9, rating: 4.1, crowdLevel: 'Low', waitTime: 8, availableToday: true, nextAvailable: 'Now', capabilities: ['Walk-In Consultation', 'Basic Laboratory', 'Prescriptions'], specialties: ['General Medicine', 'Travel Medicine'], phoneNumber: '+1 (555) 789-0123', operatingHours: '7:00 AM - 11:00 PM', emergencyServices: false },
        { name: 'St. Mary\'s Community Hospital', type: 'Hospital', address: '258 Chapel Lane, North Side', distance: 7.5, rating: 4.4, crowdLevel: 'Moderate', waitTime: 35, availableToday: true, nextAvailable: 'Today at 6:00 PM', capabilities: ['Emergency Care', 'Maternity', 'Surgery', 'Diagnostics', 'Laboratory'], specialties: ['Obstetrics', 'Gynecology', 'General Surgery', 'Pediatrics'], phoneNumber: '+1 (555) 890-1234', operatingHours: '24/7', emergencyServices: true }
      ];

      for (const f of mockFacilities) {
        await pool.query(`
          INSERT INTO facilities (
            name, type, address, distance, rating, crowd_level, wait_time,
            available_today, next_available, capabilities, specialties,
            phone_number, operating_hours, emergency_services
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        `, [
          f.name, f.type, f.address, f.distance, f.rating, f.crowdLevel, f.waitTime,
          f.availableToday, f.nextAvailable, JSON.stringify(f.capabilities), JSON.stringify(f.specialties),
          f.phoneNumber, f.operatingHours, f.emergencyServices
        ]);
      }
      console.log('Seeded database with 8 mock facilities.');
    }
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
    return res.json(fallbackUsers.map(u => ({ id: u.id, name: u.name, email: u.email, role: u.role || 'user', last_active_at: u.last_active_at })));
  }

  try {
    const result = await pool.query('SELECT id, name, email, role, last_active_at FROM users');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/users/:email/ping', async (req, res) => {
  const email = req.params.email;
  if (!isDatabaseReady) {
    const user = fallbackUsers.find(u => u.email === email);
    if (user) {
      user.last_active_at = new Date().toISOString();
    }
    return res.json({ success: true });
  }

  try {
    await pool.query('UPDATE users SET last_active_at = CURRENT_TIMESTAMP WHERE email = $1', [email]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/users/:email/logout', async (req, res) => {
  const email = req.params.email;
  if (!isDatabaseReady) {
    const user = fallbackUsers.find(u => u.email === email);
    if (user) {
      user.last_active_at = new Date(Date.now() - 10 * 60000).toISOString();
    }
    return res.json({ success: true });
  }

  try {
    await pool.query("UPDATE users SET last_active_at = CURRENT_TIMESTAMP - INTERVAL '10 minutes' WHERE email = $1", [email]);
    res.json({ success: true });
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

app.post('/api/facilities', async (req, res) => {
  const {
    name, type, address, distance = 1, rating = 4.5, crowdLevel = 'Low', 
    waitTime = 10, availableToday = true, nextAvailable = 'Now',
    capabilities = ['Consultation'], specialties = ['General Medicine'],
    phoneNumber = '', operatingHours = '8:00 AM - 5:00 PM', emergencyServices = false
  } = req.body;

  if (!isDatabaseReady) {
    const created = {
      id: String(fallbackFacilityId++),
      name, type, address, distance, rating, crowdLevel, waitTime,
      availableToday, nextAvailable, capabilities, specialties,
      phoneNumber, operatingHours, emergencyServices
    };
    fallbackFacilities.push(created);
    return res.json(created);
  }

  try {
    const result = await pool.query(`
      INSERT INTO facilities (
        name, type, address, distance, rating, crowd_level, wait_time,
        available_today, next_available, capabilities, specialties,
        phone_number, operating_hours, emergency_services
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING id, name, type, address, distance, rating, 
                crowd_level as "crowdLevel", wait_time as "waitTime", 
                available_today as "availableToday", next_available as "nextAvailable", 
                capabilities, specialties, phone_number as "phoneNumber", 
                operating_hours as "operatingHours", emergency_services as "emergencyServices"
    `, [
      name, type, address, distance, rating, crowdLevel, waitTime,
      availableToday, nextAvailable, JSON.stringify(capabilities), JSON.stringify(specialties),
      phoneNumber, operatingHours, emergencyServices
    ]);
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/facilities', async (req, res) => {
  if (!isDatabaseReady) {
    return res.json(fallbackFacilities);
  }

  try {
    const result = await pool.query(`
      SELECT id, name, type, address, distance, rating, 
             crowd_level as "crowdLevel", wait_time as "waitTime", 
             available_today as "availableToday", next_available as "nextAvailable", 
             capabilities, specialties, phone_number as "phoneNumber", 
             operating_hours as "operatingHours", emergency_services as "emergencyServices"
      FROM facilities ORDER BY created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/facilities/:id', async (req, res) => {
  const { id } = req.params;
  if (!isDatabaseReady) {
    fallbackFacilities = fallbackFacilities.filter(f => String(f.id) !== String(id));
    return res.json({ success: true });
  }

  try {
    await pool.query('DELETE FROM facilities WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
