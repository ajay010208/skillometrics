/**
 * Pan-India seed data for SkilloMetrics.
 * Realistic states/districts, providers, courses, jobs, skills, learning
 * resources (with links/prereqs/cost/duration), placements, follow-ups,
 * company reviews, demo personas.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// deterministic RNG so seeds are reproducible
let seedState = 42;
function rand(): number {
  seedState = (seedState * 1103515245 + 12345) % 2147483648;
  return seedState / 2147483648;
}
const pick = <T>(arr: T[]): T => arr[Math.floor(rand() * arr.length)];
const intBetween = (a: number, b: number) => a + Math.floor(rand() * (b - a + 1));
const daysAgo = (d: number) => new Date(Date.now() - d * 86400_000);

async function main() {
  console.log("Clearing existing data…");
  await prisma.$transaction([
    prisma.auditLog.deleteMany(),
    prisma.chatMessage.deleteMany(),
    prisma.consentLog.deleteMany(),
    prisma.followUp.deleteMany(),
    prisma.companyReview.deleteMany(),
    prisma.shortlist.deleteMany(),
    prisma.match.deleteMany(),
    prisma.placement.deleteMany(),
    prisma.assessment.deleteMany(),
    prisma.projectSubmission.deleteMany(),
    prisma.roadmapItem.deleteMany(),
    prisma.traineeSkill.deleteMany(),
    prisma.resume.deleteMany(),
    prisma.enrollment.deleteMany(),
    prisma.course.deleteMany(),
    prisma.provider.deleteMany(),
    prisma.job.deleteMany(),
    prisma.recruiter.deleteMany(),
    prisma.learningResource.deleteMany(),
    prisma.targetJob.deleteMany(),
    prisma.skill.deleteMany(),
    prisma.trainee.deleteMany(),
    prisma.profile.deleteMany(),
  ]);

  // ---------- skills ----------
  console.log("Seeding skills…");
  const skillDefs: Array<[string, string, string[]]> = [
    ["SQL", "Data", ["sql", "mysql", "postgresql"]],
    ["Python", "Programming", ["python3", "py"]],
    ["Statistics", "Data", ["stats", "statistical analysis"]],
    ["Power BI", "Data", ["powerbi", "power-bi"]],
    ["Excel", "Data", ["microsoft excel", "spreadsheets"]],
    ["Data Visualization", "Data", ["dataviz", "charts"]],
    ["Machine Learning", "AI/ML", ["ml", "scikit-learn"]],
    ["JavaScript", "Programming", ["js", "es6"]],
    ["React", "Programming", ["reactjs", "react.js"]],
    ["Node.js", "Programming", ["nodejs", "node", "express"]],
    ["Java", "Programming", ["core java", "java8"]],
    ["Communication", "Soft Skills", ["english communication", "soft skills"]],
    ["Aptitude", "Soft Skills", ["quantitative aptitude", "reasoning"]],
    ["Welding", "Vocational", ["arc welding", "mig welding"]],
    ["Electrician Skills", "Vocational", ["electrical wiring", "iti electrician"]],
    ["Tailoring", "Vocational", ["sewing", "garment making"]],
    ["Digital Marketing", "Marketing", ["seo", "social media marketing"]],
    ["Tally", "Finance", ["tally erp 9", "accounting"]],
  ];
  const skills = new Map<string, string>();
  for (const [name, category, aliases] of skillDefs) {
    const s = await prisma.skill.create({ data: { name, category, aliases: JSON.stringify(aliases) } });
    skills.set(name, s.id);
  }

  // ---------- target jobs ----------
  console.log("Seeding target jobs…");
  const req = (pairs: Array<[string, number, number]>) =>
    JSON.stringify(pairs.map(([name, weight, minLevel]) => ({ skillId: skills.get(name)!, weight, minLevel })));
  const targetJobDefs: Array<[string, string, Array<[string, number, number]>]> = [
    ["Data Analyst", "Data & Analytics", [["SQL", 5, 70], ["Python", 3, 55], ["Statistics", 4, 60], ["Power BI", 4, 65], ["Excel", 2, 60], ["Communication", 2, 50]]],
    ["Frontend Developer", "Software", [["JavaScript", 5, 70], ["React", 5, 70], ["Communication", 1, 40]]],
    ["Backend Developer", "Software", [["Python", 4, 65], ["Node.js", 5, 70], ["SQL", 4, 65]]],
    ["Digital Marketing Executive", "Marketing", [["Digital Marketing", 5, 65], ["Communication", 3, 55], ["Excel", 1, 40]]],
    ["Accountant (Tally)", "Finance", [["Tally", 5, 70], ["Excel", 3, 60]]],
    ["Junior Welder", "Vocational", [["Welding", 5, 70], ["Aptitude", 1, 40]]],
    ["Electrician", "Vocational", [["Electrician Skills", 5, 70]]],
  ];
  const targetJobs = new Map<string, string>();
  for (const [title, family, pairs] of targetJobDefs) {
    const tj = await prisma.targetJob.create({ data: { title, family, requiredSkills: req(pairs) } });
    targetJobs.set(title, tj.id);
  }

  // ---------- learning resources (real platforms, links, prereqs, cost, duration) ----------
  console.log("Seeding learning resources…");
  type Res = { skill: string; title: string; platform: string; url: string; language: string; cost: string; hours: number; prereq: string[]; rating: number; format: string };
  const resources: Res[] = [
    // SQL
    { skill: "SQL", title: "SQL Tutorial – Full Database Course for Beginners", platform: "freeCodeCamp", url: "https://www.freecodecamp.org/news/learn-sql-in-10-minutes/", language: "English", cost: "free", hours: 20, prereq: [], rating: 4.8, format: "interactive" },
    { skill: "SQL", title: "DBMS (Database Management System)", platform: "NPTEL", url: "https://nptel.ac.in/courses/106105175", language: "English", cost: "free", hours: 40, prereq: ["Basic programming"], rating: 4.6, format: "course" },
    { skill: "SQL", title: "SQL for Data Analysis – Full Playlist", platform: "YouTube", url: "https://www.youtube.com/playlist?list=PLUaB-1hjhk8FEqW0mVyTMr6FiN1ZiAAs3", language: "English", cost: "free", hours: 12, prereq: [], rating: 4.7, format: "playlist" },
    { skill: "SQL", title: "SQL in Hindi – Complete Course", platform: "YouTube", url: "https://www.youtube.com/results?search_query=sql+full+course+in+hindi", language: "Hindi", cost: "free", hours: 15, prereq: [], rating: 4.5, format: "playlist" },
    // Python
    { skill: "Python", title: "Scientific Computing with Python", platform: "freeCodeCamp", url: "https://www.freecodecamp.org/learn/scientific-computing-with-python/", language: "English", cost: "free", hours: 60, prereq: [], rating: 4.8, format: "interactive" },
    { skill: "Python", title: "Programming, Data Structures and Algorithms using Python", platform: "NPTEL", url: "https://nptel.ac.in/courses/106106145", language: "English", cost: "free", hours: 48, prereq: ["Basic maths"], rating: 4.6, format: "course" },
    { skill: "Python", title: "Python in Hindi – Zero to Hero", platform: "YouTube", url: "https://www.youtube.com/results?search_query=python+full+course+in+hindi", language: "Hindi", cost: "free", hours: 30, prereq: [], rating: 4.5, format: "playlist" },
    // Statistics
    { skill: "Statistics", title: "Statistics and Probability", platform: "Khan Academy", url: "https://www.khanacademy.org/math/statistics-probability", language: "English", cost: "free", hours: 30, prereq: ["High-school maths"], rating: 4.7, format: "interactive" },
    { skill: "Statistics", title: "Statistics for Data Science in Hindi", platform: "YouTube", url: "https://www.youtube.com/results?search_query=statistics+for+data+science+in+hindi", language: "Hindi", cost: "free", hours: 18, prereq: [], rating: 4.4, format: "playlist" },
    // Power BI
    { skill: "Power BI", title: "Microsoft Learn – Get started with Power BI", platform: "Microsoft Learn", url: "https://learn.microsoft.com/en-us/training/paths/create-analyze-reports-power-bi-desktop/", language: "English", cost: "free", hours: 16, prereq: ["Excel basics"], rating: 4.7, format: "interactive" },
    { skill: "Power BI", title: "Power BI Full Course in One Video", platform: "YouTube", url: "https://www.youtube.com/results?search_query=power+bi+full+course", language: "English", cost: "free", hours: 10, prereq: [], rating: 4.5, format: "playlist" },
    // Excel
    { skill: "Excel", title: "Excel Skills for Business (Audit available)", platform: "Coursera", url: "https://www.coursera.org/specializations/excel", language: "English", cost: "freemium", hours: 40, prereq: [], rating: 4.8, format: "course" },
    { skill: "Excel", title: "Advanced Excel in Hindi", platform: "YouTube", url: "https://www.youtube.com/results?search_query=advanced+excel+course+in+hindi", language: "Hindi", cost: "free", hours: 12, prereq: [], rating: 4.5, format: "playlist" },
    // Data Visualization
    { skill: "Data Visualization", title: "Data Visualization with D3", platform: "freeCodeCamp", url: "https://www.freecodecamp.org/learn/data-visualization/", language: "English", cost: "free", hours: 30, prereq: ["JavaScript basics"], rating: 4.6, format: "interactive" },
    // ML
    { skill: "Machine Learning", title: "Machine Learning Specialization (Audit)", platform: "Coursera", url: "https://www.coursera.org/specializations/machine-learning-introduction", language: "English", cost: "freemium", hours: 60, prereq: ["Python", "Statistics"], rating: 4.9, format: "course" },
    // JavaScript
    { skill: "JavaScript", title: "JavaScript Algorithms and Data Structures", platform: "freeCodeCamp", url: "https://www.freecodecamp.org/learn/javascript-algorithms-and-data-structures/", language: "English", cost: "free", hours: 60, prereq: [], rating: 4.8, format: "interactive" },
    { skill: "JavaScript", title: "JavaScript in Hindi – Full Course", platform: "YouTube", url: "https://www.youtube.com/results?search_query=javascript+full+course+in+hindi", language: "Hindi", cost: "free", hours: 25, prereq: [], rating: 4.5, format: "playlist" },
    // React
    { skill: "React", title: "Front End Development Libraries (React)", platform: "freeCodeCamp", url: "https://www.freecodecamp.org/learn/front-end-development-libraries/", language: "English", cost: "free", hours: 40, prereq: ["JavaScript"], rating: 4.7, format: "interactive" },
    { skill: "React", title: "MERN Stack Course in Hindi", platform: "YouTube", url: "https://www.youtube.com/results?search_query=react+full+course+in+hindi", language: "Hindi", cost: "free", hours: 35, prereq: ["JavaScript"], rating: 4.6, format: "playlist" },
    // Node
    { skill: "Node.js", title: "Backend Development and APIs", platform: "freeCodeCamp", url: "https://www.freecodecamp.org/learn/back-end-development-and-apis/", language: "English", cost: "free", hours: 30, prereq: ["JavaScript"], rating: 4.7, format: "interactive" },
    // Java
    { skill: "Java", title: "Java Programming (NPTEL)", platform: "NPTEL", url: "https://nptel.ac.in/courses/106105171", language: "English", cost: "free", hours: 40, prereq: ["Basic programming"], rating: 4.5, format: "course" },
    // Communication
    { skill: "Communication", title: "English for Career Development", platform: "Coursera", url: "https://www.coursera.org/learn/career-development", language: "English", cost: "free", hours: 25, prereq: [], rating: 4.7, format: "course" },
    { skill: "Communication", title: "Spoken English in Hindi/Marathi", platform: "YouTube", url: "https://www.youtube.com/results?search_query=spoken+english+course+in+hindi", language: "Hindi", cost: "free", hours: 20, prereq: [], rating: 4.4, format: "playlist" },
    // Aptitude
    { skill: "Aptitude", title: "Quantitative Aptitude – Full Course", platform: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/quantitative-aptitude/", language: "English", cost: "free", hours: 20, prereq: [], rating: 4.5, format: "docs" },
    // Welding
    { skill: "Welding", title: "Welding Techniques – ITI Level", platform: "SWAYAM", url: "https://swayam.gov.in/", language: "English", cost: "free", hours: 24, prereq: [], rating: 4.3, format: "course" },
    // Electrician
    { skill: "Electrician Skills", title: "Basic Electrical Engineering (NPTEL)", platform: "NPTEL", url: "https://nptel.ac.in/courses/108105132", language: "English", cost: "free", hours: 36, prereq: [], rating: 4.5, format: "course" },
    // Digital Marketing
    { skill: "Digital Marketing", title: "Fundamentals of Digital Marketing", platform: "Google", url: "https://learndigital.withgoogle.com/digitalgarage/course/digital-marketing", language: "English", cost: "free", hours: 40, prereq: [], rating: 4.7, format: "course" },
    { skill: "Digital Marketing", title: "Digital Marketing Full Course in Hindi", platform: "YouTube", url: "https://www.youtube.com/results?search_query=digital+marketing+full+course+in+hindi", language: "Hindi", cost: "free", hours: 22, prereq: [], rating: 4.5, format: "playlist" },
    // Tally
    { skill: "Tally", title: "Tally ERP 9 + TallyPrime Full Course", platform: "YouTube", url: "https://www.youtube.com/results?search_query=tally+prime+full+course+in+hindi", language: "Hindi", cost: "free", hours: 18, prereq: ["Basic accounting"], rating: 4.5, format: "playlist" },
  ];
  for (const r of resources) {
    await prisma.learningResource.create({
      data: {
        skillId: skills.get(r.skill)!,
        title: r.title,
        platform: r.platform,
        url: r.url,
        language: r.language,
        cost: r.cost,
        durationHours: r.hours,
        prerequisites: JSON.stringify(r.prereq),
        rating: r.rating,
        format: r.format,
      },
    });
  }

  // ---------- profiles & personas ----------
  console.log("Seeding demo personas…");
  const personas = [
    { email: "demo.trainee@skillometrics.in", name: "Ananya Sharma", role: "trainee" },
    { email: "demo.recruiter@skillometrics.in", name: "Rohit Verma", role: "recruiter" },
    { email: "demo.provider@skillometrics.in", name: "SkillDev Institute", role: "provider" },
    { email: "demo.admin@skillometrics.in", name: "Govt Admin", role: "admin" },
  ];
  const personaIds = new Map<string, string>();
  for (const p of personas) {
    const row = await prisma.profile.create({ data: p });
    personaIds.set(p.role, row.id);
  }

  // ---------- recruiters ----------
  console.log("Seeding recruiters…");
  const recruiter = await prisma.recruiter.create({
    data: {
      profileId: personaIds.get("recruiter")!,
      name: "Rohit Verma",
      company: "TechNova Solutions",
      roleTitle: "Talent Acquisition Lead",
      email: "demo.recruiter@skillometrics.in",
    },
  });

  // ---------- providers & courses ----------
  console.log("Seeding providers & courses…");
  const providerDefs: Array<[string, string, string, string]> = [
    ["SkillDev Institute", "Maharashtra", "Pune", "PPP"],
    ["Mumbai Skills Academy", "Maharashtra", "Mumbai", "Private"],
    ["Udaan Training Centre", "Uttar Pradesh", "Lucknow", "NGO"],
    ["Patna Kaushal Kendra", "Bihar", "Patna", "PPP"],
    ["Chennai Tech Institute", "Tamil Nadu", "Chennai", "Private"],
    ["Bengaluru Skill Hub", "Karnataka", "Bengaluru", "PPP"],
    ["Jaipur Rozgar Sansthan", "Rajasthan", "Jaipur", "NGO"],
    ["Indore Skill Mission", "Madhya Pradesh", "Indore", "Govt"],
  ];
  const providers: Array<{ id: string; state: string }> = [];
  for (const [name, state, city, type] of providerDefs) {
    const p = await prisma.provider.create({ data: { name, state, city, type, profileId: name === "SkillDev Institute" ? personaIds.get("provider")! : undefined } });
    providers.push({ id: p.id, state });
  }
  const courseDefs = [
    "Data Analytics Bootcamp", "Full-Stack Development", "Digital Marketing Pro",
    "Industrial Welding (NSQF L4)", "Electrician (ITI)", "Accounting with Tally",
  ];
  const courses: Array<{ id: string; providerId: string; name: string }> = [];
  for (const prov of providers) {
    const count = intBetween(2, 3);
    for (let i = 0; i < count; i++) {
      const name = courseDefs[(i + intBetween(0, 5)) % courseDefs.length];
      const c = await prisma.course.create({
        data: { providerId: prov.id, name, category: "Skilling", durationMonths: intBetween(3, 6) },
      });
      courses.push({ id: c.id, providerId: prov.id, name });
    }
  }

  // ---------- trainees ----------
  console.log("Seeding trainees (~320 across India)…");
  const statesDistricts: Array<[string, string[]]> = [
    ["Maharashtra", ["Pune", "Mumbai", "Nagpur", "Nashik", "Aurangabad"]],
    ["Uttar Pradesh", ["Lucknow", "Kanpur", "Varanasi", "Agra"]],
    ["Bihar", ["Patna", "Gaya", "Muzaffarpur"]],
    ["Tamil Nadu", ["Chennai", "Coimbatore", "Madurai"]],
    ["Karnataka", ["Bengaluru", "Mysuru", "Hubli"]],
    ["West Bengal", ["Kolkata", "Howrah", "Siliguri"]],
    ["Rajasthan", ["Jaipur", "Jodhpur", "Kota"]],
    ["Madhya Pradesh", ["Indore", "Bhopal", "Jabalpur"]],
    ["Telangana", ["Hyderabad", "Warangal"]],
    ["Gujarat", ["Ahmedabad", "Surat", "Vadodara"]],
    ["Odisha", ["Bhubaneswar", "Cuttack"]],
    ["Kerala", ["Kochi", "Thiruvananthapuram"]],
  ];
  const firstNames = ["Aarav","Vivaan","Aditya","Ishaan","Kabir","Ananya","Diya","Aditi","Neha","Priya","Rahul","Amit","Sneha","Pooja","Vikram","Suresh","Kiran","Meena","Ravi","Arjun","Sita","Geeta","Rajesh","Manish","Deepak","Sunita","Rekha","Farhan","Zoya","Sameer"];
  const lastNames = ["Sharma","Verma","Patil","Reddy","Nair","Singh","Kumar","Das","Mehta","Joshi","Iyer","Gupta","Yadav","Patel","Khan","Rao","Chauhan","Bose","Mishra","Pillai"];
  const educations = ["B.Com", "B.Sc", "B.A.", "B.Tech", "12th pass", "ITI Certificate", "Diploma", "MCA", "MBA"];
  const genders = ["Female", "Male"];
  const categories = ["General", "OBC", "SC", "ST", "EWS"];
  const statuses = ["studying", "trained", "placed", "job-seeking"];

  const traineeIds: Array<{ id: string; state: string; district: string; targetJobId: string | null }> = [];
  for (let i = 0; i < 320; i++) {
    const [state, districts] = pick(statesDistricts);
    const district = pick(districts);
    const name = `${pick(firstNames)} ${pick(lastNames)}`;
    const targetJobTitle = pick([...targetJobDefs.map((d) => d[0]), ...targetJobDefs.map((d) => d[0])]); // weight to jobs
    const t = await prisma.trainee.create({
      data: {
        name,
        email: `trainee${i}@example.in`,
        phone: `9${intBetween(100000000, 999999999)}`,
        state,
        district,
        age: intBetween(19, 32),
        gender: pick(genders),
        category: pick(categories),
        education: pick(educations),
        currentStatus: "trained",
        targetJobId: targetJobs.get(targetJobTitle) ?? null,
        weeklyHours: pick([5, 10, 10, 15, 20]),
        consentTracking: rand() > 0.06,
        consentRecruiterVisible: rand() > 0.55,
        nonPlacementReason: null,
      },
    });
    traineeIds.push({ id: t.id, state, district, targetJobId: t.targetJobId });
  }

  // skills per trainee (correlated to target job: closer = more employable)
  console.log("Seeding trainee skills…");
  const skillIds = [...skills.values()];
  for (const t of traineeIds) {
    const n = intBetween(3, 7);
    const chosen = new Set<string>();
    while (chosen.size < n) chosen.add(pick(skillIds));
    const strength = rand(); // overall capability of this trainee
    for (const sk of chosen) {
      const base = Math.round(15 + strength * 75 + (rand() - 0.5) * 20);
      const level = Math.max(5, Math.min(98, base));
      await prisma.traineeSkill.create({
        data: {
          traineeId: t.id,
          skillId: sk,
          level,
          source: level > 65 ? "assessment" : "resume",
        },
      });
    }
  }

  // enrollments
  console.log("Seeding enrollments…");
  for (const t of traineeIds) {
    const course = pick(courses);
    const roll = rand();
    const status = roll < 0.7 ? "completed" : roll < 0.85 ? "in-progress" : roll < 0.93 ? "enrolled" : "dropped";
    await prisma.enrollment.create({
      data: {
        traineeId: t.id,
        courseId: course.id,
        cohort: pick(["2024-A", "2024-B", "2025-A", "2025-B"]),
        status,
        enrolledAt: daysAgo(intBetween(90, 540)),
      },
    });
  }

  // jobs
  console.log("Seeding jobs…");
  const companies = ["Infosys","TCS","Wipro","Zoho","Freshworks","TechNova Solutions","Railyatri","Byju's","Swiggy","Zomato","L&T Construction","Godrej","Mahindra Rise","Asian Paints","Apollo Hospitals","Local SME Cluster"];
  const jobSources = ["LinkedIn", "Naukri", "Internshala", "platform", "Recruiter"];
  const jobTitles: Array<[string, string]> = [
    ["Data Analyst", "SQL,Python,Statistics,Power BI"],
    ["Junior Data Analyst", "SQL,Excel,Statistics"],
    ["Frontend Developer", "JavaScript,React"],
    ["Backend Developer", "Python,Node.js,SQL"],
    ["Digital Marketing Executive", "Digital Marketing,Communication"],
    ["Accountant", "Tally,Excel"],
    ["Welder (Grade 1)", "Welding"],
    ["Electrician", "Electrician Skills"],
    ["Marketing Intern", "Digital Marketing"],
  ];
  for (let i = 0; i < 90; i++) {
    const [title, skillCsv] = pick(jobTitles);
    const [state, districts] = pick(statesDistricts);
    const district = pick(districts);
    const skillNames = skillCsv.split(",");
    const reqs = skillNames.map((sn) => ({
      skillId: skills.get(sn.trim())!,
      weight: intBetween(2, 5),
      minLevel: intBetween(45, 75),
    }));
    const isRecruiterPost = rand() > 0.7;
    await prisma.job.create({
      data: {
        recruiterId: isRecruiterPost ? recruiter.id : null,
        title,
        company: isRecruiterPost ? "TechNova Solutions" : pick(companies),
        state,
        district,
        salaryMin: intBetween(15, 30) * 1000,
        salaryMax: intBetween(31, 65) * 1000,
        source: isRecruiterPost ? "Recruiter" : pick(jobSources.slice(0, 4)),
        postedAt: daysAgo(intBetween(0, 2)), // within 48h
        requiredSkills: JSON.stringify(reqs),
        description: `${title} opening at ${district}. Apply with your verified skill profile.`,
      },
    });
  }

  // placements + follow-ups + reviews
  console.log("Seeding placements, follow-ups, reviews…");
  let placedCount = 0;
  for (const t of traineeIds) {
    const skillsOfT = await prisma.traineeSkill.findMany({ where: { traineeId: t.id } });
    const avg = skillsOfT.length ? skillsOfT.reduce((a, s) => a + s.level, 0) / skillsOfT.length : 0;
    const chance = avg > 70 ? 0.75 : avg > 55 ? 0.45 : avg > 40 ? 0.22 : 0.08;
    if (rand() > chance) {
      // not placed: assign a reason
      const reasons = ["skill-gap", "lack-experience", "location", "certification", "communication"];
      await prisma.trainee.update({
        where: { id: t.id },
        data: {
          currentStatus: pick(["job-seeking", "trained"]),
          nonPlacementReason: pick(reasons),
        },
      });
      continue;
    }
    placedCount++;
    const type = rand() < 0.82 ? "job" : rand() < 0.6 ? "self-employment" : "apprenticeship";
    const employer = type === "self-employment" ? "Self-employed" : pick(companies);
    const joining = daysAgo(intBetween(30, 500));
    const salary = intBetween(14, 42) * 1000;
    const placement = await prisma.placement.create({
      data: {
        traineeId: t.id,
        employer,
        jobTitle: pick(jobTitles)[0],
        joiningDate: joining,
        monthlySalary: salary,
        state: t.state,
        district: t.district,
        type,
        employerVerified: rand() > 0.5,
      },
    });
    await prisma.trainee.update({ where: { id: t.id }, data: { currentStatus: "placed" } });

    // follow-ups: 3/6/12 depending on age of placement
    const ageMonths = Math.floor((Date.now() - joining.getTime()) / (30 * 86400_000));
    for (const m of [3, 6, 12]) {
      if (ageMonths >= m) {
        const stillEmployed = rand() > (m === 3 ? 0.15 : m === 6 ? 0.25 : 0.3);
        const growth = 1 + (rand() * 0.18 - 0.04);
        await prisma.followUp.create({
          data: {
            placementId: placement.id,
            milestone: m,
            dueAt: new Date(joining.getTime() + m * 30 * 86400_000),
            completedAt: new Date(joining.getTime() + m * 30 * 86400_000 + intBetween(1, 10) * 86400_000),
            stillEmployed,
            currentSalary: stillEmployed ? Math.round(salary * growth / 500) * 500 : null,
            skillUsage: intBetween(30, 95),
            channel: pick(["automated-call", "whatsapp", "assisted"]),
          },
        });
      } else {
        await prisma.followUp.create({
          data: {
            placementId: placement.id,
            milestone: m,
            dueAt: new Date(joining.getTime() + m * 30 * 86400_000),
          },
        });
      }
    }

    // ~40% of placed trainees leave a verified company review
    if (type === "job" && rand() < 0.4) {
      const iqs = [
        "Explain a SQL join you used in a project.",
        "Describe your final training project end-to-end.",
        "Aptitude round: 20 questions in 25 minutes.",
        "How would you handle an angry customer?",
        "Write a function to reverse a string.",
        "Explain normalization in databases.",
      ];
      await prisma.companyReview.create({
        data: {
          placementId: placement.id,
          companyName: employer,
          overallRating: intBetween(3, 5),
          interviewDifficulty: intBetween(2, 5),
          interviewQuestions: JSON.stringify([pick(iqs), pick(iqs)]),
          preparationTips: pick([
            "Revise SQL joins and basic statistics — that's most of round 1.",
            "Practice explaining your project in under 3 minutes.",
            "Do aptitude practice on GeeksforGeeks — the pattern repeats.",
            "Know your resume thoroughly; they dig into every skill listed.",
          ]),
          workCultureRating: intBetween(3, 5),
          salaryNegotiationNotes: pick([
            "They matched the offer I had from another SME.",
            "Ask for 15% above what they quote — they have room.",
            "Fixed pay is rigid; try negotiating variable pay.",
          ]),
          wouldRecommend: rand() > 0.2,
          text: pick([
            "Good starting point for freshers from tier-2 cities.",
            "Great team culture; managers supportive of learning.",
            "Fast-paced; you learn a lot in the first 6 months.",
          ]),
          createdAt: new Date(joining.getTime() + intBetween(15, 60) * 86400_000),
        },
      });
    }
  }
  console.log(`  → ${placedCount} placements seeded`);

  // matches for the demo trainee
  console.log("Seeding matches & shortlists for demo personas…");
  const demoTrainee = await prisma.trainee.findUnique({ where: { profileId: personaIds.get("trainee")! } });
  // Demo trainee profile: Ananya Sharma, Maharashtra, wants Data Analyst, has gaps
  if (!demoTrainee) {
    const t = await prisma.trainee.create({
      data: {
        profileId: personaIds.get("trainee")!,
        name: "Ananya Sharma",
        email: "demo.trainee@skillometrics.in",
        phone: "9876543210",
        state: "Maharashtra",
        district: "Pune",
        age: 22,
        gender: "Female",
        category: "General",
        education: "B.Sc Computer Science",
        currentStatus: "trained",
        targetJobId: targetJobs.get("Data Analyst")!,
        weeklyHours: 10,
        consentTracking: true,
        consentRecruiterVisible: true,
      },
    });
    const gapProfile: Array<[string, number]> = [
      ["SQL", 45], ["Python", 38], ["Statistics", 30], ["Power BI", 25], ["Excel", 68], ["Communication", 55],
    ];
    for (const [name, level] of gapProfile) {
      await prisma.traineeSkill.create({
        data: { traineeId: t.id, skillId: skills.get(name)!, level, source: "resume" },
      });
    }
    await prisma.resume.create({
      data: {
        traineeId: t.id,
        fileName: "ananya_resume.pdf",
        extractedText: "Ananya Sharma — B.Sc Computer Science, Pune. Skills: SQL basics, Python beginner, Excel. Project: college result dashboard.",
        parsedSkills: JSON.stringify([{ name: "SQL", level: 45 }, { name: "Python", level: 38 }, { name: "Excel", level: 68 }]),
        experienceMonths: 4,
      },
    });
    // a couple of projects
    await prisma.projectSubmission.create({
      data: {
        traineeId: t.id,
        title: "College Result Dashboard",
        description: "Excel + Power BI dashboard showing semester-wise results with drill-down by department.",
        repoUrl: "https://github.com/ananya-sharma/college-result-dashboard",
        evaluation: JSON.stringify([
          { skillId: skills.get("Excel")!, verdict: "validated", feedback: "Good use of pivot tables and conditional formatting." },
          { skillId: skills.get("Power BI")!, verdict: "needs-improvement", feedback: "Add DAX measures and a proper star schema." },
        ]),
      },
    });
    // a sample completed assessment
    const sampleQs = [
      { q: "Which SQL clause filters rows BEFORE grouping?", options: ["WHERE", "HAVING", "GROUP BY", "ORDER BY"], answerIdx: 0 },
      { q: "What does ROUND(x, 2) do in SQL?", options: ["Rounds to 2 decimal places", "Returns 2 rows", "Truncates to integer", "Raises error"], answerIdx: 0 },
      { q: "Which join returns ALL rows from the left table?", options: ["INNER JOIN", "LEFT JOIN", "RIGHT JOIN", "CROSS JOIN"], answerIdx: 1 },
      { q: "COUNT(*) counts…", options: ["Distinct values", "All rows including NULLs", "Only non-null values", "Columns"], answerIdx: 1 },
      { q: "Primary key must be…", options: ["Nullable", "Unique & non-null", "Indexed only", "Foreign"], answerIdx: 1 },
    ];
    await prisma.assessment.create({
      data: {
        traineeId: t.id,
        skillId: skills.get("SQL")!,
        questions: JSON.stringify(sampleQs),
        answers: JSON.stringify([0, 0, 1, 1, 1]),
        score: 80,
        takenAt: daysAgo(6),
      },
    });
    await prisma.traineeSkill.update({
      where: { traineeId_skillId: { traineeId: t.id, skillId: skills.get("SQL")! } },
      data: { level: 55, source: "assessment" },
    });
    console.log("  → demo trainee Ananya Sharma seeded with gaps (SQL 55, Power BI 25…)");
  }

  // shortlists for the demo recruiter
  const visibleTrainees = await prisma.trainee.findMany({
    where: { consentRecruiterVisible: true },
    take: 3,
    include: { skills: { include: { skill: true } } },
  });
  for (const [i, t] of visibleTrainees.entries()) {
    await prisma.shortlist.create({
      data: {
        recruiterId: recruiter.id,
        traineeId: t.id,
        status: ["shortlisted", "interviewed", "offer"][i] ?? "shortlisted",
        notes: "Auto-seeded pipeline entry",
      },
    });
  }

  // welcome chat message for demo trainee
  if (demoTrainee) {
    await prisma.chatMessage.create({
      data: {
        traineeId: demoTrainee.id,
        role: "agent",
        content: "Hi Ananya! 👋 I'm your AI career counsellor. Your Data Analyst readiness is around 45% — the biggest gaps are Power BI and Statistics. Ask me things like \"what should I do this week?\" or \"show me jobs for me\".",
      },
    });
  }

  console.log("✔ Seed complete.");
  console.log(`   Trainees: ${traineeIds.length + 1}, Skills: ${skills.size}, Jobs: 90, Resources: ${resources.length}`);
  console.log("   Demo logins: demo.trainee@skillometrics.in / demo.recruiter@skillometrics.in / demo.provider@skillometrics.in / demo.admin@skillometrics.in");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
