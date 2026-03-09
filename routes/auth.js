const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db } = require('../config/database');

// Login
router.post('/login', (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        error: 'Datos incompletos',
        message: 'Usuario y contraseña son requeridos'
      });
    }

    const user = db.prepare('SELECT * FROM users WHERE username = ? AND is_active = 1').get(username);

    if (!user) {
      return res.status(401).json({
        error: 'Credenciales inválidas',
        message: 'Usuario o contraseña incorrectos'
      });
    }

    const validPassword = bcrypt.compareSync(password, user.password);

    if (!validPassword) {
      return res.status(401).json({
        error: 'Credenciales inválidas',
        message: 'Usuario o contraseña incorrectos'
      });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    const expiresIn = 24 * 60 * 60 * 1000;
    const expiresAt = Date.now() + expiresIn;

    db.prepare('INSERT INTO sessions (user_id, token, expires_at, created_at) VALUES (?, ?, ?, ?)')
      .run(user.id, token, expiresAt, Date.now());

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        email: user.email
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      error: 'Error en el login',
      message: error.message
    });
  }
});

// Register
router.post('/register', (req, res) => {
  try {
    const { username, password, email, role } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        error: 'Datos incompletos',
        message: 'Usuario y contraseña son requeridos'
      });
    }

    const existingUser = db.prepare('SELECT id FROM users WHERE username = ?').get(username);

    if (existingUser) {
      return res.status(409).json({
        error: 'Conflicto',
        message: 'El usuario ya existe'
      });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);
    const now = Date.now();

    const result = db.prepare(`
      INSERT INTO users (username, password, role, email, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(username, hashedPassword, role || 'viewer', email, now, now);

    res.status(201).json({
      message: 'Usuario creado exitosamente',
      user: {
        id: result.lastInsertRowid,
        username,
        role: role || 'viewer',
        email
      }
    });

  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({
      error: 'Error en el registro',
      message: error.message
    });
  }
});

// Logout
router.post('/logout', (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader) {
      const token = authHeader.split(' ')[1];
      db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
    }

    res.json({ message: 'Logout exitoso' });

  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      error: 'Error en el logout',
      message: error.message
    });
  }
});

// Verify token
router.get('/verify', (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({ valid: false });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const session = db.prepare('SELECT * FROM sessions WHERE token = ? AND expires_at > ?')
      .get(token, Date.now());

    if (!session) {
      return res.status(401).json({ valid: false });
    }

    res.json({
      valid: true,
      user: {
        id: decoded.id,
        username: decoded.username,
        role: decoded.role
      }
    });

  } catch (error) {
    res.status(401).json({ valid: false });
  }
});

module.exports = router;
