const router = require('express').Router();
const Chat   = require('../models/Chat');
const { auth } = require('../middleware/auth');
const https  = require('https');
const { callAIService } = require('../services/aiService');

// ═══════════════════════════════════════════════════════════
// BUILT-IN HEALTH Q&A — works with NO API key needed
// ═══════════════════════════════════════════════════════════
const QA = [
  { q:['hello','hi','hey','good morning','good evening','namaste'],
    a:'Hello! I am MediCare AI, your intelligent health assistant. I can answer questions about symptoms, diseases, medications, diet, fitness, mental health, and emergencies. How can I help you today?' },
  { q:['thank you','thanks','ok thanks','okay'],
    a:'You are welcome! Remember — I provide general health information only. Always consult a qualified doctor for diagnosis and treatment. Stay healthy!' },
  { q:['diabetes','diabetic','blood sugar high','type 2 diabetes','type 1 diabetes'],
    a:'Diabetes symptoms: frequent urination, excessive thirst, unexplained weight loss, fatigue, blurred vision, slow-healing wounds, tingling in hands or feet. Type 2 develops slowly; Type 1 appears quickly. Get a fasting glucose or HbA1c blood test done. Management: medications as prescribed, low-carb diet, daily exercise, regular monitoring. Consult a doctor immediately if you notice these symptoms.' },
  { q:['blood pressure','hypertension','high bp','bp high'],
    a:'High blood pressure (hypertension) is called the silent killer — often no symptoms. When symptoms appear: severe headache, nosebleed, chest pain, dizziness, shortness of breath. Normal BP: below 120/80 mmHg. To lower BP naturally: reduce salt, exercise 150 min per week, DASH diet, limit alcohol, quit smoking, manage stress. If above 140/90, consult a doctor for medication.' },
  { q:['low blood pressure','hypotension','bp low','dizziness standing'],
    a:'Low blood pressure (below 90/60 mmHg): dizziness when standing up, fainting, blurred vision, nausea, fatigue. Causes: dehydration, heart problems, medications. Fix: drink more fluids, add a little salt, rise slowly from sitting or lying, wear compression stockings. See a doctor if it recurs.' },
  { q:['heart attack','cardiac arrest','chest pain','heart pain'],
    a:'EMERGENCY — CALL 108 NOW! Heart attack signs: chest pain or tightness spreading to arm, jaw, or back; shortness of breath; cold sweat; nausea; dizziness. Women may have jaw pain and fatigue without chest pain. Chew aspirin 325mg if available and not allergic. Do NOT drive yourself to hospital. Every minute of delay causes irreversible heart damage.' },
  { q:['stroke','brain stroke','facial drooping','arm weakness','speech slurred'],
    a:'STROKE — CALL 108 IMMEDIATELY! Use FAST: Face drooping (uneven smile?), Arm weakness (one arm drifts down?), Speech slurred or strange?, Time to call 108. Also: sudden severe headache, sudden vision loss, sudden dizziness. Brain loses 1.9 million neurons per minute during a stroke. Do NOT give food or water. Act within minutes.' },
  { q:['headache','migraine','head pain','head ache'],
    a:'Common headache causes: dehydration (drink water first!), stress, eye strain, skipped meals, poor sleep, caffeine withdrawal. Migraine: one-sided throbbing, nausea, light and sound sensitivity, lasting 4 to 72 hours. Take paracetamol and rest in a dark quiet room. See a doctor urgently if: sudden severe headache (worst ever), headache with stiff neck and fever (possible meningitis), or headache after a head injury.' },
  { q:['sleep','insomnia','cant sleep','not sleeping','poor sleep'],
    a:'For better sleep: keep a consistent sleep schedule even on weekends, keep bedroom dark, cool and quiet, avoid screens 1 hour before bed (blue light blocks melatonin), no caffeine after 2 PM, avoid large meals before bed, exercise regularly but not within 3 hours of bedtime. Adults need 7 to 9 hours. If insomnia lasts more than 3 weeks, see a doctor. CBT-I therapy is more effective than sleeping pills long-term.' },
  { q:['fever','temperature','high fever','fever in child'],
    a:'Fever management: paracetamol 500 to 1000mg every 6 hours for adults, 15mg per kg for children. Keep hydrated with 3 litres of fluids. Use cool compresses. Normal temperature is 36.1 to 37.2 degrees Celsius. EMERGENCY: any fever in infant under 3 months, fever above 39.5 degrees, fever with stiff neck and headache (meningitis risk!), fever with rash, or fever with breathing difficulty.' },
  { q:['dengue','dengue fever','breakbone fever'],
    a:'Dengue symptoms (4 to 10 days after mosquito bite): sudden high fever 39 to 40 degrees, severe headache, pain behind eyes, intense joint and muscle pain (called breakbone fever), rash, nausea. WARNING signs needing emergency care: bleeding gums, blood in urine or stool, severe abdominal pain, persistent vomiting. Use ONLY paracetamol, NOT ibuprofen or aspirin (they increase bleeding risk). See a doctor immediately.' },
  { q:['malaria','malaria symptoms'],
    a:'Malaria: cyclical fever with chills, severe headache, muscle pain, nausea, vomiting, sweating. Seek medical care immediately as blood tests are needed for diagnosis. Do NOT self-medicate. Treatment requires antimalarials prescribed by a doctor. Prevention: 30% plus DEET repellent, permethrin bed nets, eliminate standing water near home.' },
  { q:['typhoid','typhoid symptoms','typhoid fever'],
    a:'Typhoid: gradually rising fever over days, headache, weakness, abdominal pain, constipation or diarrhea, loss of appetite. Caused by contaminated food or water. Requires antibiotic treatment from a doctor. Prevention: typhoid vaccine, drink only clean water, wash hands thoroughly, avoid street food during outbreaks.' },
  { q:['covid','covid-19','coronavirus','covid symptoms'],
    a:'COVID-19 symptoms: fever, cough, fatigue, loss of taste or smell, sore throat, headache, body aches, shortness of breath. Emergency signs: difficulty breathing, persistent chest pain, confusion, inability to stay awake, bluish lips. Isolate immediately if positive. Vaccines significantly reduce severe disease. Antivirals available for high-risk individuals within 5 days of symptoms.' },
  { q:['cold','flu','influenza','common cold','running nose'],
    a:'Cold: gradual onset, mainly nasal symptoms, mild fever, lasts 7 to 10 days. Flu: sudden onset, high fever 38 to 40 degrees, severe body aches, extreme fatigue, dry cough. Treatment: rest, 3 litres of fluids daily, paracetamol for fever. See a doctor if worsening after 5 days, breathing difficulty, or you are elderly, pregnant, or have chronic illness. Annual flu vaccine recommended.' },
  { q:['cough','persistent cough','dry cough','coughing blood'],
    a:'For cough: steam inhalation, honey in warm water, throat lozenges, stay well hydrated. See a doctor if cough lasts more than 3 weeks, produces blood, is accompanied by fever above 38 degrees, or causes breathing difficulty. A chronic cough in India always needs evaluation for TB. Never ignore a cough that does not go away.' },
  { q:['acidity','heartburn','acid reflux','gerd','burning stomach'],
    a:'For acid reflux: avoid spicy, fatty, and acidic foods, eat smaller meals, do not lie down for 2 to 3 hours after eating, maintain healthy weight, limit coffee and alcohol. OTC antacids give quick relief. PPIs like omeprazole are most effective (take 30 minutes before breakfast). GERD occurring more than twice per week needs medical evaluation. Untreated it can cause esophageal damage.' },
  { q:['diarrhea','loose motions','loose stools','stomach upset'],
    a:'For diarrhea: ORS solution is the priority (1 litre water, 6 teaspoons sugar, half teaspoon salt). Follow BRAT diet (banana, rice, applesauce, toast). Most cases resolve in 2 to 3 days. EMERGENCY: blood in stool, fever above 38.5 degrees, no urination for 8 hours (severe dehydration), symptoms lasting more than 3 days, or infant or elderly person affected.' },
  { q:['constipation','no bowel movement','hard stools'],
    a:'For constipation: drink 8 to 10 glasses of water daily, eat 25 to 35 grams of fibre per day from vegetables, fruits, and whole grains, exercise daily, try warm lemon water in the morning. Safe short-term options: lactulose, bisacodyl. See a doctor if constipation lasts more than 3 weeks, there is blood in stool, or there is sudden change in bowel habits.' },
  { q:['food poisoning','vomiting after eating','contaminated food'],
    a:'Food poisoning: nausea, vomiting, diarrhea, stomach cramps within 1 to 6 hours of eating contaminated food. Treatment: rest and hydrate with ORS. Avoid solid food until vomiting stops. Most cases resolve in 1 to 2 days. Seek emergency care for: blood in stool, high fever above 38.5 degrees, severe dehydration, or symptoms lasting more than 3 days.' },
  { q:['anxiety','anxious','panic attack','stress anxiety'],
    a:'Anxiety symptoms: excessive worry, racing heart, sweating, trembling, shortness of breath, difficulty concentrating. Panic attack peaks in 10 minutes. During an attack: use 4-7-8 breathing (inhale 4 seconds, hold 7 seconds, exhale 8 seconds), ground yourself by naming 5 things you see. Regular exercise, limiting caffeine, and CBT therapy are highly effective treatments. See a doctor if anxiety significantly affects daily life.' },
  { q:['depression','depressed','feeling sad','low mood'],
    a:'Depression symptoms: persistent sadness for 2 or more weeks, loss of interest in activities, fatigue, appetite and sleep changes, difficulty concentrating, feelings of worthlessness, or thoughts of self-harm. Depression is a medical condition, not a weakness. Treatment: CBT therapy (most effective), antidepressants, regular exercise, social support. Please reach out to a doctor. You are not alone.' },
  { q:['stress','too much stress','manage stress','overwhelmed'],
    a:'Manage stress: 30 minutes of exercise daily reduces cortisol significantly, 10 minutes of meditation daily shows measurable brain changes in 8 weeks, maintain social connections, limit news and social media, prioritise 7 to 9 hours of sleep, practice gratitude, set firm work-life boundaries, spend time in nature. If stress is severe or chronic, CBT therapy is very effective.' },
  { q:['bmi','body mass index','healthy weight','what is bmi'],
    a:'BMI equals weight in kg divided by height in metres squared. Ranges: below 18.5 is Underweight, 18.5 to 24.9 is Normal and healthy, 25 to 29.9 is Overweight, 30 to 34.9 is Obese Class 1, 35 and above is Obese Class 2 or higher. Use the BMI Calculator in the app for your personal result. Note that BMI does not account for muscle mass.' },
  { q:['lose weight','weight loss','how to lose weight','fat loss'],
    a:'Safe weight loss of 0.5 to 1 kg per week: create a 500 calorie daily deficit, eat whole foods (vegetables, lean protein, whole grains), limit sugar and ultra-processed foods, drink water before meals, do 150 to 300 minutes of exercise per week combining cardio and strength training, get 7 to 9 hours of sleep (poor sleep raises hunger hormones), and manage stress.' },
  { q:['vitamin d','vitamin d deficiency','low vitamin d','sunshine vitamin'],
    a:'Vitamin D deficiency is extremely common in India. Symptoms: bone pain, muscle weakness, fatigue, frequent infections, depression. Sources: 15 to 20 minutes of sunlight daily on skin, fatty fish, egg yolks, fortified milk. Testing: ask for 25-OH-Vitamin D blood test. Levels below 20 ng per mL mean deficient. Supplements: typically 1000 to 4000 IU daily as prescribed by your doctor.' },
  { q:['iron deficiency','anemia','anaemia','low iron','low haemoglobin'],
    a:'Iron deficiency anemia: extreme fatigue, pale skin, weakness, breathlessness, dizziness, brittle nails, cold hands and feet. Very common in Indian women and children. Food sources: red meat, lentils, spinach, fortified cereals, tofu. Take with Vitamin C to increase absorption by 67%. Avoid tea or coffee within 1 hour of iron-rich meals as tannins block absorption.' },
  { q:['calcium','low calcium','osteoporosis','weak bones'],
    a:'Calcium deficiency causes muscle cramps, brittle nails, tooth decay, and long-term osteoporosis. Daily requirement is 1000 to 1200 mg. Food sources: dairy products, leafy greens, almonds, sesame seeds, fortified soy milk. Vitamin D is needed for calcium absorption. Women over 50 are at highest risk of osteoporosis.' },
  { q:['thyroid','hypothyroid','hyperthyroid','thyroid symptoms'],
    a:'Hypothyroidism (underactive): fatigue, weight gain, cold intolerance, constipation, dry skin, hair loss, depression. Hyperthyroidism (overactive): weight loss, rapid heartbeat, sweating, anxiety, tremors, heat intolerance. Both diagnosed with a simple blood test (TSH, T3, T4). Both are very treatable. Hypothyroidism: daily levothyroxine tablet. Hyperthyroidism: antithyroid drugs, radioiodine, or surgery.' },
  { q:['pcos','polycystic ovary','pcod'],
    a:'PCOS symptoms: irregular or absent periods, excess facial or body hair, acne, weight gain especially around the waist, hair thinning, dark skin creases. Affects 1 in 10 women. Diagnosis: blood tests for LH, FSH, testosterone, AMH plus pelvic ultrasound. Management: low-GI diet, regular exercise, weight loss if overweight (even 5% improves symptoms), metformin, hormonal contraceptives. See a gynaecologist.' },
  { q:['period pain','menstrual cramps','period cramps','dysmenorrhea'],
    a:'For menstrual cramp relief: ibuprofen or naproxen are most effective (take at the first sign of cramps, every 8 hours), use a heating pad on your lower abdomen, try gentle yoga. Severe cramping that disrupts daily life may indicate endometriosis or fibroids. See a gynaecologist. Oral contraceptive pills significantly reduce cramp severity if other methods fail.' },
  { q:['pregnancy','pregnant','early pregnancy signs','am i pregnant'],
    a:'Early pregnancy signs: missed period, nausea or morning sickness, breast tenderness, frequent urination, fatigue, food cravings, light spotting. Home test is accurate from the first day of a missed period. Start folic acid 400mcg immediately (prevents neural tube defects), see an OB-GYN within 8 weeks, avoid alcohol, smoking, and raw foods. Prenatal vitamins are essential.' },
  { q:['back pain','lower back pain','backache'],
    a:'For lower back pain: keep gently moving (bed rest worsens outcomes), take ibuprofen plus paracetamol combination, apply ice first 48 hours then heat, do core strengthening exercises with physiotherapy, maintain good posture. Most acute back pain resolves in 4 to 6 weeks. EMERGENCY: pain radiating to legs with weakness or numbness, bladder or bowel dysfunction (cauda equina emergency), or pain after a fall.' },
  { q:['joint pain','arthritis','knee pain','joints pain'],
    a:'For joint pain: RICE method (Rest, Ice, Compression, Elevation) for acute pain, ibuprofen with food for pain and inflammation, gentle low-impact exercise like swimming or cycling, maintain healthy weight (each kg lost reduces knee joint load by 4 kg). Rheumatoid arthritis needs specialist DMARDs to prevent joint destruction. See a rheumatologist if multiple joints are affected.' },
  { q:['kidney stone','renal stone','kidney pain'],
    a:'Kidney stones: severe wave-like pain in back or side radiating to groin (often described as the worst pain possible), painful urination, blood in urine, nausea. Small stones under 5mm usually pass with 3 litres of water per day and pain medication. Larger stones need lithotripsy or surgery. EMERGENCY: fever with kidney pain (possible infection and sepsis risk). Prevention: drink 3 litres water daily.' },
  { q:['uti','urinary tract infection','burning urination','urine infection'],
    a:'UTI symptoms: burning urination, frequent urge with little output, cloudy or smelly urine, lower abdominal pain. Requires antibiotic treatment, see a doctor. Meanwhile: drink 3 litres of water daily, urinate frequently, urinate after sex, wipe front to back. Fever with back pain and chills means the infection has reached the kidneys (pyelonephritis), a more serious condition needing stronger antibiotics.' },
  { q:['acne','pimples','breakout'],
    a:'Acne treatment: wash face twice daily with a gentle cleanser, do not pop pimples as it causes scarring, use non-comedogenic moisturiser and SPF 30 sunscreen. Active ingredients: benzoyl peroxide 2.5 to 5% kills bacteria, salicylic acid 0.5 to 2% unclogs pores. Low-glycaemic diet and stress management help. See a dermatologist for prescription treatments if acne is severe.' },
  { q:['hair loss','hair fall','alopecia','hair falling'],
    a:'Hair loss causes: nutritional deficiencies (iron, zinc, biotin, B12, Vitamin D), PCOS, thyroid disorders, stress (telogen effluvium, appears 3 months after stressor), or genetic pattern baldness. Get blood tests first to rule out treatable causes. Treatments: minoxidil (topical), nutritional supplements if deficient, finasteride for men, PRP therapy. See a dermatologist.' },
  { q:['dental','toothache','teeth pain','tooth pain'],
    a:'For toothache: rinse with warm salt water, apply cold compress externally, take ibuprofen or paracetamol for pain, apply clove oil (natural anaesthetic). Every toothache has an underlying cause that needs dental treatment. Do not delay seeing a dentist. Untreated dental infections can spread to the jaw, neck, and in serious cases the brain.' },
  { q:['eye strain','computer eye','digital eye strain'],
    a:'Digital eye strain: use the 20-20-20 rule (every 20 minutes, look at something 20 feet away for 20 seconds), blink consciously and often, adjust screen brightness to match room lighting, use preservative-free lubricating eye drops. See a doctor urgently for: sudden vision loss, new floaters or flashes (possible retinal detachment, same-day emergency!), or severe eye pain.' },
  { q:['allergy','allergic reaction','seasonal allergy'],
    a:'Allergy symptoms: sneezing, runny nose, itchy eyes, hives, rash, swelling. Antihistamines (cetirizine, loratadine) are effective and non-drowsy. Avoid known triggers. ANAPHYLAXIS EMERGENCY: throat swelling plus hives plus breathing difficulty means call 108 immediately and use an EpiPen if prescribed. Food allergies can be life-threatening — always carry your EpiPen.' },
  { q:['cancer','cancer symptoms','cancer warning signs'],
    a:'Cancer warning signs (CAUTION): Change in bowel or bladder habits, A sore not healing, Unusual bleeding, Thickening or lump anywhere, Indigestion or difficulty swallowing, Obvious mole changes, Nagging cough or hoarseness. Early detection dramatically improves survival. Recommended screenings: mammogram (women 40+), Pap smear (women 21+), colonoscopy (adults 45+).' },
  { q:['exercise','workout','fitness','physical activity'],
    a:'Exercise recommendations: 150 minutes of moderate aerobic exercise per week (brisk walking, cycling, swimming) plus 2 days of strength training. Benefits: 35% reduced heart disease risk, 50% reduced Type 2 diabetes risk, improved mood, better sleep, stronger bones, longer life. Even 10-minute walks count. Take movement breaks every 30 to 60 minutes when sitting.' },
  { q:['diet','healthy eating','balanced diet','nutrition'],
    a:'Balanced diet: fill half your plate with vegetables and fruits, quarter with whole grains, quarter with lean protein. Limit sugar, salt, saturated fat, and ultra-processed foods. Drink 8 to 10 glasses of water daily. Key nutrients Indians often lack: Vitamin D, B12, iron, calcium. Eat a variety of colourful vegetables for diverse phytonutrients. Never skip breakfast.' },
  { q:['quit smoking','stop smoking','smoking','tobacco'],
    a:'Best quit strategy: combine NRT (patches plus gum) with varenicline (Champix prescription) and counselling for 35 to 40% success rate. Benefits of quitting: heart rate normalises in 20 minutes, carbon monoxide clears in 8 hours, heart disease risk halves in 1 year, lung cancer risk halves in 10 years. Withdrawal peaks at 72 hours then decreases. Use the 4 Ds: Delay, Deep breathe, Drink water, Do something else.' },
  { q:['water','hydration','how much water','drink water'],
    a:'Adults need 2 to 3 litres (8 to 10 glasses) of water daily, more in heat or during exercise. Urine colour is the best indicator: pale yellow means well hydrated, dark yellow means drink more. Dehydration signs: headache, fatigue, difficulty concentrating, dizziness. Drink a glass of water first thing in the morning. Limit sugary drinks and excess caffeine.' },
  { q:['emergency','call 108','ambulance','when to go to hospital'],
    a:'Call 108 IMMEDIATELY for: chest pain or pressure, difficulty breathing, sudden severe headache (worst ever), sudden vision loss, sudden face, arm, or leg weakness (stroke), uncontrolled bleeding, unconsciousness, seizures, severe allergic reaction with throat swelling, suspected poisoning, severe burns, any fever in infant under 3 months, or thoughts of self-harm. When in doubt, always call. It is better to call and not need it than not call when needed.' },
  { q:['paracetamol','panadol','dolo','crocin','acetaminophen'],
    a:'Paracetamol: used for pain and fever. Adult dose: 500 to 1000mg every 4 to 6 hours, maximum 4000mg per day. Children: 15mg per kg per dose. Do NOT exceed the dose as overdose causes serious liver damage. Avoid alcohol while taking it. Do not combine with other paracetamol-containing products like cold medicines. Generally safe in pregnancy when used as directed.' },
  { q:['ibuprofen','brufen','anti-inflammatory','advil'],
    a:'Ibuprofen: treats pain, fever, and inflammation. Adult dose: 400 to 600mg with food every 6 to 8 hours, maximum 2400mg per day. Always take with food to protect the stomach. Avoid if you have kidney disease, stomach ulcers, are pregnant (especially third trimester), or take blood thinners. Not for children under 3 months.' },
  { q:['antibiotic','antibiotics','amoxicillin','azithromycin'],
    a:'Antibiotics only work against bacterial infections. They do NOT work for viral infections like colds, flu, or COVID-19. Never self-medicate with antibiotics. Always complete the full prescribed course even if you feel better. Stopping early causes antibiotic resistance. Side effects: diarrhea (take probiotics), nausea. Your doctor will prescribe the correct antibiotic and dose for your specific infection.' },
];

