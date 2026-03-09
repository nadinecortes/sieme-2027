const express = require('express');
const router = express.Router();
const { db } = require('../config/database');

// GET todas las colonias con filtros
router.get('/', (req, res) => {
  try {
    const { 
      municipality_id, 
      municipality_name,
      search,
      risk_level,
      limit = 100,
      offset = 0
    } = req.query;

    let query = `
      SELECT 
        c.*,
        m.name as municipality_name,
        m.code as municipality_code
      FROM colonies c
      JOIN municipalities m ON c.municipality_id = m.id
      WHERE 1=1
    `;
    const params = [];

    if (municipality_id) {
      query += ` AND c.municipality_id = ?`;
      params.push(municipality_id);
    }

    if (municipality_name) {
      query += ` AND m.name LIKE ?`;
      params.push(`%${municipality_name}%`);
    }

    if (search) {
      query += ` AND c.name LIKE ?`;
      params.push(`%${search}%`);
    }

    if (risk_level) {
      query = `
        SELECT 
          c.*,
          m.name as municipality_name,
          m.code as municipality_code,
          r.risk_level,
          r.risk_score
        FROM colonies c
        JOIN municipalities m ON c.municipality_id = m.id
        LEFT JOIN (
          SELECT colony_id, risk_level, risk_score
          FROM risk_assessment
          WHERE date = (SELECT MAX(date) FROM risk_assessment)
        ) r ON c.id = r.colony_id
        WHERE r.risk_level = ?
      `;
      params.length = 0;
      params.push(risk_level);
    }

    query += ` ORDER BY c.name LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), parseInt(offset));

    const colonies = db.prepare(query).all(...params);

    let countQuery = `SELECT COUNT(*) as total FROM colonies c WHERE 1=1`;
    const countParams = [];

    if (municipality_id) {
      countQuery += ` AND c.municipality_id = ?`;
      countParams.push(municipality_id);
    }

    if (search) {
      countQuery += ` AND c.name LIKE ?`;
      countParams.push(`%${search}%`);
    }

    const { total } = db.prepare(countQuery).get(...countParams);

    res.json({
      data: colonies,
      total,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

  } catch (error) {
    console.error('Get colonies error:', error);
    res.status(500).json({
      error: 'Error al obtener colonias',
      message: error.message
    });
  }
});

// GET colonia por ID con todos los datos
router.get('/:id', (req, res) => {
  try {
    const { id } = req.params;

    const colony = db.prepare(`
      SELECT 
        c.*,
        m.name as municipality_name,
        m.code as municipality_code
      FROM colonies c
      JOIN municipalities m ON c.municipality_id = m.id
      WHERE c.id = ?
    `).get(id);

    if (!colony) {
      return res.status(404).json({
        error: 'No encontrado',
        message: 'Colonia no encontrada'
      });
    }

    const voteIntention = db.prepare(`
      SELECT * FROM vote_intention
      WHERE colony_id = ?
      ORDER BY date DESC
      LIMIT 1
    `).get(id);

    const welfare = db.prepare(`
      SELECT 
        SUM(beneficiaries_count) as total_beneficiaries,
        AVG(percentage_population) as avg_percentage,
        SUM(new_beneficiaries) as total_new
      FROM welfare_beneficiaries
      WHERE colony_id = ?
        AND date = (SELECT MAX(date) FROM welfare_beneficiaries WHERE colony_id = ?)
    `).get(id, id);

    const perception = db.prepare(`
      SELECT * FROM perception
      WHERE colony_id = ?
      ORDER BY date DESC
      LIMIT 1
    `).get(id);

    const risk = db.prepare(`
      SELECT * FROM risk_assessment
      WHERE colony_id = ?
      ORDER BY date DESC
      LIMIT 1
    `).get(id);

    const alerts = db.prepare(`
      SELECT * FROM alerts
      WHERE colony_id = ? AND status = 'active'
      ORDER BY created_at DESC
    `).all(id);

    res.json({
      ...colony,
      vote_intention: voteIntention,
      welfare,
      perception,
      risk,
      alerts
    });

  } catch (error) {
    console.error('Get colony error:', error);
    res.status(500).json({
      error: 'Error al obtener colonia',
      message: error.message
    });
  }
});

// GET todas las colonias para el mapa
router.get('/map/all', (req, res) => {
  try {
    const colonies = db.prepare(`
      SELECT 
        c.id,
        c.name,
        c.latitude,
        c.longitude,
        c.population,
        m.name as municipality,
        COALESCE(v.mc_percentage, 0) as mc_percentage,
        COALESCE(v.morena_percentage, 0) as morena_percentage,
        COALESCE(w.percentage_population, 0) as welfare_percentage,
        COALESCE(w.new_beneficiaries, 0) as new_beneficiaries,
        COALESCE(p.welfare_perception, 0) as welfare_perception,
        COALESCE(p.mc_perception, 0) as mc_perception,
        COALESCE(r.risk_level, 'amarillo') as risk_level,
        COALESCE(r.risk_score, 5.0) as risk_score
      FROM colonies c
      JOIN municipalities m ON c.municipality_id = m.id
      LEFT JOIN (
        SELECT * FROM vote_intention
        WHERE date = (SELECT MAX(date) FROM vote_intention)
      ) v ON c.id = v.colony_id
      LEFT JOIN (
        SELECT 
          colony_id,
          AVG(percentage_population) as percentage_population,
          SUM(new_beneficiaries) as new_beneficiaries
        FROM welfare_beneficiaries
        WHERE date = (SELECT MAX(date) FROM welfare_beneficiaries)
        GROUP BY colony_id
      ) w ON c.id = w.colony_id
      LEFT JOIN (
        SELECT * FROM perception
        WHERE date = (SELECT MAX(date) FROM perception)
      ) p ON c.id = p.colony_id
      LEFT JOIN (
        SELECT * FROM risk_assessment
        WHERE date = (SELECT MAX(date) FROM risk_assessment)
      ) r ON c.id = r.colony_id
      ORDER BY c.name
    `).all();

    res.json({ data: colonies });

  } catch (error) {
    console.error('Get map colonies error:', error);
    res.status(500).json({
      error: 'Error al obtener colonias para mapa',
      message: error.message
    });
  }
});

module.exports = router;
