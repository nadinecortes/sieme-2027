const express = require('express');
const router = express.Router();
const { db } = require('../config/database');

// GET todas las alertas con filtros
router.get('/', (req, res) => {
  try {
    const { status, type, colony_id, limit = 50, offset = 0 } = req.query;

    let query = `
      SELECT 
        a.*,
        c.name as colony_name,
        m.name as municipality_name,
        u1.username as created_by_username,
        u2.username as resolved_by_username
      FROM alerts a
      LEFT JOIN colonies c ON a.colony_id = c.id
      LEFT JOIN municipalities m ON c.municipality_id = m.id
      LEFT JOIN users u1 ON a.created_by = u1.id
      LEFT JOIN users u2 ON a.resolved_by = u2.id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      query += ` AND a.status = ?`;
      params.push(status);
    }

    if (type) {
      query += ` AND a.type = ?`;
      params.push(type);
    }

    if (colony_id) {
      query += ` AND a.colony_id = ?`;
      params.push(colony_id);
    }

    query += ` ORDER BY a.created_at DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), parseInt(offset));

    const alerts = db.prepare(query).all(...params);

    const countQuery = `SELECT COUNT(*) as total FROM alerts WHERE 1=1${status ? ' AND status = ?' : ''}`;
    const { total } = db.prepare(countQuery).get(...(status ? [status] : []));

    res.json({
      data: alerts,
      total,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

  } catch (error) {
    console.error('Get alerts error:', error);
    res.status(500).json({
      error: 'Error al obtener alertas',
      message: error.message
    });
  }
});

// GET estadísticas de alertas
router.get('/stats', (req, res) => {
  try {
    const stats = db.prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
        SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) as resolved,
        SUM(CASE WHEN type = 'critical' THEN 1 ELSE 0 END) as critical,
        SUM(CASE WHEN type = 'warning' THEN 1 ELSE 0 END) as warning,
        SUM(CASE WHEN type = 'info' THEN 1 ELSE 0 END) as info
      FROM alerts
    `).get();

    res.json(stats);

  } catch (error) {
    console.error('Get alert stats error:', error);
    res.status(500).json({
      error: 'Error al obtener estadísticas',
      message: error.message
    });
  }
});

// POST crear alerta
router.post('/', (req, res) => {
  try {
    const { colony_id, type, title, message } = req.body;

    if (!type || !title || !message) {
      return res.status(400).json({
        error: 'Datos incompletos',
        message: 'Tipo, título y mensaje son requeridos'
      });
    }

    const now = Date.now();
    const result = db.prepare(`
      INSERT INTO alerts (colony_id, type, title, message, status, created_by, created_at)
      VALUES (?, ?, ?, ?, 'active', ?, ?)
    `).run(colony_id, type, title, message, req.user.id, now);

    const alert = db.prepare('SELECT * FROM alerts WHERE id = ?').get(result.lastInsertRowid);

    res.status(201).json(alert);

  } catch (error) {
    console.error('Create alert error:', error);
    res.status(500).json({
      error: 'Error al crear alerta',
      message: error.message
    });
  }
});

// PATCH actualizar estado de alerta
router.patch('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        error: 'Datos incompletos',
        message: 'Estado es requerido'
      });
    }

    const alert = db.prepare('SELECT * FROM alerts WHERE id = ?').get(id);

    if (!alert) {
      return res.status(404).json({
        error: 'No encontrado',
        message: 'Alerta no encontrada'
      });
    }

    const updates = { status };
    if (status === 'resolved') {
      updates.resolved_by = req.user.id;
      updates.resolved_at = Date.now();
    }

    const setClause = Object.keys(updates).map(key => `${key} = ?`).join(', ');
    const values = Object.values(updates);

    db.prepare(`UPDATE alerts SET ${setClause} WHERE id = ?`).run(...values, id);

    const updatedAlert = db.prepare('SELECT * FROM alerts WHERE id = ?').get(id);

    res.json(updatedAlert);

  } catch (error) {
    console.error('Update alert error:', error);
    res.status(500).json({
      error: 'Error al actualizar alerta',
      message: error.message
    });
  }
});

// DELETE eliminar alerta
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;

    const alert = db.prepare('SELECT * FROM alerts WHERE id = ?').get(id);

    if (!alert) {
      return res.status(404).json({
        error: 'No encontrado',
        message: 'Alerta no encontrada'
      });
    }

    db.prepare('DELETE FROM alerts WHERE id = ?').run(id);

    res.status(204).send();

  } catch (error) {
    console.error('Delete alert error:', error);
    res.status(500).json({
      error: 'Error al eliminar alerta',
      message: error.message
    });
  }
});

module.exports = router;