const FIRST_AID_QA = [
  { q:['cut','got cut','deep cut','knife cut','bleeding cut','wound bleeding','laceration'], a:'For a cut: wash hands, apply firm direct pressure with clean cloth for 10 minutes, rinse with clean water, apply antiseptic, cover with sterile dressing. Go to urgent care if bleeding will not stop, wound is deep/gaping, caused by dirty metal/animal bite, numbness occurs, or tetanus vaccine is not up to date.' },
  { q:['bone broken','broken bone','fracture','bone fracture','arm broken','leg broken'], a:'Possible fracture: do not move or straighten the limb. Immobilize it with a splint or support, apply ice wrapped in cloth, elevate if possible, and go for X-ray/orthopedic care urgently. CALL 108 if severe deformity, open bone, heavy bleeding, head/neck/back injury, or severe pain.' },
  { q:['sprain','ankle sprain','twisted ankle','wrist sprain'], a:'For sprain: use RICE — Rest, Ice 15-20 min every 2-3 hours for 48 hours, Compression bandage, Elevation. Avoid massage/heat in first 48 hours. See doctor if unable to bear weight, severe swelling, numbness, deformity, or pain not improving in 2-3 days.' },
  { q:['burn','burned','scald','hot water burn','oil burn'], a:'For minor burn: cool under running cool water for 20 minutes, remove tight jewelry/clothing near area, cover with clean non-stick dressing. Do not apply toothpaste, butter, oil, or ice. Urgent care for large/deep burns, blisters on face/hands/genitals, electrical/chemical burns, or breathing difficulty.' },
  { q:['chemical burn','acid burn','alkali burn'], a:'Chemical burn: remove contaminated clothing carefully and rinse skin/eye with running water for at least 20 minutes. Do not neutralize with another chemical. CALL 108 or go to emergency care, especially for eye, face, large area, or strong acid/alkali exposure.' },
  { q:['electric shock','electrocution','current shock'], a:'Electrical injury: switch off power before touching the person. CALL 108 if loss of consciousness, chest pain, burns, pregnancy, or high-voltage exposure. Even if okay, medical check is recommended because heart rhythm problems can occur.' },
  { q:['nose bleeding','nosebleed','nose bleed'], a:'For nosebleed: sit upright, lean forward, pinch the soft part of nose continuously for 10-15 minutes, breathe through mouth. Do not tilt head back. Seek care if bleeding lasts over 20 minutes, follows injury, is very heavy, or patient uses blood thinners.' },
  { q:['dog bite','cat bite','animal bite','monkey bite'], a:'Animal bite: wash wound under running water with soap for 15 minutes, apply antiseptic, cover loosely, and see a doctor urgently. Rabies vaccination may be needed, plus tetanus and antibiotics. Do not ignore even small bites/scratches.' },
  { q:['snake bite','snakebite'], a:'Snake bite emergency: keep person still, remove rings/tight items, immobilize limb below heart level, note snake appearance if safe. Do NOT cut, suck venom, apply tourniquet, or give alcohol. CALL 108 and get antivenom-capable hospital care immediately.' },
  { q:['bee sting','wasp sting','insect sting'], a:'For bee/wasp sting: remove stinger by scraping, wash area, apply cold pack, take antihistamine for itching if safe. CALL 108 for swelling of lips/tongue/throat, wheezing, dizziness, widespread hives, or breathing difficulty — possible anaphylaxis.' },
  { q:['allergic reaction','anaphylaxis','throat swelling','face swelling'], a:'Severe allergy/anaphylaxis: CALL 108 immediately. Signs: breathing difficulty, throat/tongue swelling, dizziness, widespread hives, vomiting after allergen. Use epinephrine auto-injector if prescribed. Lie down with legs raised unless breathing is difficult.' },
  { q:['choking','food stuck throat','cant breathe choking'], a:'Choking: if person cannot cough/speak/breathe, call emergency help and give abdominal thrusts (Heimlich) for adults/children over 1 year. For infants, use back blows and chest thrusts. If they become unconscious, start CPR.' },
  { q:['seizure','fits','convulsion'], a:'During seizure: protect from injury, move objects away, cushion head, turn on side after jerking stops, time it. Do not put anything in mouth or restrain. CALL 108 if seizure lasts over 5 minutes, repeats, person is pregnant/diabetic/injured, or breathing does not recover.' },
  { q:['fainted','fainting','passed out','unconscious'], a:'If fainted: lay person flat, raise legs, loosen tight clothing, check breathing. Do not give food/drink until fully awake. CALL 108 if unconscious over 1 minute, chest pain, breathlessness, injury, seizure, pregnancy, diabetes, or repeated fainting.' },
  { q:['poison','poisoning','drank poison','ate poison','overdose'], a:'Poisoning/overdose: CALL 108 or poison control immediately. Do not induce vomiting unless told by professionals. Keep container/medicine strip for doctors. If unconscious or breathing poorly, place on side and seek emergency care.' },
  { q:['eye injury','something in eye','chemical in eye','eye burn'], a:'Eye injury: do not rub. Rinse with clean running water/saline. For chemical exposure rinse continuously 20 minutes and go emergency. For sharp object, vision change, severe pain, or embedded object, cover eye lightly and seek urgent ophthalmology care.' },
  { q:['head injury','hit head','fell on head','concussion'], a:'Head injury: rest and monitor. CALL 108/urgent care for loss of consciousness, repeated vomiting, seizure, worsening headache, confusion, weakness, unequal pupils, blood/fluid from ear/nose, or injury while on blood thinners.' },
  { q:['heat stroke','heatstroke','overheated','heat exhaustion'], a:'Heat illness: move to cool place, remove excess clothing, cool with wet cloth/fan, sip ORS/water if awake. CALL 108 for confusion, fainting, very high temperature, seizures, or no sweating with hot skin — heatstroke is life-threatening.' },
  { q:['hypothermia','too cold','cold exposure'], a:'Cold exposure: move to warm place, remove wet clothes, wrap in blankets, give warm sweet drink if fully awake. Do not rub skin or use direct high heat. Emergency care for confusion, drowsiness, slow breathing, or severe shivering that stops.' },
  { q:['chest injury','rib injury','rib fracture'], a:'Rib/chest injury: sit upright, apply ice, avoid tight bandaging around chest. Urgent care if breathing difficulty, coughing blood, severe chest pain, blue lips, or injury from major accident.' },
  { q:['heavy bleeding','blood loss','bleeding a lot'], a:'Heavy bleeding: CALL 108. Apply firm direct pressure with cloth/gauze, add more layers if soaked, do not remove embedded objects, raise limb if possible. Use tourniquet only for life-threatening limb bleeding if trained.' },
  { q:['glass in skin','object stuck','embedded object'], a:'If glass/object is embedded: do not pull it out if deep or bleeding. Stabilize around it with cloth, apply pressure around wound, and go to emergency care. Small superficial splinters can be removed with clean tweezers after washing.' },
  { q:['tooth broken','knocked tooth','tooth knocked out'], a:'Knocked-out adult tooth: hold by crown, do not scrub root, rinse briefly if dirty, place in milk/saline or back in socket if possible, see dentist within 30-60 minutes. Broken tooth also needs dental care.' },
  { q:['ear bleeding','ear injury'], a:'Ear bleeding after injury can be serious. Do not put anything inside ear. Cover lightly and seek urgent care, especially after head injury, dizziness, hearing loss, or fluid/blood from ear.' },
  { q:['vomiting blood','blood vomit'], a:'Vomiting blood is an emergency. CALL 108 or go to ER. Do not eat/drink. Sit upright or lie on side if dizzy. Causes can include stomach bleeding and need urgent evaluation.' },
  { q:['blood in stool','black stool','bloody stool'], a:'Blood in stool or black tarry stool needs medical evaluation. Emergency if heavy bleeding, dizziness, severe abdominal pain, vomiting blood, or weakness. Do not ignore recurrent bleeding.' },
  { q:['blood in urine','urine blood'], a:'Blood in urine needs evaluation for infection, stone, injury, or kidney/bladder disease. Seek urgent care if with fever, flank pain, clots, inability to urinate, or after trauma.' },
  { q:['asthma attack','wheezing','cant breathe','breathing problem'], a:'Breathing difficulty/wheezing: sit upright, use prescribed rescue inhaler, stay calm. CALL 108 if severe breathlessness, lips blue, cannot speak full sentences, chest pain, drowsiness, or inhaler not helping.' },
  { q:['low sugar','hypoglycemia','sugar low'], a:'Low blood sugar: if awake, take 15g fast sugar such as glucose tablets, juice, or 3 teaspoons sugar in water. Recheck after 15 minutes. If unconscious/seizure, do not give oral food; CALL 108.' },
  { q:['high sugar','very high glucose','diabetic ketoacidosis'], a:'Very high sugar with vomiting, abdominal pain, deep breathing, fruity breath, confusion, or dehydration can be diabetic ketoacidosis. Seek emergency care. Drink water if awake and follow diabetes sick-day plan.' },
];

