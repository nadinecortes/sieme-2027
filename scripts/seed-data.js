const { db, createTables } = require('../config/database');
const bcrypt = require('bcryptjs');

console.log('🗄️  Inicializando base de datos...');

// Crear tablas
createTables();
console.log('✅ Tablas creadas');

// Limpiar datos existentes
db.exec(`
  DELETE FROM sessions;
  DELETE FROM alerts;
  DELETE FROM risk_assessment;
  DELETE FROM perception;
  DELETE FROM welfare_beneficiaries;
  DELETE FROM vote_intention;
  DELETE FROM colonies;
  DELETE FROM municipalities;
  DELETE FROM users;
`);

// Usuario admin
const hashedPassword = bcrypt.hashSync('admin123', 10);
const now = Date.now();

db.prepare(`
  INSERT INTO users (username, password, role, email, created_at, updated_at)
  VALUES (?, ?, 'admin', 'admin@sieme.mx', ?, ?)
`).run('admin', hashedPassword, now, now);

console.log('✅ Usuario admin creado (admin/admin123)');

// Municipios
const municipalities = [
  { name: 'Guadalajara', code: 'GDL', population: 1495189 },
  { name: 'Zapopan', code: 'ZPN', population: 1476491 },
  { name: 'Tlaquepaque', code: 'TLQ', population: 687127 },
  { name: 'Tonalá', code: 'TON', population: 536111 },
  { name: 'Tlajomulco', code: 'TLJ', population: 723006 },
  { name: 'El Salto', code: 'SAL', population: 211433 }
];

const muniIds = {};
municipalities.forEach(m => {
  const result = db.prepare(`
    INSERT INTO municipalities (name, code, population, created_at)
    VALUES (?, ?, ?, ?)
  `).run(m.name, m.code, m.population, now);
  muniIds[m.name] = result.lastInsertRowid;
});

console.log('✅ 6 municipios insertados');

