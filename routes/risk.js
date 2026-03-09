const express = require('express');
const router = express.Router();
const { db } = require('../config/database');

// GET evaluaciones de riesgo
router.get('/', (req, res) => {
  try {
    const { colony_id, risk_level, limit = 100 } = req.query;

    let query = `
      SELECT 
        r.*,
        c.name as colony_name,
        m.name as municipality_name
      FROM risk_assessment r
      JOIN colonies c ON r.colony_id = c.id
      JOIN municipalities m ON c.municipality_id = m.id
      WHERE 1=1
    `;
    const params = [];

    if (colony_id) {
      query += ` AND r.colony_id = ?`;
      params.push(colony_id);
    }

    if (risk_level) {
      query += ` AND r.risk_level = ?`;
      params.push(risk_level);
    }

    query += ` ORDER BY r.date DESC, r.risk_score DESC LIMIT ?`;
    params.push(parseInt(limit));

    const data = db.prepare(query).all(...params);

    res.json({ data });

  } catch (error) {
    console.error('Get risk error:', error);
    res.status(500).json({
      error: 'Error al obtener evaluaciones de riesgo',
      message: error.message
    });
  }
});

module.exports = router;