const BASIC_QA = [
  { q:['small wound','scratch','abrasion'], a:'Clean with running water, remove visible dirt, apply antiseptic, cover if rubbing against clothes. Watch for infection: increasing redness, swelling, warmth, pus, fever, or red streaks.' },
  { q:['blister','shoe bite'], a:'Do not pop small blisters. Wash, cover with clean dressing, reduce friction. If popped, keep skin flap, clean, antiseptic, cover. Diabetic foot blisters need medical review.' },
  { q:['skin infection','pus','boil'], a:'Warm compress 10-15 minutes several times daily. Do not squeeze deep boils. See doctor for fever, spreading redness, severe pain, face/genital location, diabetes, or recurrent boils.' },
  { q:['cellulitis','red swollen skin'], a:'Spreading red, warm, painful skin may be cellulitis and often needs antibiotics. Seek care quickly, especially with fever, diabetes, immune problems, or red streaks.' },
  { q:['ringworm','fungal rash'], a:'Ringworm often forms itchy circular scaly patches. Keep area dry, avoid sharing towels, use antifungal cream as advised. Steroid creams can worsen fungus; see doctor if widespread or not improving.' },
  { q:['eye red','red eye','pink eye'], a:'Red eye can be allergy, infection, dryness, or injury. Avoid rubbing and sharing towels. Urgent care for pain, vision change, light sensitivity, contact lens use, or chemical exposure.' },
  { q:['ear pain','earache'], a:'Use pain relief if safe and warm compress. Do not insert earbuds/oil. See doctor for fever, discharge, hearing loss, severe pain, dizziness, or child ear pain.' },
  { q:['throat pain','sore throat'], a:'Warm salt gargles, fluids, lozenges, paracetamol can help. See doctor for high fever, pus on tonsils, breathing difficulty, drooling, neck swelling, or symptoms over 5 days.' },
  { q:['tonsils','tonsillitis'], a:'Tonsillitis may be viral or bacterial. Rest, fluids, salt gargle. Doctor may test for strep if fever, swollen nodes, no cough, pus. Do not self-start antibiotics.' },
  { q:['mouth ulcer','canker sore'], a:'Most mouth ulcers heal in 7-14 days. Avoid spicy/acidic foods, use saltwater rinse, maintain oral hygiene. See doctor/dentist if large, recurrent, bleeding, or lasting over 2 weeks.' },
  { q:['stomach pain','abdominal pain'], a:'Mild stomach pain: rest, fluids, bland food. Urgent care for severe/worsening pain, right lower abdomen pain, blood in stool/vomit, pregnancy, fever, rigid belly, or persistent vomiting.' },
  { q:['appendix','appendicitis'], a:'Possible appendicitis: pain often starts near navel then moves to right lower abdomen, with fever, nausea, loss of appetite. Do not delay; go to emergency care.' },
  { q:['gas','bloating'], a:'Eat slowly, avoid carbonated drinks, walk after meals, consider simethicone. See doctor if persistent bloating with weight loss, vomiting, severe pain, blood in stool, or new symptoms after age 45.' },
  { q:['vomiting','throwing up'], a:'Sip ORS/water frequently, avoid solid food briefly, restart bland foods. Urgent care for blood, severe dehydration, stiff neck, severe abdominal pain, pregnancy, or vomiting over 24 hours.' },
  { q:['dehydration','very thirsty'], a:'Use ORS, small frequent sips, rest in cool place. Urgent care for very little urine, dizziness, confusion, sunken eyes, fast heartbeat, or dehydration in infants/elderly.' },
  { q:['period heavy','heavy bleeding period'], a:'Heavy periods need gynecology review if soaking pads hourly, clots, dizziness, anemia symptoms, bleeding over 7 days, or pregnancy possibility. Seek urgent care if faint or very weak.' },
  { q:['pregnancy bleeding','bleeding pregnant'], a:'Bleeding during pregnancy needs urgent medical evaluation, especially with pain, dizziness, clots, or heavy bleeding. Contact OB/GYN or emergency care.' },
  { q:['high fever child','child fever'], a:'Child fever: fluids, light clothing, paracetamol by weight. Urgent care for age under 3 months, breathing difficulty, seizure, stiff neck, rash, dehydration, extreme sleepiness, or fever >40°C.' },
  { q:['baby not feeding','infant not feeding'], a:'Infant not feeding can become serious quickly. Seek medical care if poor feeding, fewer wet diapers, fever, lethargy, vomiting, breathing difficulty, or age under 3 months.' },
  { q:['covid test positive','positive covid'], a:'Isolate, rest, fluids, monitor oxygen if possible. Seek urgent care for SpO₂ <94%, breathlessness, chest pain, confusion, blue lips, or high-risk conditions.' },
  { q:['dengue warning','platelet low'], a:'Dengue warning signs: severe abdominal pain, persistent vomiting, bleeding, lethargy/restlessness, breathing difficulty, low urine. Avoid ibuprofen/aspirin; use paracetamol only and see doctor.' },
  { q:['malaria fever chills'], a:'Fever with chills/sweats in malaria areas needs blood test. Do not self-medicate; see doctor for antimalarial treatment. Emergency for confusion, jaundice, breathlessness, severe weakness.' },
  { q:['tb','tuberculosis'], a:'TB symptoms: cough over 2 weeks, fever, night sweats, weight loss, blood in sputum. Get sputum test/chest X-ray. TB is curable but needs full treatment course.' },
  { q:['high bp emergency','bp 180','bp very high'], a:'BP ≥180 systolic or ≥120 diastolic with chest pain, breathlessness, severe headache, weakness, confusion, or vision changes is emergency. CALL 108/ER. Do not rapidly lower BP without medical supervision.' },
  { q:['palpitations','heart racing'], a:'Palpitations can be stress, caffeine, thyroid, anemia, arrhythmia. Seek urgent care if with chest pain, fainting, breathlessness, dizziness, or sustained very fast/irregular heartbeat.' },
  { q:['leg swelling','swollen leg'], a:'One-sided leg swelling/pain can be clot. Urgent care if one leg swollen, warm, painful, or with breathlessness/chest pain. Both-leg swelling may be heart/kidney/liver issue; see doctor.' },
  { q:['calf pain','dvt'], a:'Calf pain with swelling/warmth/redness may be DVT. Do not massage. Seek urgent medical evaluation, especially after travel, surgery, pregnancy, or immobilization.' },
  { q:['back pain red flags'], a:'Back pain emergency signs: leg weakness, numbness in groin/saddle area, bladder/bowel loss, fever, cancer history, major trauma, or unexplained weight loss. Seek urgent care.' },
  { q:['neck pain','stiff neck'], a:'Neck pain after strain: gentle movement, heat/ice, pain relief. Emergency if after trauma, with fever/headache/rash, weakness/numbness, or severe stiffness.' },
  { q:['migraine aura','vision flashing'], a:'Migraine aura can cause visual zigzags/flashes before headache. Urgent care for first-ever aura, sudden vision loss, weakness, speech trouble, or worst headache.' },
  { q:['floaters','flashes eye'], a:'New flashes/floaters or curtain over vision can mean retinal tear/detachment. Same-day eye doctor/emergency evaluation is needed.' },
  { q:['medicine missed dose','missed dose'], a:'For missed dose: take when remembered unless close to next dose; do not double unless doctor says. Some medicines differ, especially insulin, blood thinners, seizure meds; ask pharmacist/doctor.' },
  { q:['medicine side effect','drug reaction'], a:'Stop and seek urgent help for breathing difficulty, face/tongue swelling, severe rash/blisters, fainting, or chest pain after medicine. For mild side effects, contact prescriber before stopping essential meds.' },
  { q:['antibiotic diarrhea'], a:'Mild diarrhea can occur with antibiotics. Hydrate and consider probiotics. Urgent care for blood, severe cramps, fever, or watery diarrhea many times daily after antibiotics.' },
  { q:['vaccine fever','after vaccine fever'], a:'Mild fever/body ache after vaccine is common for 1-2 days. Fluids and paracetamol if safe. Seek care for breathing difficulty, face swelling, persistent high fever, seizure, or severe allergic symptoms.' },
  { q:['rabies vaccine','rabies'], a:'After dog/cat/monkey bite or scratch, wash 15 minutes and see doctor for rabies vaccination. Rabies is almost always fatal after symptoms, so prevention is urgent.' },
  { q:['tetanus','tt injection'], a:'Tetanus booster may be needed after dirty wounds, metal cuts, animal bites, burns, or deep punctures if not vaccinated recently. Ask a doctor promptly.' },
  { q:['puncture wound','nail stepped'], a:'Puncture wounds need cleaning and tetanus review. Foot punctures can infect deeply. See doctor for dirty/rusty nail, diabetes, deep wound, swelling, pus, or increasing pain.' },
  { q:['sunburn'], a:'Cool baths/compresses, aloe/moisturizer, fluids, avoid sun. Seek care for severe blistering, fever, chills, confusion, dehydration, or large area burns.' },
  { q:['food allergy'], a:'Mild food allergy: antihistamine may help. Severe symptoms like throat swelling, wheeze, dizziness, or repeated vomiting need emergency care. Avoid trigger and consider allergy evaluation.' },
  { q:['panic attack heart attack'], a:'Panic can mimic heart attack, but chest pressure, sweating, nausea, breathlessness, or risk factors should be treated seriously. If unsure, seek emergency care.' },
  { q:['suicidal','self harm','want to die'], a:'I am really sorry you are feeling this. Please contact emergency services now or go to the nearest ER. If in India, call 112/108. Stay with someone you trust and move away from anything you could use to hurt yourself.' },
  { q:['sexual assault','rape'], a:'I am sorry this happened. Go to a safe place and seek emergency medical care as soon as possible for injuries, emergency contraception, STI prevention, and forensic support. Consider contacting police or a trusted person.' },
];

