require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const path = require('path');
const { db, createTables, cleanExpiredSessions } = require('./config/database');

const app = express();
const PORT = process.env.PORT || 3000;

// ========== MIDDLEWARE ==========

// Security
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));

// CORS
const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  credentials: true
};
app.use(cors(corsOptions));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: 'Demasiadas peticiones desde esta IP, intenta de nuevo más tarde'
});
app.use('/api/', limiter);

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Compression
app.use(compression());

// Logging
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined'));
}

// Static files
app.use(express.static(path.join(__dirname, 'static')));

// ========== API ROUTES ==========

// Health check
app.get('/api/health', (req, res) => {
  try {
    db.prepare('SELECT 1').get();
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: 'connected',
      version: '2.0.0'
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Database connection failed',
      timestamp: new Date().toISOString()
    });
  }
});

// Authentication
const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);

// Protected routes
const authMiddleware = require('./middleware/auth');

const municipalityRoutes = require('./routes/municipalities');
app.use('/api/municipalities', authMiddleware, municipalityRoutes);

const colonyRoutes = require('./routes/colonies');
app.use('/api/colonies', authMiddleware, colonyRoutes);

const voteRoutes = require('./routes/vote-intention');
app.use('/api/vote-intention', authMiddleware, voteRoutes);

const welfareRoutes = require('./routes/welfare');
app.use('/api/welfare', authMiddleware, welfareRoutes);

const perceptionRoutes = require('./routes/perception');
app.use('/api/perception', authMiddleware, perceptionRoutes);

const riskRoutes = require('./routes/risk');
app.use('/api/risk', authMiddleware, riskRoutes);

const alertRoutes = require('./routes/alerts');
app.use('/api/alerts', authMiddleware, alertRoutes);

const dashboardRoutes = require('./routes/dashboard');
app.use('/api/dashboard', authMiddleware, dashboardRoutes);

const userRoutes = require('./routes/users');
app.use('/api/users', authMiddleware, userRoutes);

// ========== ERROR HANDLING ==========

// 404 handler para API
app.use('/api/*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint no encontrado',
    path: req.originalUrl
  });
});

// Frontend SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  res.status(err.status || 500).json({
    error: err.message || 'Error interno del servidor',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// ========== INITIALIZATION ==========

const initializeApp = () => {
  try {
    console.log('🚀 Iniciando SIEME 2027...');
    
    createTables();
    console.log('✅ Base de datos verificada');
    
    cleanExpiredSessions();
    console.log('✅ Sesiones limpiadas');
    
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`\n🎉 SIEME 2027 corriendo en puerto ${PORT}`);
      console.log(`📊 API disponible en /api`);
      console.log(`🏥 Health check en /api/health`);
      console.log(`\n⚙️  Entorno: ${process.env.NODE_ENV || 'development'}`);
      console.log('\n✨ Sistema listo para usar!\n');
    });
    
  } catch (error) {
    console.error('❌ Error al inicializar:', error);
    process.exit(1);
  }
};

process.on('SIGINT', () => {
  console.log('\n👋 Cerrando servidor...');
  db.close();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n👋 Cerrando servidor...');
  db.close();
  process.exit(0);
});

initializeApp();

module.exports = app;