// 72 colonias
const colonies = [
  // Guadalajara (20)
  {name:'Tetlán',municipality:'Guadalajara',lat:20.6597,lon:-103.3286,population:45000,level:'bajo'},
  {name:'Lomas del Paraíso I',municipality:'Guadalajara',lat:20.7168,lon:-103.3445,population:38000,level:'bajo'},
  {name:'Lomas del Paraíso III',municipality:'Guadalajara',lat:20.7185,lon:-103.3458,population:35000,level:'bajo'},
  {name:'El Bethel',municipality:'Guadalajara',lat:20.7142,lon:-103.3501,population:32000,level:'bajo'},
  {name:'Rancho Nuevo',municipality:'Guadalajara',lat:20.6845,lon:-103.3612,population:41000,level:'medio-bajo'},
  {name:'Huentitán El Alto',municipality:'Guadalajara',lat:20.7234,lon:-103.3289,population:48000,level:'medio-bajo'},
  {name:'Lagos de Oriente',municipality:'Guadalajara',lat:20.6789,lon:-103.2845,population:52000,level:'bajo'},
  {name:'San Joaquín',municipality:'Guadalajara',lat:20.6834,lon:-103.3523,population:39000,level:'medio-bajo'},
  {name:'La Campesina',municipality:'Guadalajara',lat:20.6712,lon:-103.3445,population:28000,level:'medio'},
  {name:'Jardines de la Barranca',municipality:'Guadalajara',lat:20.6598,lon:-103.3567,population:31000,level:'medio'},
  {name:'Oblatos',municipality:'Guadalajara',lat:20.6956,lon:-103.3178,population:44000,level:'medio-bajo'},
  {name:'Polanco',municipality:'Guadalajara',lat:20.6845,lon:-103.3789,population:27000,level:'medio'},
  {name:'Chapalita',municipality:'Guadalajara',lat:20.6789,lon:-103.3912,population:35000,level:'medio-alto'},
  {name:'Lafayette',municipality:'Guadalajara',lat:20.6712,lon:-103.3967,population:22000,level:'alto'},
  {name:'Providencia',municipality:'Guadalajara',lat:20.6734,lon:-103.3845,population:28000,level:'alto'},
  {name:'Santa Teresita',municipality:'Guadalajara',lat:20.6689,lon:-103.3801,population:25000,level:'medio-alto'},
  {name:'Miravalle',municipality:'Guadalajara',lat:20.6467,lon:-103.3445,population:33000,level:'medio'},
  {name:'Zoquipan',municipality:'Guadalajara',lat:20.6556,lon:-103.3567,population:29000,level:'medio'},
  {name:'Juárez',municipality:'Guadalajara',lat:20.6778,lon:-103.3612,population:31000,level:'medio-alto'},
  {name:'Americana',municipality:'Guadalajara',lat:20.6734,lon:-103.3734,population:26000,level:'alto'},
  
  // Zapopan (13)
  {name:'Arcos Vallarta',municipality:'Zapopan',lat:20.6823,lon:-103.4123,population:32000,level:'alto'},
  {name:'Jardines del Sol',municipality:'Zapopan',lat:20.7012,lon:-103.4234,population:28000,level:'medio-alto'},
  {name:'Copalita',municipality:'Zapopan',lat:20.6934,lon:-103.4456,population:41000,level:'medio'},
  {name:'Atemajac',municipality:'Zapopan',lat:20.7156,lon:-103.4089,population:38000,level:'medio'},
  {name:'Tesistán',municipality:'Zapopan',lat:20.7445,lon:-103.4567,population:45000,level:'medio'},
  {name:'Las Águilas',municipality:'Zapopan',lat:20.7089,lon:-103.4234,population:34000,level:'medio-alto'},
  {name:'Vallarta Norte',municipality:'Zapopan',lat:20.6945,lon:-103.4178,population:36000,level:'medio-alto'},
  {name:'La Primavera',municipality:'Zapopan',lat:20.6867,lon:-103.4312,population:29000,level:'medio-alto'},
  {name:'Nuevo México',municipality:'Zapopan',lat:20.7234,lon:-103.4389,population:42000,level:'medio'},
  {name:'Base Aérea',municipality:'Zapopan',lat:20.7312,lon:-103.4234,population:39000,level:'medio'},
  {name:'Nextipac',municipality:'Zapopan',lat:20.7478,lon:-103.4489,population:48000,level:'medio'},
  {name:'Santa Margarita',municipality:'Zapopan',lat:20.6989,lon:-103.4456,population:31000,level:'medio-alto'},
  {name:'Ciudad Granja',municipality:'Zapopan',lat:20.7123,lon:-103.4567,population:35000,level:'medio-alto'},
  
  // Tlaquepaque (8)
  {name:'Lomas del Valle',municipality:'Tlaquepaque',lat:20.6234,lon:-103.2945,population:47000,level:'bajo'},
  {name:'Las Torres',municipality:'Tlaquepaque',lat:20.6345,lon:-103.2867,population:43000,level:'medio-bajo'},
  {name:'El Verde',municipality:'Tlaquepaque',lat:20.6289,lon:-103.2789,population:38000,level:'medio'},
  {name:'Tlaquepaque Centro',municipality:'Tlaquepaque',lat:20.6401,lon:-103.3134,population:52000,level:'medio-bajo'},
  {name:'Las Huertas',municipality:'Tlaquepaque',lat:20.6512,lon:-103.2978,population:34000,level:'medio'},
  {name:'San Pedro Tlaquepaque',municipality:'Tlaquepaque',lat:20.6456,lon:-103.3045,population:41000,level:'medio'},
  {name:'Santa Anita',municipality:'Tlaquepaque',lat:20.6378,lon:-103.2889,population:36000,level:'medio'},
  {name:'La Cañada',municipality:'Tlaquepaque',lat:20.6289,lon:-103.3012,population:32000,level:'medio'},
  
  // Tonalá (8)
  {name:'Tonalá Centro',municipality:'Tonalá',lat:20.6234,lon:-103.2401,population:58000,level:'bajo'},
  {name:'Santa Cruz de las Flores',municipality:'Tonalá',lat:20.6089,lon:-103.2267,population:49000,level:'bajo'},
  {name:'El Rosario',municipality:'Tonalá',lat:20.6156,lon:-103.2178,population:42000,level:'medio-bajo'},
  {name:'Mezquitán',municipality:'Tonalá',lat:20.6312,lon:-103.2345,population:45000,level:'medio-bajo'},
  {name:'El Briseño',municipality:'Tonalá',lat:20.6278,lon:-103.2489,population:38000,level:'medio-bajo'},
  {name:'Loma Dorada',municipality:'Tonalá',lat:20.6189,lon:-103.2312,population:41000,level:'medio-bajo'},
  {name:'Coyula',municipality:'Tonalá',lat:20.6345,lon:-103.2234,population:51000,level:'bajo'},
  {name:'Lomas de San Pedrito',municipality:'Tonalá',lat:20.6267,lon:-103.2456,population:46000,level:'bajo'},
  
  // Tlajomulco (8)
  {name:'Los Olivos',municipality:'Tlajomulco',lat:20.5234,lon:-103.4512,population:39000,level:'medio'},
  {name:'Santa Fe',municipality:'Tlajomulco',lat:20.5389,lon:-103.4623,population:44000,level:'medio-alto'},
  {name:'Hacienda Santa Fe',municipality:'Tlajomulco',lat:20.5445,lon:-103.4701,population:51000,level:'medio-alto'},
  {name:'Chulavista',municipality:'Tlajomulco',lat:20.5312,lon:-103.4445,population:42000,level:'medio'},
  {name:'San Agustín',municipality:'Tlajomulco',lat:20.5267,lon:-103.4578,population:38000,level:'medio'},
  {name:'Valle de las Huertas',municipality:'Tlajomulco',lat:20.5423,lon:-103.4489,population:46000,level:'medio-alto'},
  {name:'Lomas de Tejeda',municipality:'Tlajomulco',lat:20.5378,lon:-103.4756,population:48000,level:'medio-alto'},
  {name:'San Sebastián El Grande',municipality:'Tlajomulco',lat:20.5289,lon:-103.4612,population:41000,level:'medio'},
  
  // El Salto (7)
  {name:'El Salto Centro',municipality:'El Salto',lat:20.5234,lon:-103.2134,population:35000,level:'bajo'},
  {name:'Las Pintitas',municipality:'El Salto',lat:20.5178,lon:-103.2089,population:32000,level:'bajo'},
  {name:'El Quince',municipality:'El Salto',lat:20.5289,lon:-103.2201,population:28000,level:'medio-bajo'},
  {name:'Las Liebres',municipality:'El Salto',lat:20.5312,lon:-103.2267,population:26000,level:'medio-bajo'},
  {name:'San José del Castillo',municipality:'El Salto',lat:20.5245,lon:-103.2178,population:29000,level:'medio-bajo'},
  {name:'Puente Grande',municipality:'El Salto',lat:20.5156,lon:-103.2312,population:31000,level:'bajo'},
  {name:'La Alameda',municipality:'El Salto',lat:20.5334,lon:-103.2234,population:27000,level:'medio-bajo'}
];

