require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const mongoose = require('mongoose');
const User = require('./models/User');
const LabReport = require('./models/LabReport');
const Consultation = require('./models/Consultation');
const Consent = require('./models/Consent');
const AuditLog = require('./models/AuditLog');

const MONGO_URI = process.env.MONGO_URI;

async function main() {
  await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 15000 });
  const [patients, doctors] = await Promise.all([
    User.find({ role:'patient', active:{ $ne:false } }).sort({ createdAt:1 }),
    User.find({ role:'doctor', active:{ $ne:false } }).sort({ createdAt:1 }),
  ]);
  if (!doctors.length) throw new Error('No doctors available');

  await Promise.all([
    LabReport.deleteMany({ title:/^Codex Verification/ }),
    Consultation.deleteMany({ chiefComplaint:/^Codex verification/ }),
    AuditLog.deleteMany({ detail:/Codex Verification/ }),
  ]);

  for (let index = 0; index < patients.length; index += 1) {
    const patient = patients[index];
    const doctor = doctors[index % doctors.length];
    const hba1c = Number((5.2 + (index % 4) * 0.5).toFixed(1));
    const hemoglobin = 12 + (index % 4);
    const collectedAt = new Date();
    collectedAt.setDate(collectedAt.getDate() - (10 + index));

    await Consent.findOneAndUpdate(
      { patientId:patient._id },
      { $setOnInsert:{ patientId:patient._id, shareWithDoctors:true, shareLabReports:true, shareImageScans:true, allowEmergencyAccess:true, researchUse:false } },
      { upsert:true, new:true, setDefaultsOnInsert:true }
    );

    await LabReport.findOneAndUpdate(
      { patientId:patient._id, title:'Baseline Clinical Panel', source:'seed' },
      {
        patientId:patient._id,
        uploadedBy:patient._id,
        title:'Baseline Clinical Panel',
        laboratory:'Medicare Diagnostics Pune',
        collectedAt,
        rawText:`Hb ${hemoglobin}, HbA1c ${hba1c}, Creatinine 1.0`,
        results:[
          { test:'Hemoglobin', value:hemoglobin, unit:'g/dL', reference:'12-17.5 g/dL', flag:hemoglobin < 12 ? 'Low' : 'Normal' },
          { test:'HbA1c', value:hba1c, unit:'%', reference:'4-5.6 %', flag:hba1c > 5.6 ? 'High' : 'Normal' },
          { test:'Creatinine', value:1, unit:'mg/dL', reference:'0.6-1.3 mg/dL', flag:'Normal' },
        ],
        warnings:['Demo report values require clinical verification.'],
        source:'seed',
        status:'Reviewed',
        reviewedBy:doctor._id,
        reviewedAt:new Date(),
      },
      { upsert:true, new:true, setDefaultsOnInsert:true }
    );

    await Consultation.findOneAndUpdate(
      { patientId:patient._id, chiefComplaint:'Routine preventive health review' },
      {
        patientId:patient._id,
        doctorId:doctor._id,
        chiefComplaint:'Routine preventive health review',
        history:'General wellness, medicine adherence, sleep, nutrition, activity, and preventive screening reviewed.',
        examination:'Patient stable in the demonstration record. Vitals and warning signs reviewed.',
        diagnosis:['Preventive care review'],
        medicines:[],
        advice:'Continue healthy routines, complete recommended screening, and seek care for new or worsening symptoms.',
        followUpDate:new Date(Date.now() + 30 * 86400000),
        status:'Signed',
        signedAt:new Date(),
      },
      { upsert:true, new:true, setDefaultsOnInsert:true }
    );
  }

  console.log(`Clinical records ready for ${patients.length} patients.`);
  await mongoose.disconnect();
}

main().catch(async error => {
  console.error(error);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
