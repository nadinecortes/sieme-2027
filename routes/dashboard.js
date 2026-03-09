const express = require('express');
const router = express.Router();
const { db } = require('../config/database');

// GET estadísticas generales del dashboard
router.get('/stats', (req, res) => {
  try {
    const latestDate = db.prepare('SELECT MAX(date) as date FROM vote_intention').get().date;

    const voteStats = db.prepare(`
      SELECT 
        AVG(mc_percentage) as avg_mc_intention,
        AVG(morena_percentage) as avg_morena_intention
      FROM vote_intention
      WHERE date = ?
    `).get(latestDate);

    const welfareStats = db.prepare(`
      SELECT SUM(new_beneficiaries) as new_beneficiaries_30d
      FROM welfare_beneficiaries
      WHERE date >= date('now', '-30 days')
    `).get();

    const riskStats = db.prepare(`
      SELECT COUNT(*) as high_risk_colonies
      FROM risk_assessment
      WHERE risk_level IN ('rojo', 'naranja')
        AND date = (SELECT MAX(date) FROM risk_assessment)
    `).get();

    const alertStats = db.prepare(`
      SELECT COUNT(*) as active_alerts
      FROM alerts
      WHERE status = 'active'
    `).get();

    const colonyCount = db.prepare('SELECT COUNT(*) as colonies_monitored FROM colonies').get();

    const riskDistribution = db.prepare(`
      SELECT 
        risk_level,
        COUNT(*) as count
      FROM risk_assessment
      WHERE date = (SELECT MAX(date) FROM risk_assessment)
      GROUP BY risk_level
    `).all();

    const distribution = {};
    riskDistribution.forEach(r => {
      distribution[r.risk_level] = r.count;
    });

    res.json({
      avg_mc_intention: voteStats.avg_mc_intention || 0,
      avg_morena_intention: voteStats.avg_morena_intention || 0,
      mc_vs_2024: -1.4,
      morena_vs_2024: 0.9,
      new_beneficiaries_30d: welfareStats.new_beneficiaries_30d || 0,
      high_risk_colonies: riskStats.high_risk_colonies || 0,
      active_alerts: alertStats.active_alerts || 0,
      colonies_monitored: colonyCount.colonies_monitored || 0,
      risk_distribution: distribution
    });

  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({
      error: 'Error al obtener estadísticas',
      message: error.message
    });
  }
});

// GET colonias de alto riesgo
router.get('/high-risk-colonies', (req, res) => {
  try {
    const colonies = db.prepare(`
      SELECT 
        c.id,
        c.name,
        m.name as municipality,
        r.risk_level,
        r.risk_score,
        v.mc_percentage,
        v.morena_percentage
      FROM colonies c
      JOIN municipalities m ON c.municipality_id = m.id
      LEFT JOIN (
        SELECT * FROM risk_assessment
        WHERE date = (SELECT MAX(date) FROM risk_assessment)
      ) r ON c.id = r.colony_id
      LEFT JOIN (
        SELECT * FROM vote_intention
        WHERE date = (SELECT MAX(date) FROM vote_intention)
      ) v ON c.id = v.colony_id
      WHERE r.risk_level IN ('rojo', 'naranja')
      ORDER BY r.risk_score DESC
      LIMIT 20
    `).all();

    res.json(colonies);

  } catch (error) {
    console.error('Get high risk colonies error:', error);
    res.status(500).json({
      error: 'Error al obtener colonias de riesgo',
      message: error.message
    });
  }
});

// GET resumen por municipio
router.get('/municipality-summary', (req, res) => {
  try {
    const summary = db.prepare(`
      SELECT 
        m.id,
        m.name as municipality,
        m.code,
        COUNT(DISTINCT c.id) as colonies_count,
        AVG(v.mc_percentage) as avg_mc_intention,
        AVG(v.morena_percentage) as avg_morena_intention,
        SUM(CASE WHEN r.risk_level IN ('rojo', 'naranja') THEN 1 ELSE 0 END) as high_risk_count
      FROM municipalities m
      LEFT JOIN colonies c ON m.id = c.municipality_id
      LEFT JOIN (
        SELECT * FROM vote_intention
        WHERE date = (SELECT MAX(date) FROM vote_intention)
      ) v ON c.id = v.colony_id
      LEFT JOIN (
        SELECT * FROM risk_assessment
        WHERE date = (SELECT MAX(date) FROM risk_assessment)
      ) r ON c.id = r.colony_id
      GROUP BY m.id
      ORDER BY m.name
    `).all();

    res.json(summary);

  } catch (error) {
    console.error('Get municipality summary error:', error);
    res.status(500).json({
      error: 'Error al obtener resumen por municipio',
      message: error.message
    });
  }
});

// GET actividad reciente
router.get('/recent-activity', (req, res) => {
  try {
    const alerts = db.prepare(`
      SELECT 
        'alert' as type,
        a.title as description,
        a.created_at as timestamp,
        c.name as colony_name
      FROM alerts a
      LEFT JOIN colonies c ON a.colony_id = c.id
      ORDER BY a.created_at DESC
      LIMIT 10
    `).all();

    res.json(alerts);

  } catch (error) {
    console.error('Get recent activity error:', error);
    res.status(500).json({
      error: 'Error al obtener actividad reciente',
      message: error.message
    });
  }
});

// GET comparación temporal
router.get('/temporal-comparison', (req, res) => {
  try {
    const { days = 30 } = req.query;

    const comparison = db.prepare(`
      SELECT 
        date,
        AVG(mc_percentage) as mc_avg,
        AVG(morena_percentage) as morena_avg
      FROM vote_intention
      WHERE date >= date('now', '-' || ? || ' days')
      GROUP BY date
      ORDER BY date
    `).all(days);

    res.json(comparison);

  } catch (error) {
    console.error('Get temporal comparison error:', error);
    res.status(500).json({
      error: 'Error al obtener comparación temporal',
      message: error.message
    });
  }
});

module.exports = router;
