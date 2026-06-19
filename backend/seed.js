/**
 * MEDICARE AI - Final demo seed script
 *
 * Run after server/.env has MONGO_URI:
 *   cd server && node seed.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const User = require('./models/User');
const Appointment = require('./models/Appointment');
const Reminder = require('./models/Reminder');
const Chat = require('./models/Chat');
const ImageScan = require('./models/ImageScan');
const Report = require('./models/Report');
const LabReport = require('./models/LabReport');
const Consultation = require('./models/Consultation');
const Consent = require('./models/Consent');
const AuditLog = require('./models/AuditLog');

const MONGO_URI = process.env.MONGO_URI;
const PASSWORD = 'demo1234';

function printGuide() {
  console.log('\nMONGO_URI is missing or invalid.');
  console.log('Open: /Users/akhileshkurhadkar/Downloads/medicare-app2/server/.env');
  console.log('Set it like:');
  console.log('MONGO_URI=mongodb+srv://USERNAME:PASSWORD@cluster.mongodb.net/medicare_ai?retryWrites=true&w=majority');
  console.log('\nAtlas reminder: Database Access password is different from your MongoDB website login password.\n');
}

if (!MONGO_URI || MONGO_URI.includes('REPLACE_') || MONGO_URI.includes('localhost')) {
  printGuide();
  process.exit(1);
}

const users = [
  { name: 'Demo Patient', email: 'patient@demo.com', role: 'patient', age: 28, gender: 'Male', phone: '9876543210' },
  { name: 'Priya Sharma', email: 'priya@demo.com', role: 'patient', age: 32, gender: 'Female', phone: '9876543212' },
  { name: 'Rohan Iyer', email: 'rohan@demo.com', role: 'patient', age: 24, gender: 'Male', phone: '9876543214' },
  { name: 'Sana Khan', email: 'sana@demo.com', role: 'patient', age: 41, gender: 'Female', phone: '9876543215' },
  { name: 'Arjun Mehta', email: 'arjun@demo.com', role: 'patient', age: 36, gender: 'Male', phone: '9876543216' },
  { name: 'Ananya Rao', email: 'ananya@demo.com', role: 'patient', age: 19, gender: 'Female', phone: '9876543217' },
  { name: 'Ishaan Kapoor', email: 'ishaan@demo.com', role: 'patient', age: 52, gender: 'Male', phone: '9876543218' },
  { name: 'Vivaan Das', email: 'vivaan@demo.com', role: 'patient', age: 11, gender: 'Male', phone: '9876543220' },
  { name: 'Kavya Menon', email: 'kavya@demo.com', role: 'patient', age: 29, gender: 'Female', phone: '9876543221' },
  { name: 'Neel Patil', email: 'neel@demo.com', role: 'patient', age: 44, gender: 'Male', phone: '9876543222' },
  { name: 'Aisha Verma', email: 'aisha@demo.com', role: 'patient', age: 27, gender: 'Female', phone: '9876543223' },
  { name: 'Kabir Singh', email: 'kabir.patient@demo.com', role: 'patient', age: 61, gender: 'Male', phone: '9876543224' },

  { name: 'Dr. Demo Doctor', email: 'doctor@demo.com', role: 'doctor', age: 40, gender: 'Male', phone: '9876543211', specialization: 'General Physician' },
  { name: 'Dr. Meera Nair', email: 'meera@demo.com', role: 'doctor', age: 38, gender: 'Female', phone: '9876543213', specialization: 'Cardiologist' },
  { name: 'Dr. Arya Sen', email: 'arya@demo.com', role: 'doctor', age: 45, gender: 'Female', phone: '9876543225', specialization: 'Dermatologist' },
  { name: 'Dr. Kabir Bose', email: 'kabir.doctor@demo.com', role: 'doctor', age: 43, gender: 'Male', phone: '9876543226', specialization: 'Orthopedic Surgeon' },
  { name: 'Dr. Zoya Malik', email: 'zoya@demo.com', role: 'doctor', age: 37, gender: 'Female', phone: '9876543227', specialization: 'Pediatrician' },
  { name: 'Dr. Omkar Joshi', email: 'omkar@demo.com', role: 'doctor', age: 50, gender: 'Male', phone: '9876543228', specialization: 'Neurologist' },

  { name: 'Admin Console', email: 'admin@demo.com', role: 'admin', age: 35, gender: 'Female', phone: '9876543219' },
];

const medicinePlans = [
  ['Metformin', '500 mg', '08:00', 'Twice daily', 'After breakfast and dinner. Diabetes control.'],
  ['Amlodipine', '5 mg', '09:00', 'Once daily', 'BP medicine. Avoid missing doses.'],
  ['Dolo 650', '650 mg', '14:00', 'As needed', 'Only for fever/body ache, max dose as doctor advised.'],
  ['Cetirizine', '10 mg', '21:00', 'Once daily', 'For allergy/running nose, may cause sleepiness.'],
  ['Vitamin D3', '60000 IU', '10:00', 'Weekly', 'Take after meal once weekly.'],
  ['ORS', '1 sachet', '12:00', 'As needed', 'For dehydration/loose motion. Sip slowly.'],
  ['Pantoprazole', '40 mg', '07:30', 'Once daily', 'Before breakfast for acidity.'],
  ['Salbutamol inhaler', '2 puffs', 'As needed', 'As rescue inhaler for wheeze, seek care if not improving.'],
];

const problems = [
  ['General Physician', 'Fever, cough and body ache since yesterday', 'Confirmed'],
  ['Cardiologist', 'High BP follow-up and occasional palpitations', 'Scheduled'],
  ['Dermatologist', 'Itchy circular rash on arm, possible fungal infection', 'Completed'],
  ['Orthopedic Surgeon', 'Ankle sprain after football, swelling present', 'Scheduled'],
  ['Pediatrician', 'Child fever with sore throat and reduced appetite', 'Confirmed'],
  ['Neurologist', 'Migraine headaches with light sensitivity', 'Completed'],
];

const scanTemplates = [
  ['Ringworm / Tinea', 82, 'Circular scaly rash detected. Keep dry and consult dermatologist if spreading.'],
  ['Acne / Pimples', 76, 'Inflamed facial spots detected. Use gentle cleanser and avoid popping.'],
  ['Conjunctivitis / Red Eye', 71, 'Eye redness pattern detected. Avoid rubbing; urgent care if pain or vision change.'],
  ['Nail Fungus', 69, 'Nail discoloration/thickening pattern detected. Dermatology review recommended.'],
  ['Wound / Cut', 74, 'Open wound pattern detected. Clean, cover, tetanus review if dirty/deep.'],
  ['Eczema / Dermatitis', 67, 'Dry inflamed patch pattern detected. Moisturize and avoid irritants.'],
];

const chatPairs = [
  ['i have fever and body pain what should i do', 'For fever/body pain: rest, fluids, paracetamol if safe, and monitor temperature. Seek urgent care for fever above 39.5 C, breathing difficulty, rash, stiff neck, confusion, or dehydration.'],
  ['i got cut on my finger', 'Wash the cut under running water, apply pressure if bleeding, use antiseptic, cover with clean dressing, and check tetanus status. Go urgent if deep, dirty, gaping, numb, or bleeding does not stop.'],
  ['bone broken what to do', 'Possible fracture: keep the area still, avoid putting weight on it, apply ice wrapped in cloth, remove tight rings/items, and go for X-ray/orthopedic care. Call 108 for severe deformity or major injury.'],
  ['my eye is red', 'Red eye can be allergy, infection, dryness, or injury. Avoid rubbing. Urgent eye care if pain, vision change, light sensitivity, contact lens use, or chemical exposure.'],
  ['medicine missed dose', 'Take a missed dose when remembered unless close to next dose. Do not double dose unless a doctor says. Check with doctor/pharmacist for insulin, blood thinners, seizure medicines, or heart medicines.'],
];

function addDays(days, hour = 10) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, 0, 0, 0);
  return d;
}

async function upsertUsers() {
  const hashed = await bcrypt.hash(PASSWORD, 12);
  const map = {};

  for (const user of users) {
    const saved = await User.findOneAndUpdate(
      { email: user.email.toLowerCase() },
      { ...user, email: user.email.toLowerCase(), password: hashed },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    map[user.email] = saved;
  }

  return map;
}

async function seedData(userMap) {
  const patientList = Object.values(userMap).filter(u => u.role === 'patient');
  const doctorList = Object.values(userMap).filter(u => u.role === 'doctor');
  const patientIds = patientList.map(p => p._id);

  await Promise.all([
    Appointment.deleteMany({ patientId: { $in: patientIds } }),
    Reminder.deleteMany({ userId: { $in: patientIds } }),
    Chat.deleteMany({ userId: { $in: patientIds } }),
    ImageScan.deleteMany({ userId: { $in: patientIds } }),
    Report.deleteMany({ userId: { $in: patientIds } }),
    LabReport.deleteMany({ patientId: { $in: patientIds } }),
    Consultation.deleteMany({ patientId: { $in: patientIds } }),
    Consent.deleteMany({ patientId: { $in: patientIds } }),
    AuditLog.deleteMany({ patientId: { $in: patientIds } }),
  ]);

  const appointments = [];
  const reminders = [];
  const chats = [];
  const scans = [];
  const reports = [];
  const labs = [];
  const consultations = [];
  const consents = [];

  patientList.forEach((patient, idx) => {
    const doctor = doctorList[idx % doctorList.length];
    const problem = problems[idx % problems.length];
    const secondProblem = problems[(idx + 2) % problems.length];

    appointments.push({
      patientName: patient.name,
      patientId: patient._id,
      doctorId: doctor._id,
      age: patient.age,
      phone: patient.phone,
      specialist: problem[0],
      specialistId: String(doctor._id),
      problem: problem[1],
      date: addDays((idx % 6) + 1, 10 + (idx % 5)),
      slot: `${10 + (idx % 5)}:00 AM`,
      status: problem[2],
      notes: 'Seeded final-year demo appointment with realistic patient history.',
    });

    appointments.push({
      patientName: patient.name,
      patientId: patient._id,
      doctorId: doctorList[(idx + 1) % doctorList.length]._id,
      age: patient.age,
      phone: patient.phone,
      specialist: secondProblem[0],
      specialistId: String(doctorList[(idx + 1) % doctorList.length]._id),
      problem: secondProblem[1],
      date: addDays(-((idx % 9) + 1), 16),
      slot: '04:30 PM',
      status: idx % 3 === 0 ? 'Completed' : 'Confirmed',
      notes: 'Follow-up record for medical timeline demonstration.',
    });

    const medA = medicinePlans[idx % medicinePlans.length];
    const medB = medicinePlans[(idx + 3) % medicinePlans.length];
    reminders.push(
      { userId: patient._id, name: medA[0], dosage: medA[1], time: medA[2], frequency: medA[3], notes: medA[4], takenToday: idx % 2 === 0 },
      { userId: patient._id, name: medB[0], dosage: medB[1], time: medB[2], frequency: medB[3], notes: medB[4], active: idx % 5 !== 0 }
    );

    const pair = chatPairs[idx % chatPairs.length];
    chats.push(
      { userId: patient._id, role: 'user', content: pair[0], session: `seed-session-${idx}` },
      { userId: patient._id, role: 'assistant', content: pair[1], session: `seed-session-${idx}` }
    );

    const scan = scanTemplates[idx % scanTemplates.length];
    scans.push({
      userId: patient._id,
      patientName: patient.name,
      topCondition: scan[0],
      confidence: scan[1],
      results: [
        { label: scan[0], confidence: scan[1] },
        { label: 'Needs Doctor Review', confidence: 100 - scan[1] },
      ],
      features: { demo: true, context: idx % 2 === 0 ? 'skin' : 'auto' },
      imageMeta: { source: 'seed-demo', note: scan[2] },
      status: idx % 4 === 0 ? 'Needs Review' : 'Patient Saved',
    });

    reports.push({
      userId: patient._id,
      patientName: patient.name,
      title: `${patient.name} - AI Doctor Summary`,
      reportType: 'AI Doctor Report',
      summary: `${patient.name} has a demo clinical history including appointments, medicine reminders, AI chat triage, and image scan records.`,
      riskLevel: idx % 5 === 0 ? 'Moderate' : 'Low',
      sections: {
        symptoms: problem[1],
        medicines: `${medA[0]} ${medA[1]}, ${medB[0]} ${medB[1]}`,
        plan: 'Hydration, medicine adherence, follow-up appointment, and doctor review if symptoms worsen.',
      },
      generatedBy: 'Medicare.AI seed system',
    });

    const collectedAt = addDays(-((idx % 12) + 5), 8);
    labs.push({
      patientId: patient._id,
      uploadedBy: patient._id,
      title: idx % 2 === 0 ? 'Annual Wellness Panel' : 'Follow-up Blood Report',
      laboratory: 'Medicare Diagnostics Pune',
      collectedAt,
      rawText: `Hb ${12 + (idx % 4)} HbA1c ${5.2 + (idx % 4) * 0.5} Creatinine ${0.8 + (idx % 3) * 0.2}`,
      results: [
        { test:'Hemoglobin', value:12 + (idx % 4), unit:'g/dL', reference:'12-17.5 g/dL', flag:idx % 5 === 0 ? 'Low' : 'Normal' },
        { test:'HbA1c', value:Number((5.2 + (idx % 4) * 0.5).toFixed(1)), unit:'%', reference:'4-5.6 %', flag:idx % 4 >= 2 ? 'High' : 'Normal' },
        { test:'Creatinine', value:Number((0.8 + (idx % 3) * 0.2).toFixed(1)), unit:'mg/dL', reference:'0.6-1.3 mg/dL', flag:'Normal' },
      ],
      warnings:['Demo values require laboratory and clinician verification.'],
      source:'seed',
      status:idx % 3 === 0 ? 'Needs Review' : 'Reviewed',
      reviewedBy:idx % 3 === 0 ? undefined : doctor._id,
      reviewedAt:idx % 3 === 0 ? undefined : addDays(-2),
    });

    consultations.push({
      patientId:patient._id,
      doctorId:doctor._id,
      chiefComplaint:problem[1],
      history:'Symptoms reviewed with duration, aggravating factors, medicines, allergies, and relevant medical history.',
      examination:'General condition stable. Demo examination findings recorded for the final-year workflow.',
      diagnosis:[problem[0] === 'General Physician' ? 'Acute viral syndrome - provisional' : `${problem[0]} follow-up`],
      medicines:[{ name:medA[0], dosage:medA[1], frequency:medA[3], duration:'As advised' }],
      advice:'Hydration, medicine adherence, warning-sign education, and follow-up if symptoms persist or worsen.',
      followUpDate:addDays(14),
      status:'Signed',
      signedAt:addDays(-3),
    });

    consents.push({
      patientId:patient._id,
      shareWithDoctors:true,
      shareLabReports:true,
      shareImageScans:true,
      allowEmergencyAccess:true,
      researchUse:idx % 3 === 0,
    });
  });

  await Appointment.insertMany(appointments);
  await Reminder.insertMany(reminders);
  await Chat.insertMany(chats);
  await ImageScan.insertMany(scans);
  await Report.insertMany(reports);
  await LabReport.insertMany(labs);
  await Consultation.insertMany(consultations);
  await Consent.insertMany(consents);

  return {
    users: users.length,
    appointments: appointments.length,
    reminders: reminders.length,
    chats: chats.length,
    scans: scans.length,
    reports: reports.length,
    labs: labs.length,
    consultations: consultations.length,
    consents: consents.length,
  };
}

async function seed() {
  console.log('\nMedicare.AI - final demo seed');
  console.log('Connecting to:', MONGO_URI.replace(/:([^@]+)@/, ':****@'));

  try {
    await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 15000 });
    console.log('MongoDB Atlas connected.\n');
  } catch (err) {
    console.error('Connection failed:', err.message);
    printGuide();
    process.exit(1);
  }

  const userMap = await upsertUsers();
  const counts = await seedData(userMap);

  console.log('Seed complete:');
  Object.entries(counts).forEach(([key, value]) => console.log(`  ${key}: ${value}`));

  console.log('\nLOGIN IDS - password for all is demo1234');
  console.log('Patients:');
  users.filter(u => u.role === 'patient').forEach(u => console.log(`  ${u.email}`));
  console.log('Doctors:');
  users.filter(u => u.role === 'doctor').forEach(u => console.log(`  ${u.email} (${u.specialization})`));
  console.log('Admin:');
  users.filter(u => u.role === 'admin').forEach(u => console.log(`  ${u.email}`));
  console.log('\nRun app from project root: npm run dev');

  await mongoose.disconnect();
}

seed().catch(async err => {
  console.error('Seed error:', err);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
