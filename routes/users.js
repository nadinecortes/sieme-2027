const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { db } = require('../config/database');
const { requireRole } = require('../middleware/auth');

// GET todos los usuarios (solo admin)
router.get('/', requireRole('admin'), (req, res) => {
  try {
    const users = db.prepare(`
      SELECT id, username, role, email, is_active, created_at, updated_at
      FROM users
      ORDER BY created_at DESC
    `).all();

    res.json(users);

  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      error: 'Error al obtener usuarios',
      message: error.message
    });
  }
});

// PATCH actualizar usuario (solo admin)
router.patch('/:id', requireRole('admin'), (req, res) => {
  try {
    const { id } = req.params;
    const { role, is_active, email } = req.body;

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);

    if (!user) {
      return res.status(404).json({
        error: 'No encontrado',
        message: 'Usuario no encontrado'
      });
    }

    const updates = {};
    if (role) updates.role = role;
    if (typeof is_active !== 'undefined') updates.is_active = is_active ? 1 : 0;
    if (email) updates.email = email;
    updates.updated_at = Date.now();

    const setClause = Object.keys(updates).map(key => `${key} = ?`).join(', ');
    const values = Object.values(updates);

    db.prepare(`UPDATE users SET ${setClause} WHERE id = ?`).run(...values, id);

    const updatedUser = db.prepare(`
      SELECT id, username, role, email, is_active, created_at, updated_at
      FROM users WHERE id = ?
    `).get(id);

    res.json(updatedUser);

  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      error: 'Error al actualizar usuario',
      message: error.message
    });
  }
});

// DELETE usuario (solo admin)
router.delete('/:id', requireRole('admin'), (req, res) => {
  try {
    const { id } = req.params;

    if (parseInt(id) === req.user.id) {
      return res.status(400).json({
        error: 'Operación no permitida',
        message: 'No puedes eliminar tu propia cuenta'
      });
    }

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);

    if (!user) {
      return res.status(404).json({
        error: 'No encontrado',
        message: 'Usuario no encontrado'
      });
    }

    db.prepare('DELETE FROM users WHERE id = ?').run(id);
    db.prepare('DELETE FROM sessions WHERE user_id = ?').run(id);

    res.status(204).send();

  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      error: 'Error al eliminar usuario',
      message: error.message
    });
  }
});

module.exports = router;
