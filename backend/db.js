const fs = require('fs');
const path = require('path');

const JSON_FILE_PATH = path.join(__dirname, 'ghostnet_db.json');

// Initialize local database structure
const initJsonDb = () => {
  if (!fs.existsSync(JSON_FILE_PATH)) {
    fs.writeFileSync(JSON_FILE_PATH, JSON.stringify({ emergencies: [], decisions: [] }, null, 2));
  }
};

const readJsonDb = () => {
  initJsonDb();
  try {
    const data = fs.readFileSync(JSON_FILE_PATH, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    return { emergencies: [], decisions: [] };
  }
};

const writeJsonDb = (data) => {
  fs.writeFileSync(JSON_FILE_PATH, JSON.stringify(data, null, 2));
};

async function connectDb() {
  console.log("Initializing Decentralized GhostNet Local Database Ledger...");
  initJsonDb();
}

async function saveEmergency(emergency) {
  const db = readJsonDb();
  db.emergencies.push(emergency);
  writeJsonDb(db);
  return emergency;
}

async function updateEmergencyStatus(id, update) {
  const db = readJsonDb();
  const idx = db.emergencies.findIndex(e => e.id === id);
  if (idx !== -1) {
    db.emergencies[idx] = { ...db.emergencies[idx], ...update };
    writeJsonDb(db);
    return db.emergencies[idx];
  }
  return null;
}

async function getEmergency(id) {
  const db = readJsonDb();
  return db.emergencies.find(e => e.id === id) || null;
}

async function getAllEmergencies() {
  const db = readJsonDb();
  return [...db.emergencies].sort((a, b) => b.timestamp - a.timestamp);
}

async function saveDecision(decision) {
  const db = readJsonDb();
  db.decisions.push(decision);
  writeJsonDb(db);
  return decision;
}

async function getDecision(id) {
  const db = readJsonDb();
  return db.decisions.find(d => d.id === id) || null;
}

async function updateDecision(id, update) {
  const db = readJsonDb();
  const idx = db.decisions.findIndex(d => d.id === id);
  if (idx !== -1) {
    db.decisions[idx] = { ...db.decisions[idx], ...update };
    writeJsonDb(db);
    return db.decisions[idx];
  }
  return null;
}

async function getAllDecisions() {
  const db = readJsonDb();
  return [...db.decisions].sort((a, b) => b.timestamp - a.timestamp);
}

module.exports = {
  connectDb,
  saveEmergency,
  updateEmergencyStatus,
  getEmergency,
  getAllEmergencies,
  saveDecision,
  getDecision,
  updateDecision,
  getAllDecisions
};