const colonyIds = {};
colonies.forEach(c => {
  const result = db.prepare(`
    INSERT INTO colonies (municipality_id, name, latitude, longitude, population, socioeconomic_level, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(muniIds[c.municipality], c.name, c.lat, c.lon, c.population, c.level, now);
  colonyIds[c.name] = result.lastInsertRowid;
});

console.log('✅ 72 colonias insertadas');

// Intención de voto
const date = '2026-03-01';
colonies.forEach(c => {
  const mcBase = c.level === 'alto' ? 45 : c.level === 'medio-alto' ? 43 : c.level === 'medio' ? 40 : c.level === 'medio-bajo' ? 37 : 35;
  const morenaBase = c.level === 'alto' ? 35 : c.level === 'medio-alto' ? 37 : c.level === 'medio' ? 40 : c.level === 'medio-bajo' ? 43 : 47;
  
  const mc = mcBase + (Math.random() * 6 - 3);
  const morena = morenaBase + (Math.random() * 6 - 3);
  
  db.prepare(`
    INSERT INTO vote_intention (colony_id, date, mc_percentage, morena_percentage, other_percentage, undecided_percentage, sample_size, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(colonyIds[c.name], date, mc, morena, 8.0, 10.0, 500, now);
});

console.log('✅ Intención de voto insertada');

// Beneficiarios
const programs = ['Pensión Bienestar', 'Sembrando Vida', 'Jóvenes Construyendo', 'Becas Benito Juárez'];
colonies.forEach(c => {
  programs.forEach(program => {
    const basePercentage = c.level === 'bajo' ? 35 : c.level === 'medio-bajo' ? 25 : c.level === 'medio' ? 18 : c.level === 'medio-alto' ? 12 : 8;
    const percentage = basePercentage + (Math.random() * 10 - 5);
    const count = Math.floor((c.population * percentage) / 100);
    const newBenef = Math.floor(count * 0.05);
    
    db.prepare(`
      INSERT INTO welfare_beneficiaries (colony_id, date, program_name, beneficiaries_count, percentage_population, new_beneficiaries, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(colonyIds[c.name], date, program, count, percentage, newBenef, now);
  });
});

console.log('✅ Beneficiarios insertados');

// Percepción
colonies.forEach(c => {
  const welfarePerc = c.level === 'bajo' ? 7.5 : c.level === 'medio-bajo' ? 6.8 : c.level === 'medio' ? 6.2 : c.level === 'medio-alto' ? 5.5 : 5.0;
  const mcPerc = c.level === 'alto' ? 7.0 : c.level === 'medio-alto' ? 6.5 : c.level === 'medio' ? 6.0 : c.level === 'medio-bajo' ? 5.5 : 5.0;
  const morenaPerc = c.level === 'bajo' ? 7.2 : c.level === 'medio-bajo' ? 6.7 : c.level === 'medio' ? 6.0 : c.level === 'medio-alto' ? 5.3 : 4.8;
  
  db.prepare(`
    INSERT INTO perception (colony_id, date, welfare_perception, mc_perception, morena_perception, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(colonyIds[c.name], date, welfarePerc, mcPerc, morenaPerc, now);
});

console.log('✅ Percepción insertada');

// Riesgo
colonies.forEach(c => {
  let riskLevel, riskScore;
  const rand = Math.random();
  
  if (c.level === 'bajo') {
    riskLevel = rand < 0.7 ? 'rojo' : 'naranja';
    riskScore = 7.5 + Math.random() * 2;
  } else if (c.level === 'medio-bajo') {
    riskLevel = rand < 0.6 ? 'naranja' : 'amarillo';
    riskScore = 6.0 + Math.random() * 2;
  } else if (c.level === 'medio') {
    riskLevel = rand < 0.5 ? 'amarillo' : 'verde';
    riskScore = 4.5 + Math.random() * 2;
  } else {
    riskLevel = rand < 0.7 ? 'verde' : 'amarillo';
    riskScore = 3.0 + Math.random() * 2;
  }
  
  db.prepare(`
    INSERT INTO risk_assessment (colony_id, date, risk_level, risk_score, factors, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(colonyIds[c.name], date, riskLevel, riskScore, 'Beneficiarios, Intención voto', now);
});

console.log('✅ Evaluaciones de riesgo insertadas');

// Alertas de ejemplo
const alerts = [
  { colony: 'Tetlán', type: 'critical', title: 'Incremento beneficiarios +15%', message: 'Se detectó aumento significativo en nuevos beneficiarios' },
  { colony: 'Tonalá Centro', type: 'critical', title: 'MC baja 3.2 puntos', message: 'Caída en intención de voto en últimas 2 semanas' },
  { colony: 'Lomas del Valle', type: 'warning', title: 'Percepción Bienestar alta', message: 'Aumentó percepción positiva de programas federales' },
  { colony: 'Santa Cruz de las Flores', type: 'warning', title: 'Morena supera 50%', message: 'Primera vez que supera mayoría absoluta' },
  { colony: 'Arcos Vallarta', type: 'success', title: 'MC mantiene ventaja', message: 'Diferencia de 18 puntos sobre Morena' },
  { colony: 'Hacienda Santa Fe', type: 'info', title: 'Nueva encuesta programada', message: 'Se realizará sondeo en próximos 5 días' },
  { colony: 'El Salto Centro', type: 'critical', title: 'Riesgo electoral alto', message: 'Combinación de factores eleva riesgo' }
];

alerts.forEach(a => {
  db.prepare(`
    INSERT INTO alerts (colony_id, type, title, message, status, created_at)
    VALUES (?, ?, ?, ?, 'active', ?)
  `).run(colonyIds[a.colony], a.type, a.title, a.message, now);
});

console.log('✅ 7 alertas insertadas');

console.log('\n🎉 ¡Base de datos inicializada exitosamente!');
console.log('\nCredenciales de acceso:');
console.log('  Usuario: admin');
console.log('  Password: admin123\n');
