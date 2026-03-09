const express = require('express');
const cors = require('cors');
const path = require('path');
const { initializeDatabase, seedDatabase } = require('./config/database');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize database before starting server
async function startServer() {
  try {
    await initializeDatabase();
    console.log('Database initialized');
    
    // Seed database with sample data
    await seedDatabase();
    
    // Routes
    app.use('/api/auth', require('./routes/auth'));
    app.use('/api/courses', require('./routes/courses'));
    app.use('/api/enrollments', require('./routes/enrollments'));
    app.use('/api/progress', require('./routes/progress'));

    // Health check
    app.get('/api/health', (req, res) => {
      res.json({ status: 'OK', message: 'LMS API is running' });
    });

    // Serve static files in production
    if (process.env.NODE_ENV === 'production') {
      app.use(express.static(path.join(__dirname, '../client/dist')));
      
      app.get('*', (req, res) => {
        res.sendFile(path.join(__dirname, '../client/dist/index.html'));
      });
    }

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`API available at http://localhost:${PORT}/api`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