const MORE_QA = [
  { q:['what to do after fall','fell down','fall injury'], a:'After a fall: sit/lie safely, check for head injury, severe pain, swelling, deformity, or trouble walking. Apply ice for swelling. Seek urgent care for head hit, loss of consciousness, vomiting, confusion, fracture suspicion, chest/abdominal pain, or elderly patient fall.' },
  { q:['wound infection','cut infected','infection after cut'], a:'Possible wound infection signs: increasing redness, warmth, swelling, pus, bad smell, fever, red streaks, or worsening pain. Keep it clean and covered, but see a doctor because antibiotics or drainage may be needed.' },
  { q:['deep cut','stitches needed','gaping wound'], a:'A cut may need stitches if it is deep, gaping, on face/joint/hand, bleeding after 10 minutes pressure, caused by bite/rusty object/glass, or has numbness. Clean gently, apply pressure, cover, and go urgent.' },
  { q:['rusty nail cut','rusted metal cut','metal cut'], a:'Rusty/dirty metal wounds need cleaning and tetanus review. Wash with running water, apply antiseptic, cover, and see a doctor if deep, dirty, puncture wound, swelling, pus, or tetanus vaccine not updated.' },
  { q:['sprain ankle','twisted ankle','ankle swelling'], a:'Ankle sprain: rest, ice 15-20 minutes, compression bandage, elevation. Avoid weight if painful. Get X-ray/doctor review if unable to walk 4 steps, severe swelling, deformity, numbness, or pain over bone.' },
  { q:['shoulder pain','frozen shoulder'], a:'Shoulder pain can be strain, rotator cuff injury, frozen shoulder, or arthritis. Rest from heavy lifting, ice/heat, gentle range movement. See doctor for weakness, deformity, injury, fever, chest pain, or pain lasting over 1-2 weeks.' },
  { q:['hand pain','wrist pain'], a:'Hand/wrist pain after injury needs rest, ice, and support. Seek care for swelling, deformity, numbness, severe pain, inability to grip, or pain after fall on outstretched hand because fracture is possible.' },
  { q:['leg pain','body pain'], a:'Body/leg pain often comes from viral fever, dehydration, overuse, low vitamin D, or muscle strain. Hydrate and rest. Urgent care if one leg is swollen/warm, severe weakness, chest pain, breathlessness, high fever, or dark urine.' },
  { q:['muscle cramp','cramps'], a:'Muscle cramps: stretch gently, massage, hydrate, consider ORS if sweating. Causes include dehydration, low electrolytes, overuse. See doctor for frequent cramps, weakness, swelling, severe pain, or medication-related cramps.' },
  { q:['weakness','feeling weak','fatigue'], a:'Fatigue can come from poor sleep, stress, anemia, thyroid, diabetes, infection, vitamin deficiency, or depression. Hydrate and rest. See doctor if persistent over 2 weeks, with weight loss, fever, breathlessness, chest pain, dizziness, or fainting.' },
  { q:['dizziness','vertigo','room spinning'], a:'Dizziness can be dehydration, low BP/sugar, ear vertigo, anemia, or heart rhythm issue. Sit/lie down and hydrate. Urgent care if with chest pain, weakness, slurred speech, severe headache, fainting, or new neurological symptoms.' },
  { q:['nausea','feeling vomiting'], a:'For nausea: sip fluids/ORS, eat bland foods, avoid oily/spicy meals. Seek care for severe abdominal pain, dehydration, blood vomit, pregnancy concern, head injury, high fever, or vomiting lasting over 24 hours.' },
  { q:['loss appetite','not hungry'], a:'Loss of appetite may occur with infection, stress, acidity, liver issues, depression, or medicines. Eat small light meals and hydrate. See doctor if lasting over a week, with weight loss, fever, jaundice, pain, or vomiting.' },
  { q:['jaundice','yellow eyes','yellow skin'], a:'Yellow eyes/skin suggests jaundice and needs medical evaluation with liver tests. Seek urgent care if severe weakness, confusion, vomiting, abdominal pain, bleeding, dark urine, or pregnancy.' },
  { q:['liver problem','fatty liver'], a:'Fatty liver is common and often linked to weight, diabetes, alcohol, or high triglycerides. Management: weight loss, exercise, reduce sugar/alcohol, control diabetes/lipids. Confirm with doctor and liver function tests.' },
  { q:['cholesterol','high cholesterol','triglycerides'], a:'High cholesterol increases heart/stroke risk. Improve with exercise, weight control, less fried/processed food, more fibre, nuts, and fish/lean protein. Some people need statins. Check lipid profile and discuss risk with doctor.' },
  { q:['thyroid test','tsh high','tsh low'], a:'TSH high often suggests hypothyroidism; TSH low can suggest hyperthyroidism. Do not self-dose thyroid medicine. Show TSH/T3/T4 reports to doctor because dose depends on age, pregnancy, heart risk, and symptoms.' },
  { q:['b12 deficiency','vitamin b12'], a:'B12 deficiency may cause fatigue, tingling, numbness, mouth ulcers, memory issues, and anemia. Common in vegetarians. Diagnosis is blood test. Treatment may be tablets or injections as doctor advises.' },
  { q:['zinc deficiency','biotin'], a:'Zinc/biotin issues can affect hair, nails, and skin, but supplements are not always needed. Check diet and consider tests for iron, thyroid, B12, vitamin D. Avoid high-dose supplements without medical advice.' },
  { q:['protein deficiency','how much protein'], a:'Most adults need roughly 0.8-1.2 g protein/kg/day, more for athletes/elderly as advised. Sources: dal, paneer, eggs, fish, chicken, soy, curd, beans. Kidney disease patients should ask doctor before high protein.' },
  { q:['water intake','how much water'], a:'Most adults need about 2-3 litres fluids daily, more with heat/exercise. Urine pale yellow is a rough sign. Limit water if doctor has restricted fluids for heart/kidney/liver disease.' },
  { q:['ors how to make','make ors'], a:'Homemade ORS: 1 litre clean water + 6 level teaspoons sugar + half level teaspoon salt. Mix fully. Sip often. Too much salt is dangerous, so measure carefully.' },
  { q:['paracetamol dose','crocin dose','dolo dose'], a:'Adult paracetamol is commonly 500-1000 mg every 6-8 hours as needed, max usually 3000-4000 mg/day depending on health. Avoid overdose and avoid with serious liver disease/alcohol misuse. Children need weight-based dosing.' },
  { q:['ibuprofen dose','combiflam','brufen'], a:'Ibuprofen can help pain/inflammation but take with food. Avoid in stomach ulcer, kidney disease, blood thinners, pregnancy late stage, dengue suspicion, or severe dehydration. Ask doctor if unsure.' },
  { q:['antibiotic','which antibiotic'], a:'Antibiotics should not be self-started. They work for bacterial infections, not viral cold/flu. Wrong use causes resistance and side effects. See doctor for fever with pus, pneumonia signs, UTI, skin infection, or persistent/worsening symptoms.' },
  { q:['can i take medicine','medicine interaction'], a:'Medicine safety depends on age, pregnancy, kidney/liver disease, allergies, and other medicines. Tell me the medicine name and your condition, but confirm with doctor/pharmacist before combining medicines.' },
  { q:['pregnancy medicine','medicine during pregnancy'], a:'Do not self-medicate during pregnancy. Some common medicines are unsafe. Contact OB/GYN for fever, pain, vomiting, bleeding, UTI symptoms, or any new medicine. Folic acid/prenatal vitamins are usually advised.' },
  { q:['period late','missed period'], a:'Late period can be pregnancy, stress, weight change, PCOS, thyroid, or illness. Take a home pregnancy test if sexually active. See gynecologist if repeated irregular cycles, heavy bleeding, severe pain, or positive test.' },
  { q:['white discharge','vaginal discharge'], a:'Some discharge is normal. See gynecologist if foul smell, itching, burning urination, pelvic pain, fever, green/yellow discharge, or pregnancy. Avoid self-treatment without diagnosis.' },
  { q:['burning urine male','urine burning male'], a:'Burning urine in men needs doctor review for UTI, STI, prostatitis, or stones. Drink water, avoid delaying urination, and seek care especially with fever, discharge, testicular pain, or flank pain.' },
  { q:['testicular pain','scrotum pain'], a:'Sudden/severe testicular pain is an emergency because torsion can permanently damage testicle within hours. Go to emergency now, especially with swelling, nausea, high-riding testicle, or after injury.' },
  { q:['breast lump','lump in breast'], a:'A breast lump needs medical evaluation even if painless. Urgent review if hard/fixed lump, skin dimpling, nipple discharge/blood, nipple inversion, or family history. Many lumps are benign but should be checked.' },
  { q:['lump neck','swollen lymph node'], a:'Swollen nodes often follow infection. See doctor if node is hard/fixed, growing, above collarbone, lasting over 3-4 weeks, or with fever/night sweats/weight loss.' },
  { q:['skin mole','mole changing'], a:'Mole warning ABCDE: Asymmetry, Border irregular, Color varied, Diameter >6mm, Evolving/changing. See dermatologist promptly for changing, bleeding, itchy, or new suspicious mole.' },
  { q:['itching all over','body itching'], a:'Body itching can be allergy, dry skin, scabies, liver/kidney issues, diabetes, or medicines. Moisturize, avoid hot baths. See doctor if severe, with rash, jaundice, swelling, fever, or persistent.' },
  { q:['scabies','itching at night'], a:'Scabies causes intense night itching, often between fingers/wrists/waist, and spreads in family. Needs prescription treatment for patient and close contacts plus washing bedding/clothes.' },
  { q:['hives','urticaria'], a:'Hives are itchy raised welts often allergic. Antihistamine may help. Emergency if lip/tongue/throat swelling, wheezing, dizziness, or breathing trouble. Track triggers and see doctor if recurrent.' },
  { q:['dry skin','eczema flare'], a:'For dry skin/eczema: fragrance-free moisturizer multiple times daily, mild soap, avoid hot baths and scratching. See doctor if oozing, infection, severe itch, widespread rash, or not improving.' },
  { q:['psoriasis','scaly patches'], a:'Psoriasis causes thick scaly patches often on elbows/knees/scalp. It is not contagious. Dermatologist can prescribe creams/light therapy/medicines. Seek review if joint pain occurs.' },
  { q:['nail black','black nail'], a:'Black nail can be injury bruise, fungus, or rarely melanoma. Seek dermatology review if no injury, stripe widens, pigment spreads to skin, pain/swelling, or does not grow out.' },
  { q:['mouth smell','bad breath'], a:'Bad breath commonly comes from dental plaque, gum disease, tongue coating, dry mouth, acidity, or sinus issues. Brush/floss, clean tongue, hydrate. Dentist review if persistent.' },
  { q:['gum bleeding','bleeding gums'], a:'Bleeding gums often mean gum inflammation, but can also occur with vitamin deficiency or bleeding disorders. Improve brushing/flossing and see dentist. Urgent if spontaneous heavy bleeding or with dengue symptoms.' },
  { q:['sinus','sinusitis'], a:'Sinus symptoms: facial pressure, blocked nose, thick discharge. Steam, saline spray, fluids may help. See doctor if fever, severe face pain, symptoms over 10 days, worsening after improving, or eye swelling.' },
  { q:['ear wax','ear blocked'], a:'Do not insert earbuds/pins. Earwax blockage can be treated with drops or doctor cleaning. Seek care for pain, discharge, hearing loss, dizziness, or after injury.' },
  { q:['hearing loss','sudden hearing loss'], a:'Sudden hearing loss is urgent and should be assessed same day by ENT. Do not wait. Causes can be treatable if managed early.' },
  { q:['snoring','sleep apnea'], a:'Loud snoring with choking/gasping, daytime sleepiness, morning headache, obesity, or high BP may be sleep apnea. It increases heart risk. See doctor for sleep study; CPAP can help.' },
  { q:['oxygen low','spo2 low'], a:'SpO2 below 94% at rest, or breathlessness/chest pain/confusion/blue lips, needs urgent medical care. Check reading with warm fingers and proper device, but do not delay if symptoms are serious.' },
  { q:['covid oxygen','oxygen 90'], a:'Oxygen around 90% is dangerous. Seek emergency care now. Sit upright, avoid exertion, and call 108/doctor. Do not rely only on home remedies.' },
  { q:['asthma inhaler how to use','inhaler use'], a:'Inhaler basics: shake, breathe out, seal lips, press once while breathing in slowly, hold breath 10 seconds. Spacer improves delivery. If needing rescue inhaler often or breathlessness persists, see doctor urgently.' },
  { q:['chest tightness','tight chest'], a:'Chest tightness can be heart, asthma, anxiety, acidity, or muscle strain. Treat as urgent if with breathlessness, sweating, nausea, pain spreading to arm/jaw/back, dizziness, or risk factors.' },
  { q:['gas chest pain','acidity chest'], a:'Acidity chest burning often follows meals/lying down and improves with antacid, but heart pain can mimic acidity. If chest pressure, sweating, breathlessness, arm/jaw pain, or uncertainty, seek emergency care.' },
  { q:['bp medicine missed','missed bp tablet'], a:'For missed BP tablet, take when remembered unless close to next dose. Do not double dose. If BP is very high with symptoms like chest pain, headache, weakness, or vision change, seek urgent care.' },
  { q:['sugar medicine missed','missed diabetes medicine'], a:'Missed diabetes medicine advice depends on drug/insulin and sugar level. Do not double randomly. Check glucose if possible and follow doctor plan. Seek care for very high sugar with vomiting/confusion or low sugar symptoms.' },
  { q:['fasting sugar normal','hba1c normal'], a:'General targets: fasting glucose often 70-99 mg/dL normal, 100-125 prediabetes, 126+ diabetes range; HbA1c below 5.7 normal, 5.7-6.4 prediabetes, 6.5+ diabetes range. Confirm with doctor/lab.' },
  { q:['cbc report','blood report'], a:'CBC checks hemoglobin, WBC, platelets. Abnormal results need context with symptoms. Low Hb suggests anemia, high WBC infection/inflammation, low platelets can occur in dengue and needs monitoring.' },
  { q:['platelet count','platelets low'], a:'Low platelets can happen in dengue, viral infections, medicines, or blood disorders. Seek urgent care for bleeding, very low count, dengue warning signs, severe weakness, or black stool.' },
  { q:['creatinine high','kidney function'], a:'High creatinine suggests kidney stress/disease and needs doctor evaluation. Avoid dehydration and avoid NSAIDs like ibuprofen unless doctor says. Urgent care if low urine, swelling, breathlessness, confusion, or very high potassium.' },
  { q:['sgpt high','lft high'], a:'High SGPT/LFT can be fatty liver, hepatitis, alcohol, medicines, or infection. Avoid alcohol and unnecessary medicines. See doctor for jaundice, vomiting, abdominal pain, confusion, or very high values.' },
  { q:['uric acid','gout'], a:'Gout causes sudden painful swollen joint, often big toe. Reduce alcohol, sugary drinks, red meat/seafood; hydrate. Doctor may prescribe anti-inflammatory or uric-acid medicine. Do not start long-term meds without advice.' },
  { q:['first aid kit','home first aid'], a:'Useful home first-aid kit: sterile gauze, bandages, antiseptic, thermometer, ORS, paracetamol, antihistamine, tweezers, gloves, medical tape, scissors, burn gel, and emergency contacts. Check expiry dates.' },
  { q:['when call ambulance','call 108'], a:'Call 108 for chest pain, stroke signs, severe breathing difficulty, major bleeding, unconsciousness, seizures over 5 minutes, severe injury/fracture, poisoning, severe burns, anaphylaxis, or any life-threatening situation.' },
  { q:['doctor near me','which doctor'], a:'Choose doctor by symptom: fever/cough/stomach - physician; skin/rash - dermatologist; bone/joint injury - orthopedics; child - pediatrician; pregnancy/period - gynecologist; chest pain - emergency/cardiology; severe headache/weakness - neurology/emergency.' },
  { q:['medical report pdf','doctor report'], a:'Use the AI Doctor Report page to summarize symptoms, medicines, vitals, and recommendations into a PDF. It is useful for project demo and doctor visits, but it does not replace a real diagnosis.' },
];

