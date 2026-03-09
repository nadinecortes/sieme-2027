const express = require('express');
const router = express.Router();
const { db } = require('../config/database');

// GET percepción
router.get('/', (req, res) => {
  try {
    const { colony_id, limit = 100 } = req.query;

    let query = `
      SELECT 
        p.*,
        c.name as colony_name,
        m.name as municipality_name
      FROM perception p
      JOIN colonies c ON p.colony_id = c.id
      JOIN municipalities m ON c.municipality_id = m.id
      WHERE 1=1
    `;
    const params = [];

    if (colony_id) {
      query += ` AND p.colony_id = ?`;
      params.push(colony_id);
    }

    query += ` ORDER BY p.date DESC LIMIT ?`;
    params.push(parseInt(limit));

    const data = db.prepare(query).all(...params);

    res.json({ data });

  } catch (error) {
    console.error('Get perception error:', error);
    res.status(500).json({
      error: 'Error al obtener percepción',
      message: error.message
    });
  }
});

module.exports = router;
