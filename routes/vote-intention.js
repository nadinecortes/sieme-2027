const express = require('express');
const router = express.Router();
const { db } = require('../config/database');

// GET intención de voto
router.get('/', (req, res) => {
  try {
    const { colony_id, date, limit = 100 } = req.query;

    let query = `
      SELECT 
        v.*,
        c.name as colony_name,
        m.name as municipality_name
      FROM vote_intention v
      JOIN colonies c ON v.colony_id = c.id
      JOIN municipalities m ON c.municipality_id = m.id
      WHERE 1=1
    `;
    const params = [];

    if (colony_id) {
      query += ` AND v.colony_id = ?`;
      params.push(colony_id);
    }

    if (date) {
      query += ` AND v.date = ?`;
      params.push(date);
    }

    query += ` ORDER BY v.date DESC, c.name LIMIT ?`;
    params.push(parseInt(limit));

    const data = db.prepare(query).all(...params);

    res.json({ data });

  } catch (error) {
    console.error('Get vote intention error:', error);
    res.status(500).json({
      error: 'Error al obtener intención de voto',
      message: error.message
    });
  }
});

module.exports = router;