QA.unshift(...FIRST_AID_QA, ...BASIC_QA, ...MORE_QA);

function normalizeText(input) {
  return String(input || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function answerForKey(key) {
  const wanted = normalizeText(key);
  return QA.find(item => item.q.some(kw => normalizeText(kw) === wanted))?.a || null;
}

const CRITICAL_INTENTS = [
  { test: /\b(chest pain|chest pressure|crushing chest|pain.*left arm|heart attack)\b/, key: 'heart attack' },
  { test: /\b(face droop|face is drooping|facial drooping|speech.*slur|arm weakness|brain stroke)\b/, key: 'stroke' },
  { test: /\b(cannot breathe|can t breathe|difficulty breathing|lips.*blue|oxygen low|severe breathlessness)\b/, key: 'breathing problem' },
  {
    test: /\b(kill myself|suicid\w*|self harm|end my life|want to die)\b/,
    answer: 'I am sorry you are going through this. Please get emergency help now: in India call 112 or 108, or go to the nearest emergency department. Stay with someone you trust, move away from anything you could use to hurt yourself, and tell that person clearly that you need help. You deserve immediate, real-world support.',
  },
  {
    test: /\b(pregnan\w*.*bleed\w*|bleed\w*.*pregnan\w*)\b/,
    key: 'pregnancy bleeding',
  },
  {
    test: /\b(blood.*urine|urine.*blood|haematuria|hematuria)\b/,
    key: 'blood in urine',
  },
  {
    test: /\b(dizz\w*.*stand\w*|stand\w*.*dizz\w*|lightheaded.*stand\w*)\b/,
    key: 'low blood pressure',
  },
  {
    test: /\b(ibuprofen|aspirin|brufen|combiflam).*(dengue)|\b(dengue).*(ibuprofen|aspirin|brufen|combiflam)\b/,
    answer: 'Do not take ibuprofen, aspirin, Brufen, or Combiflam when dengue is suspected because they can increase bleeding risk. Use paracetamol only within the labelled or doctor-advised dose, drink fluids, and get medical evaluation. Seek emergency care for bleeding, severe abdominal pain, repeated vomiting, drowsiness, breathing difficulty, or very low urine output.',
  },
  {
    test: /\b(chemical|cleaner|acid|alkali).*(eye)|\beye.*(chemical|cleaner|acid|alkali)\b/,
    answer: 'Chemical eye exposure is an emergency. Rinse the eye immediately with clean lukewarm running water for at least 20 minutes, keeping the eyelids open. Remove contact lenses if they come out easily. Do not rub the eye or add drops unless a clinician directs you. Go to emergency or an eye hospital immediately and take the product container if available.',
  },
];

const INTENT_HINTS = [
  { test: /\b(cut|cuts|bleed|bleeding|wound|injur(?:y|ed)|knife)\b/, keys: ['cut','bleeding','wound infection'] },
  { test: /\b(bone|fracture|broke|broken|crack|xray|x ray)\b/, keys: ['broken bone','fracture','sprain ankle'] },
  { test: /\b(burn|burnt|hot water|fire|steam)\b/, keys: ['burn','chemical burn'] },
  { test: /\b(eye|vision|red eye|floaters|flashes)\b/, keys: ['red eye','eye injury','floaters'] },
  { test: /\b(bp|blood pressure|hypertension)\b/, keys: ['high bp','low blood pressure','bp medicine missed'] },
  { test: /\b(sugar|diabetes|glucose|insulin)\b/, keys: ['diabetes','low sugar','high sugar'] },
  { test: /\b(rash|itch|skin|fungal|ringworm|pimple|acne)\b/, keys: ['ringworm','skin infection','acne'] },
  { test: /\b(period|pregnan|vaginal|discharge)\b/, keys: ['period late','pregnancy','white discharge'] },
  { test: /\b(urine|pee|uti|burning)\b/, keys: ['uti','burning urine male','blood in urine'] },
  { test: /\b(chest|heart|breath|oxygen|spo2)\b/, keys: ['heart attack','breathing problem','oxygen low'] },
];

function findAnswer(input) {
  const lower = normalizeText(input);
  if (!lower) return null;

  for (const intent of CRITICAL_INTENTS) {
    if (intent.test.test(lower)) {
      if (intent.answer) return intent.answer;
      const answer = answerForKey(intent.key);
      if (answer) return answer;
    }
  }

  for (const hint of INTENT_HINTS) {
    if (!hint.test.test(lower)) continue;
    const answer = hint.keys.map(answerForKey).find(Boolean);
    if (answer) return answer;
  }

  // Prefer the most specific matching phrase instead of the first array item.
  let best = null;
  for (const item of QA) {
    for (const kw of item.q) {
      const normalizedKw = normalizeText(kw);
      if (!normalizedKw) continue;
      const keywordWords = normalizedKw.split(' ');
      let score = 0;
      if (lower === normalizedKw) score = 1000 + normalizedKw.length;
      else if (normalizedKw.length >= 3 && lower.includes(normalizedKw)) {
        score = 100 + keywordWords.length * 20 + normalizedKw.length;
      } else if (keywordWords.length > 1 && keywordWords.every(word => lower.split(' ').includes(word))) {
        score = 60 + keywordWords.length * 15;
      }
      if (score && (!best || score > best.score)) best = { score, answer: item.a };
    }
  }
  if (best) return best.answer;

  const compact = lower.replace(/\s/g, '');
  for (const item of QA) {
    for (const kw of item.q) {
      const normalizedKw = normalizeText(kw).replace(/\s/g, '');
      if (normalizedKw.length > 5 && compact.includes(normalizedKw)) return item.a;
    }
  }

  // Word-level fuzzy match
  const words = lower.split(/\s+/).filter(w => w.length > 3);
  for (const item of QA) {
    for (const kw of item.q) {
      const normalizedKw = normalizeText(kw);
      for (const w of words) {
        if (normalizedKw.includes(w) || w.includes(normalizedKw)) return item.a;
      }
    }
  }
  return null;
}

// ═══════════════════════════════════════════════════════════
// Anthropic API call using Node.js built-in https (no fetch needed)
// ═══════════════════════════════════════════════════════════
function callClaude(messages, systemPrompt) {
  return new Promise((resolve, reject) => {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey || apiKey === 'your-api-key-here') {
      return reject(new Error('No API key'));
    }
    const body = JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 400,
      system: systemPrompt,
      messages,
    });
    const options = {
      hostname: 'api.anthropic.com',
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Length': Buffer.byteLength(body),
      },
    };
    const req = https.request(options, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.content?.[0]?.text) resolve(parsed.content[0].text);
          else reject(new Error('No text in response'));
        } catch { reject(new Error('Parse error')); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

const SYSTEM_PROMPT = `You are MediCare AI, an expert health assistant for a hospital system in India. Answer health questions accurately and concisely (under 120 words). Cover symptoms, medications, diet, fitness, mental health, and emergencies. Always recommend seeing a real doctor for diagnosis. For emergencies say CALL 108. Plain text only, no markdown.`;

// ═══════════════════════════════════════════════════════════
// POST /api/chat/message
// ═══════════════════════════════════════════════════════════
router.post('/message', auth, async (req, res) => {
  try {
    const { message, sessionId } = req.body;
    if (!message?.trim()) return res.status(400).json({ error: 'Message required' });

    console.log('💬 Chat from', req.user.email, ':', message.substring(0, 60));

    // Save user message to MongoDB
    try {
      await Chat.create({ userId: req.user._id, role: 'user', content: message, session: sessionId });
    } catch (dbErr) {
      console.error('Chat DB save error:', dbErr.message);
    }

    let reply = null;

    // 1. Try built-in Q&A first (instant, always works)
    reply = findAnswer(message);
    if (reply) {
      console.log('   ✅ Answered from built-in Q&A');
    }

    // 2. If no built-in match, try the source-labelled Python FAQ retriever.
    if (!reply) {
      try {
        const result = await callAIService('/v1/faq/search', {
          body: { query: message, limit: 3 },
          timeoutMs: 2200,
        });
        if (result.score >= 0.12) {
          const sourceText = (result.sources || []).map(source => source.title).join(', ');
          reply = `${result.answer}${sourceText ? `\n\nSource: ${sourceText}` : ''}`;
          console.log('   ✅ Answered via Python FAQ retrieval');
        }
      } catch (pythonErr) {
        console.log('   ⚠️ Python FAQ service not available:', pythonErr.message);
      }
    }

    // 3. If no local match, try Claude API
    if (!reply) {
      try {
        let history = [];
        try {
          const dbHistory = await Chat.find({ userId: req.user._id, session: sessionId })
            .sort({ createdAt: -1 }).limit(8).lean();
          history = dbHistory.reverse().map(h => ({ role: h.role, content: h.content }));
        } catch {}
        // Ensure messages alternate properly
        if (history.length === 0 || history[history.length-1].role !== 'user') {
          history.push({ role: 'user', content: message });
        }
        reply = await callClaude(history, SYSTEM_PROMPT);
        console.log('   ✅ Answered via Claude API');
      } catch (apiErr) {
        console.log('   ⚠️ Claude API not available:', apiErr.message);
      }
    }

    // 4. Final fallback — always give a helpful response
    if (!reply) {
      reply = `Thank you for your question about "${message}". While I do not have a specific pre-loaded answer for this exact query, here is my general guidance: Please consult a qualified doctor or healthcare professional for accurate diagnosis and treatment advice. For general wellness, maintain a balanced diet, exercise regularly, sleep 7 to 9 hours, stay hydrated, and manage stress. For any emergency, CALL 108 immediately. You can also try rephrasing your question or asking about a specific symptom like fever, headache, diabetes, or blood pressure.`;
      console.log('   ℹ️ Used fallback response');
    }

    // Save assistant reply
    try {
      await Chat.create({ userId: req.user._id, role: 'assistant', content: reply, session: sessionId });
    } catch {}

    res.json({ reply });

  } catch (e) {
    console.error('❌ Chat route error:', e.message);
    res.status(500).json({ error: 'Server error. Please try again.' });
  }
});

// GET /api/chat/history/:sessionId
router.get('/history/:sessionId', auth, async (req, res) => {
  try {
    const chats = await Chat.find({ userId: req.user._id, session: req.params.sessionId })
      .sort({ createdAt: 1 }).limit(100);
    res.json(chats);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
