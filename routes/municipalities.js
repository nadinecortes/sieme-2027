const express = require('express');
const router = express.Router();
const { db } = require('../config/database');

// GET todos los municipios
router.get('/', (req, res) => {
  try {
    const municipalities = db.prepare(`
      SELECT 
        m.*,
        COUNT(DISTINCT c.id) as colonies_count,
        SUM(c.population) as total_population
      FROM municipalities m
      LEFT JOIN colonies c ON m.id = c.municipality_id
      GROUP BY m.id
      ORDER BY m.name
    `).all();

    res.json(municipalities);

  } catch (error) {
    console.error('Get municipalities error:', error);
    res.status(500).json({
      error: 'Error al obtener municipios',
      message: error.message
    });
  }
});

// GET municipio por ID con estadísticas
router.get('/:id', (req, res) => {
  try {
    const { id } = req.params;

    const municipality = db.prepare('SELECT * FROM municipalities WHERE id = ?').get(id);

    if (!municipality) {
      return res.status(404).json({
        error: 'No encontrado',
        message: 'Municipio no encontrado'
      });
    }

    const stats = db.prepare(`
      SELECT 
        COUNT(DISTINCT c.id) as colonies_count,
        SUM(c.population) as total_population,
        AVG(v.mc_percentage) as avg_mc_intention,
        AVG(v.morena_percentage) as avg_morena_intention
      FROM colonies c
      LEFT JOIN vote_intention v ON c.id = v.colony_id 
        AND v.date = (SELECT MAX(date) FROM vote_intention WHERE colony_id = c.id)
      WHERE c.municipality_id = ?
    `).get(id);

    res.json({
      ...municipality,
      ...stats
    });

  } catch (error) {
    console.error('Get municipality error:', error);
    res.status(500).json({
      error: 'Error al obtener municipio',
      message: error.message
    });
  }
});

module.exports = router;
