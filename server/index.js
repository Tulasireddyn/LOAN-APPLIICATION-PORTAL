const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const db = require('./db');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS for frontend requests
app.use(cors());
app.use(express.json());

// Auto-run migrations on startup
async function initDb() {
  try {
    const migrationPath = path.join(__dirname, '../migrations/001_init.sql');
    if (fs.existsSync(migrationPath)) {
      const sql = fs.readFileSync(migrationPath, 'utf8');
      await db.query(sql);
      console.log('Database migrations verified/applied successfully.');
    } else {
      console.warn('Migration file not found at:', migrationPath);
    }
  } catch (err) {
    console.error('Error initializing database tables:', err.message);
  }
}

// Validation helpers
const isValidMobile = (mobile) => {
  // Accepts numeric strings between 10 and 15 characters (e.g. +91 or standard numbers)
  const clean = mobile.replace(/[\s\-\+\(\)]/g, '');
  return /^\d{10,15}$/.test(clean);
};

const ALLOWED_LANGUAGES = ['Hindi', 'Tamil', 'Telugu', 'Marathi', 'English'];
const ALLOWED_STATUSES = ['pending', 'approved', 'rejected'];

// Route 1: POST /api/applications - Submit a new loan application
app.post('/api/applications', async (req, res) => {
  const { name, mobile, amount, purpose, language } = req.body;

  // Server-side validation
  const errors = [];

  if (!name || typeof name !== 'string' || name.trim() === '') {
    errors.push('Applicant name is required and must be a valid text.');
  }
  if (!mobile || typeof mobile !== 'string' || !isValidMobile(mobile)) {
    errors.push('Valid mobile number is required (10 to 15 digits).');
  }
  if (amount === undefined || amount === null || isNaN(Number(amount)) || Number(amount) <= 0) {
    errors.push('Loan amount (₹) is required and must be a positive number.');
  }
  if (!purpose || typeof purpose !== 'string' || purpose.trim() === '') {
    errors.push('Loan purpose is required.');
  }
  if (!language || !ALLOWED_LANGUAGES.includes(language)) {
    errors.push(`Preferred language must be one of: ${ALLOWED_LANGUAGES.join(', ')}.`);
  }

  if (errors.length > 0) {
    return res.status(400).json({ success: false, errors });
  }

  try {
    const queryText = `
      INSERT INTO applications (name, mobile, amount, purpose, language, status)
      VALUES ($1, $2, $3, $4, $5, 'pending')
      RETURNING *
    `;
    const values = [name.trim(), mobile.trim(), Number(amount), purpose.trim(), language];
    const result = await db.query(queryText, values);

    res.status(201).json({
      success: true,
      message: 'Application submitted successfully.',
      application: result.rows[0]
    });
  } catch (err) {
    console.error('Error creating application:', err.message);
    res.status(500).json({ success: false, error: 'Database error. Please try again later.' });
  }
});

// Route 2: GET /api/applications - Get all applications (latest first) with filter and search
app.get('/api/applications', async (req, res) => {
  const { status, search } = req.query;
  
  let queryText = 'SELECT * FROM applications';
  const queryParams = [];
  const clauses = [];

  // Filter by status
  if (status) {
    if (!ALLOWED_STATUSES.includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid status query filter.' });
    }
    queryParams.push(status);
    clauses.push(`status = $${queryParams.length}`);
  }

  // Basic Search by applicant name or mobile (Bonus)
  if (search && search.trim() !== '') {
    queryParams.push(`%${search.trim()}%`);
    clauses.push(`(name ILIKE $${queryParams.length} OR mobile ILIKE $${queryParams.length})`);
  }

  if (clauses.length > 0) {
    queryText += ' WHERE ' + clauses.join(' AND ');
  }

  // Ordered by latest first
  queryText += ' ORDER BY created_at DESC';

  try {
    const result = await db.query(queryText, queryParams);
    res.status(200).json({ success: true, count: result.rowCount, data: result.rows });
  } catch (err) {
    console.error('Error fetching applications:', err.message);
    res.status(500).json({ success: false, error: 'Database error. Please try again later.' });
  }
});

// Route 3: PATCH /api/applications/:id/status - Update application status (pending -> approved/rejected)
app.patch('/api/applications/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  // Validate status
  if (!status || !ALLOWED_STATUSES.includes(status)) {
    return res.status(400).json({
      success: false,
      error: `Invalid status. Must be one of: ${ALLOWED_STATUSES.join(', ')}.`
    });
  }

  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(id)) {
    return res.status(400).json({ success: false, error: 'Invalid application ID format (UUID required).' });
  }

  try {
    // Check if application exists
    const checkResult = await db.query('SELECT * FROM applications WHERE id = $1', [id]);
    if (checkResult.rowCount === 0) {
      return res.status(404).json({ success: false, error: 'Application not found.' });
    }

    const queryText = `
      UPDATE applications
      SET status = $1
      WHERE id = $2
      RETURNING *
    `;
    const result = await db.query(queryText, [status, id]);

    res.status(200).json({
      success: true,
      message: `Application status updated to ${status}.`,
      application: result.rows[0]
    });
  } catch (err) {
    console.error('Error updating status:', err.message);
    res.status(500).json({ success: false, error: 'Database error. Please try again later.' });
  }
});

// Route 4: GET /api/summary - Dashboard statistics
app.get('/api/summary', async (req, res) => {
  try {
    // Total applications & Total loan amount requested
    const summaryQuery = `
      SELECT 
        COUNT(*)::INTEGER as "totalApplications",
        COALESCE(SUM(amount), 0)::NUMERIC(15, 2) as "totalAmount"
      FROM applications
    `;
    const summaryResult = await db.query(summaryQuery);
    const summary = summaryResult.rows[0];

    // Count per status
    const statusQuery = `
      SELECT 
        status, 
        COUNT(*)::INTEGER as count 
      FROM applications 
      GROUP BY status
    `;
    const statusResult = await db.query(statusQuery);
    
    // Format counts per status
    const statusCounts = {
      pending: 0,
      approved: 0,
      rejected: 0
    };

    statusResult.rows.forEach(row => {
      if (statusCounts.hasOwnProperty(row.status)) {
        statusCounts[row.status] = row.count;
      }
    });

    res.status(200).json({
      success: true,
      summary: {
        totalApplications: summary.totalApplications,
        totalAmount: parseFloat(summary.totalAmount),
        statusCounts
      }
    });
  } catch (err) {
    console.error('Error fetching summary stats:', err.message);
    res.status(500).json({ success: false, error: 'Database error. Please try again later.' });
  }
});

// Root check endpoint
app.get('/', (req, res) => {
  res.json({ message: 'Vitto Loan Application API is running.' });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date() });
});

// Start Express server and initialize DB connection
app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  await initDb();
});
