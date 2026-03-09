const express = require('express');
const router = express.Router();
const { db } = require('../config/database');

// GET beneficiarios de bienestar
router.get('/', (req, res) => {
  try {
    const { colony_id, program_name, limit = 100 } = req.query;

    let query = `
      SELECT 
        w.*,
        c.name as colony_name,
        m.name as municipality_name
      FROM welfare_beneficiaries w
      JOIN colonies c ON w.colony_id = c.id
      JOIN municipalities m ON c.municipality_id = m.id
      WHERE 1=1
    `;
    const params = [];

    if (colony_id) {
      query += ` AND w.colony_id = ?`;
      params.push(colony_id);
    }

    if (program_name) {
      query += ` AND w.program_name LIKE ?`;
      params.push(`%${program_name}%`);
    }

    query += ` ORDER BY w.date DESC LIMIT ?`;
    params.push(parseInt(limit));

    const data = db.prepare(query).all(...params);

    res.json({ data });

  } catch (error) {
    console.error('Get welfare error:', error);
    res.status(500).json({
      error: 'Error al obtener beneficiarios',
      message: error.message
    });
  }
});

module.exports = router;
