import mongoose from 'mongoose';
import { connectDB } from './db.js';
import Store from './models/Store.js';
import Franchisee from './models/Franchisee.js';
import Audit from './models/Audit.js';
import Product from './models/Product.js';
import Assignment from './models/Assignment.js';
import Appeal from './models/Appeal.js';
import Feedback from './models/Feedback.js';
import Request from './models/Request.js';
import DeviceLog from './models/DeviceLog.js';
import User from './models/User.js';

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function seed() {
  await connectDB();
  console.log('Seeding MongoDB Atlas with KFC Portal Data...');

  const readJson = (name) => {
    const localP = path.join(__dirname, 'data', name);
    if (fs.existsSync(localP)) {
      return JSON.parse(fs.readFileSync(localP, 'utf8'));
    }
    const fallbackP = path.resolve('data', name);
    return JSON.parse(fs.readFileSync(fallbackP, 'utf8'));
  };

  const franchisees = readJson('franchisees.json');
  const stores = readJson('stores.json');
  const products = readJson('products.json');
  const audits = readJson('audits.json');
  const assignments = readJson('assignments.json');
  const appeals = readJson('appeals.json');
  const feedback = readJson('feedback.json');
  const requests = readJson('store_requests.json');
  const gpsLogs = readJson('auditor_logs.json');
  const users = readJson('users.json');

  // Clear existing
  await Promise.all([
    Store.deleteMany({}),
    Franchisee.deleteMany({}),
    Audit.deleteMany({}),
    Product.deleteMany({}),
    Assignment.deleteMany({}),
    Appeal.deleteMany({}),
    Feedback.deleteMany({}),
    Request.deleteMany({}),
    DeviceLog.deleteMany({}),
    User.deleteMany({})
  ]);

  console.log('Cleared existing collections.');

  // Insert Franchisees
  const franDocs = await Franchisee.insertMany(franchisees.map(f => ({
    legacyId: f.id,
    name: f.name,
    address: f.address,
    postcode: f.postcode,
    contactPerson: f.contactPerson,
    phone: f.phone,
    dateEntered: f.dateEntered,
    status: f.status,
    storesCount: f.storesCount
  })));
  console.log(`✓ Inserted ${franDocs.length} Franchisees`);

  // Insert Stores
  const storeDocs = await Store.insertMany(stores.map(s => ({
    branchCode: s.branchCode,
    name: s.name,
    address: s.address,
    postcode: s.postcode,
    franchisee: s.franchisee,
    franchiseeId: s.franchiseeId,
    contactPerson: s.contactPerson,
    contactPhone: s.contactPhone,
    lat: s.lat,
    lng: s.lng,
    status: s.status,
    lastAuditDate: s.lastAuditDate,
    nextAuditDueDate: s.nextAuditDueDate,
    halalCertified: s.halalCertified,
    certificateNumber: s.certificateNumber
  })));
  console.log(`✓ Inserted ${storeDocs.length} Stores`);

  // Insert Products
  const prodDocs = await Product.insertMany(products.map(p => ({
    name: p.name,
    supplier: p.supplier,
    code: p.code,
    manufacturer: p.manufacturer,
    siteEcCode: p.siteEcCode,
    status: p.status,
    dateApproved: p.dateApproved,
    notes: p.notes,
    documents: p.documents
  })));
  console.log(`✓ Inserted ${prodDocs.length} Products`);

  // Insert Audits
  const auditDocs = await Audit.insertMany(audits.map(a => ({
    legacyId: a.id,
    storeName: a.storeName,
    branchCode: a.branchCode,
    address: a.address,
    postcode: a.postcode,
    franchisee: a.franchisee,
    franchiseeId: a.franchiseeId,
    auditor: a.auditor,
    auditDate: a.auditDate,
    timeIn: a.timeIn,
    timeOut: a.timeOut,
    session: a.session,
    category: a.category,
    score: a.score,
    storeRepresentative: a.storeRepresentative,
    complianceSummary: a.complianceSummary
  })));
  console.log(`✓ Inserted ${auditDocs.length} Audits`);

  // Insert Assignments
  const asgDocs = await Assignment.insertMany(assignments.map(asg => ({
    storeName: asg.storeName,
    branchCode: asg.branchCode,
    franchisee: asg.franchisee,
    auditor: asg.auditor,
    date: asg.date,
    session: asg.session,
    status: asg.status,
    notification: asg.notification
  })));
  console.log(`✓ Inserted ${asgDocs.length} Assignments`);

  // Insert Appeals
  const appealDocs = await Appeal.insertMany(appeals.map(ap => ({
    auditorName: ap.auditorName,
    branchCode: ap.branchCode,
    storeAddress: ap.storeAddress,
    date: ap.date,
    appealDate: ap.appealDate,
    reasons: ap.reasons,
    evidence: ap.evidence,
    status: ap.status,
    submittedBy: ap.submittedBy
  })));
  console.log(`✓ Inserted ${appealDocs.length} Appeals`);

  // Insert Feedback
  const fbDocs = await Feedback.insertMany(feedback.map(f => ({
    siteName: f.siteName,
    auditDate: f.auditDate,
    time: f.time,
    rating: f.rating,
    procedureExplained: f.procedureExplained,
    auditorPunctual: f.auditorPunctual,
    professionalConduct: f.professionalConduct,
    outcomeDiscussed: f.outcomeDiscussed,
    recommendation: f.recommendation
  })));
  console.log(`✓ Inserted ${fbDocs.length} Feedback submissions`);

  // Insert Requests
  const reqDocs = await Request.insertMany(requests.map(r => ({
    branchCode: r.branchCode,
    storeName: r.storeName,
    address: r.address,
    postcode: r.postcode,
    franchisee: r.franchisee,
    contactPerson: r.contactPerson,
    requestType: r.requestType,
    status: r.status,
    date: r.date,
    openingDate: r.openingDate,
    closingDate: r.closingDate
  })));
  console.log(`✓ Inserted ${reqDocs.length} Requests`);

  // Insert DeviceLogs
  const logDocs = await DeviceLog.insertMany(gpsLogs.map(l => ({
    auditor: l.auditor,
    storeName: l.storeName,
    date: l.date,
    time: l.time,
    activity: l.activity,
    session: l.session,
    lat: l.lat,
    lng: l.lng,
    device: l.device
  })));
  console.log(`✓ Inserted ${logDocs.length} Device Logs`);

  // Insert Users
  const userDocs = await User.insertMany(users.map(u => ({
    username: u.username,
    fullName: u.fullName,
    role: u.role,
    email: u.email,
    active: u.active,
    department: u.department,
    password: process.env.SEED_DEFAULT_PASSWORD || 'change-me-on-first-login'
  })));
  console.log(`✓ Inserted ${userDocs.length} Users`);

  console.log('\n🎉 ALL DATA SUCCESSFULLY SEEDED INTO MONGODB ATLAS!');
  process.exit(0);
}

seed().catch(err => {
  console.error('Seed error:', err);
  process.exit(1);
});

