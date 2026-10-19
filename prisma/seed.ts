import {
  PrismaClient,
  UserRole,
  EventType,
  EventStatus,
  ExpenseStatus,
  AuditAction,
  type User,
} from '@prisma/client'
import bcrypt from 'bcryptjs'
import { ConflictService } from '../src/server/services/conflict.service'
import { SessionUser } from '../src/server/types'

const prisma = new PrismaClient()
const DEMO_PASSWORD = 'DemoPassword123!'
const demoPasswordHash = bcrypt.hashSync(DEMO_PASSWORD, 10)

// IST to UTC converter for seed data
// IST = UTC + 5:30, so subtract 5h30m from IST to get UTC
function istToUtc(dateStr: string, timeStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number)
  const [hours, minutes] = timeStr.split(':').map(Number)
  const totalMinutesIST = hours * 60 + minutes
  const totalMinutesUTC = totalMinutesIST - (5 * 60 + 30)
  let utcHours = Math.floor(totalMinutesUTC / 60)
  let utcMinutes = totalMinutesUTC % 60
  let utcDay = day
  let utcMonth = month
  let utcYear = year
  if (utcHours < 0) {
    utcHours += 24
    utcDay -= 1
    if (utcDay < 1) {
      utcMonth -= 1
      if (utcMonth < 1) {
        utcMonth = 12
        utcYear -= 1
      }
      const daysInMonth = new Date(utcYear, utcMonth, 0).getDate()
      utcDay = daysInMonth
    }
  }
  if (utcMinutes < 0) {
    utcMinutes += 60
    utcHours -= 1
  }
  return new Date(Date.UTC(utcYear, utcMonth - 1, utcDay, utcHours, utcMinutes, 0, 0))
}

async function main() {
  console.log('🌱 Starting idempotent minimal demo seed...')

  // ============================================================
  // 1. CLUBS (Base Catalog)
  // ============================================================
  console.log('Setting up clubs...')

  const acmClub = await prisma.club.upsert({
    where: { code: 'ACM' },
    update: { isActive: true },
    create: {
      name: 'ACM Student Chapter',
      code: 'ACM',
      description: 'Association for Computing Machinery student chapter. The internal organizing body.',
      contactEmail: 'acm@college.edu',
      isInternalAcm: true,
      isActive: true,
    },
  })

  const codingClub = await prisma.club.upsert({
    where: { code: 'CC' },
    update: { isActive: true },
    create: {
      name: 'Coding Club',
      code: 'CC',
      description: 'Competitive programming and algorithms enthusiasts club.',
      contactEmail: 'codingclub@college.edu',
      isInternalAcm: false,
      isActive: true,
    },
  })

  const roboticsClub = await prisma.club.upsert({
    where: { code: 'RC' },
    update: { isActive: true },
    create: {
      name: 'Robotics Club',
      code: 'RC',
      description: 'Robotics design, embedded systems, and automation club.',
      contactEmail: 'robotics@college.edu',
      isInternalAcm: false,
      isActive: true,
    },
  })

  const gdscClub = await prisma.club.upsert({
    where: { code: 'GDSC' },
    update: { isActive: true },
    create: {
      name: 'Google Developer Student Club',
      code: 'GDSC',
      description: 'Google Developer Student Club — mobile, web, and cloud technologies.',
      contactEmail: 'gdsc@college.edu',
      isInternalAcm: false,
      isActive: true,
    },
  })

  const ecellClub = await prisma.club.upsert({
    where: { code: 'ECELL' },
    update: { isActive: true },
    create: {
      name: 'Entrepreneurship Cell',
      code: 'ECELL',
      description: 'Entrepreneurship, campus startups, and innovation incubator.',
      contactEmail: 'ecell@college.edu',
      isInternalAcm: false,
      isActive: true,
    },
  })

  // ============================================================
  // 2. USERS (Base Catalog)
  // ============================================================
  console.log('Setting up demo users...')

  const demoAccounts = [
    {
      email: 'superadmin@acm-demo.college.edu',
      name: 'Super Admin (Demo)',
      role: UserRole.SUPER_ADMIN,
      clubId: acmClub.id,
    },
    {
      email: 'core@acm-demo.college.edu',
      name: 'ACM Core Member (Demo)',
      role: UserRole.ACM_CORE,
      clubId: acmClub.id,
    },
    {
      email: 'exec@acm-demo.college.edu',
      name: 'ACM Executive (Demo)',
      role: UserRole.ACM_EXEC,
      clubId: acmClub.id,
    },
    {
      email: 'rep.coding@acm-demo.college.edu',
      name: 'Coding Club Rep (Demo)',
      role: UserRole.CLUB_REP,
      clubId: codingClub.id,
    },
    {
      email: 'rep.robotics@acm-demo.college.edu',
      name: 'Robotics Club Rep (Demo)',
      role: UserRole.CLUB_REP,
      clubId: roboticsClub.id,
    },
    {
      email: 'rep.gdsc@acm-demo.college.edu',
      name: 'GDSC Rep (Demo)',
      role: UserRole.CLUB_REP,
      clubId: gdscClub.id,
    },
    {
      email: 'rep.ecell@acm-demo.college.edu',
      name: 'E-Cell Rep (Demo)',
      role: UserRole.CLUB_REP,
      clubId: ecellClub.id,
    },
    {
      email: 'viewer@acm-demo.college.edu',
      name: 'Read-Only Viewer (Demo)',
      role: UserRole.VIEWER,
      clubId: null,
    },
    {
      email: 'member@acm-demo.college.edu',
      name: 'Campus Member (Demo)',
      role: UserRole.MEMBER,
      clubId: null,
    },
  ]

  const usersMap: Record<string, User> = {}

  for (const acc of demoAccounts) {
    const u = await prisma.user.upsert({
      where: { email: acc.email },
      update: {
        passwordHash: demoPasswordHash,
        name: acc.name,
        role: acc.role,
        clubId: acc.clubId,
        isActive: true,
      },
      create: {
        email: acc.email,
        name: acc.name,
        passwordHash: demoPasswordHash,
        role: acc.role,
        clubId: acc.clubId,
        isActive: true,
      },
    })
    usersMap[acc.email] = u
  }

  const superAdmin = usersMap['superadmin@acm-demo.college.edu']
  const acmCore = usersMap['core@acm-demo.college.edu']
  const acmExec = usersMap['exec@acm-demo.college.edu']
  const codingClubRep = usersMap['rep.coding@acm-demo.college.edu']
  const roboticsRep = usersMap['rep.robotics@acm-demo.college.edu']
  const gdscRep = usersMap['rep.gdsc@acm-demo.college.edu']
  const ecellRep = usersMap['rep.ecell@acm-demo.college.edu']
  const viewer = usersMap['viewer@acm-demo.college.edu']

  // Clean up any non-demo test users
  const demoEmails = demoAccounts.map((a) => a.email)
  await prisma.user.deleteMany({
    where: {
      email: { notIn: demoEmails },
    },
  })

  // ============================================================
  // 3. VENUES (Base Catalog)
  // ============================================================
  console.log('Setting up venues...')

  const lt1 = await prisma.venue.upsert({
    where: { name: 'Lecture Theatre 1 (LT-1)' },
    update: { isActive: true },
    create: {
      name: 'Lecture Theatre 1 (LT-1)',
      locationCode: 'BLOCK-A-LT1',
      capacity: 120,
      turnaroundMinutesBuffer: 30,
      description: 'Main lecture theatre in Block A. AV system, projector, podium.',
      isActive: true,
    },
  })

  const lt2 = await prisma.venue.upsert({
    where: { name: 'Lecture Theatre 2 (LT-2)' },
    update: { isActive: true },
    create: {
      name: 'Lecture Theatre 2 (LT-2)',
      locationCode: 'BLOCK-A-LT2',
      capacity: 100,
      turnaroundMinutesBuffer: 30,
      description: 'Secondary lecture theatre in Block A.',
      isActive: true,
    },
  })

  const seminarHall = await prisma.venue.upsert({
    where: { name: 'Seminar Hall' },
    update: { isActive: true },
    create: {
      name: 'Seminar Hall',
      locationCode: 'BLOCK-B-SEMINAR',
      capacity: 200,
      turnaroundMinutesBuffer: 45,
      description: 'Large seminar hall suitable for conferences and workshops.',
      isActive: true,
    },
  })

  const auditorium = await prisma.venue.upsert({
    where: { name: 'Main Auditorium' },
    update: { isActive: true },
    create: {
      name: 'Main Auditorium',
      locationCode: 'MAIN-AUD',
      capacity: 500,
      turnaroundMinutesBuffer: 60,
      description: 'Main campus auditorium for large events and cultural programs.',
      isActive: true,
    },
  })

  const lab1 = await prisma.venue.upsert({
    where: { name: 'Computer Lab 1 (CS-LAB-1)' },
    update: { isActive: true },
    create: {
      name: 'Computer Lab 1 (CS-LAB-1)',
      locationCode: 'BLOCK-C-LAB1',
      capacity: 40,
      turnaroundMinutesBuffer: 15,
      description: 'Computer lab with 40 workstations.',
      isActive: true,
    },
  })

  const lab2 = await prisma.venue.upsert({
    where: { name: 'Computer Lab 2 (CS-LAB-2)' },
    update: { isActive: true },
    create: {
      name: 'Computer Lab 2 (CS-LAB-2)',
      locationCode: 'BLOCK-C-LAB2',
      capacity: 40,
      turnaroundMinutesBuffer: 15,
      description: 'Computer lab with 40 workstations for competitive programming.',
      isActive: true,
    },
  })

  const openAirAmphitheater = await prisma.venue.upsert({
    where: { name: 'Open Air Amphitheater' },
    update: { isActive: true },
    create: {
      name: 'Open Air Amphitheater',
      locationCode: 'CAMPUS-OAT',
      capacity: 300,
      turnaroundMinutesBuffer: 60,
      description: 'Open-air amphitheater for cultural fests and outdoor programs.',
      isActive: true,
    },
  })

  // ============================================================
  // 4. EXPENSE CATEGORIES (Base Catalog)
  // ============================================================
  console.log('Setting up expense categories...')

  const catLogistics = await prisma.expenseCategory.upsert({
    where: { name: 'Logistics' },
    update: { isActive: true },
    create: { name: 'Logistics', description: 'Transportation, courier, and miscellaneous operational costs.' },
  })

  const catRefreshments = await prisma.expenseCategory.upsert({
    where: { name: 'Refreshments' },
    update: { isActive: true },
    create: { name: 'Refreshments', description: 'Food, beverages, snacks, tea/coffee for participants and speakers.' },
  })

  const catMarketing = await prisma.expenseCategory.upsert({
    where: { name: 'Marketing & Printing' },
    update: { isActive: true },
    create: { name: 'Marketing & Printing', description: 'Banners, posters, brochures, standees.' },
  })

  const catEquipment = await prisma.expenseCategory.upsert({
    where: { name: 'Equipment & Supplies' },
    update: { isActive: true },
    create: { name: 'Equipment & Supplies', description: 'Hardware, electronics, tools, stationery.' },
  })

  const catTravel = await prisma.expenseCategory.upsert({
    where: { name: 'Travel & Accommodation' },
    update: { isActive: true },
    create: { name: 'Travel & Accommodation', description: 'Speaker travel reimbursement, hotel bookings.' },
  })

  const catHonorarium = await prisma.expenseCategory.upsert({
    where: { name: 'Honorarium & Prizes' },
    update: { isActive: true },
    create: { name: 'Honorarium & Prizes', description: 'Speaker honorarium, prize money pool, gift vouchers.' },
  })

  const catVenue = await prisma.expenseCategory.upsert({
    where: { name: 'Venue & Infrastructure' },
    update: { isActive: true },
    create: { name: 'Venue & Infrastructure', description: 'Venue booking fees, AV rentals, stage setup.' },
  })

  const catMisc = await prisma.expenseCategory.upsert({
    where: { name: 'Miscellaneous' },
    update: { isActive: true },
    create: { name: 'Miscellaneous', description: 'Contingency and uncategorized expenses.' },
  })

  // ============================================================
  // 5. SEMESTERS (Base Catalog)
  // ============================================================
  console.log('Setting up semesters...')

  const prevSemester = await prisma.semester.upsert({
    where: { name: 'Even Semester 2025-26' },
    update: {
      isLocked: true,
      lockedAt: new Date('2026-06-05T05:30:00.000Z'),
      lockedByUserId: superAdmin.id,
    },
    create: {
      name: 'Even Semester 2025-26',
      startDate: new Date('2026-01-15T00:00:00.000Z'),
      endDate: new Date('2026-05-31T00:00:00.000Z'),
      totalBudget: '45000.00',
      isLocked: true,
      lockedAt: new Date('2026-06-05T05:30:00.000Z'),
      lockedByUserId: superAdmin.id,
    },
  })

  const currentSemester = await prisma.semester.upsert({
    where: { name: 'Odd Semester 2026-27' },
    update: { isLocked: false },
    create: {
      name: 'Odd Semester 2026-27',
      startDate: new Date('2026-07-15T00:00:00.000Z'),
      endDate: new Date('2026-12-15T00:00:00.000Z'),
      totalBudget: '50000.00',
      isLocked: false,
    },
  })

  // ============================================================
  // 6. BUDGET ALLOCATIONS (Odd Semester 2026-27, total ₹50,000)
  // ============================================================
  console.log('Setting up budget allocations...')

  const budgetData = [
    { category: catLogistics, amount: '5000.00', notes: 'Logistics budget for semester.' },
    { category: catRefreshments, amount: '8000.00', notes: 'Refreshments across all events.' },
    { category: catMarketing, amount: '6000.00', notes: 'Banners, posters, digital marketing.' },
    { category: catEquipment, amount: '7000.00', notes: 'Equipment and supplies for technical events.' },
    { category: catTravel, amount: '5000.00', notes: 'Speaker travel and accommodation.' },
    { category: catHonorarium, amount: '10000.00', notes: 'Prize money and honorarium pool.' },
    { category: catVenue, amount: '4000.00', notes: 'External venue or AV rental.' },
    { category: catMisc, amount: '5000.00', notes: 'Contingency miscellaneous budget.' },
  ]

  for (const b of budgetData) {
    await prisma.budgetAllocation.upsert({
      where: {
        semesterId_categoryId_clubId: {
          semesterId: currentSemester.id,
          categoryId: b.category.id,
          clubId: acmClub.id,
        },
      },
      update: {
        allocatedAmount: b.amount,
        notes: b.notes,
      },
      create: {
        semesterId: currentSemester.id,
        categoryId: b.category.id,
        clubId: acmClub.id,
        allocatedAmount: b.amount,
        notes: b.notes,
        createdByUserId: acmCore.id,
      },
    })
  }

  // ============================================================
  // 7. SAFE IDEMPOTENT TRANSACTIONAL CLEANUP
  // Clean up transactional records before inserting the pristine minimal demo set.
  // ============================================================
  console.log('Clearing old transactional data for clean idempotent demo dataset...')

  await prisma.receipt.deleteMany({})
  await prisma.expense.deleteMany({})
  await prisma.conflictRecord.deleteMany({})
  await prisma.eventReview.deleteMany({})
  await prisma.event.deleteMany({})
  await prisma.notification.deleteMany({})
  await prisma.auditLog.deleteMany({})

  // ============================================================
  // 8. MINIMAL DEMO EVENTS (EXACTLY 6 EVENTS)
  //
  // Intentional Conflict Pair:
  // - Event 1: Coding Club Hackathon, LT-1, Sept 20, 4:00 PM - 8:00 PM IST (VERIFIED)
  // - Event 2: ACM DSA Workshop, LT-1, Sept 20, 5:00 PM - 7:00 PM IST (SUBMITTED)
  //   -> Overlaps venue (LT-1) and target audience (2nd year CSE/IT).
  //
  // Remaining 4 events (0 unintended conflicts, completely distinct days & venues):
  // - Event 3: Robotics Club Exhibition, Seminar Hall, Oct 5, 10:00 AM - 1:00 PM IST (VERIFIED)
  // - Event 4: GDSC Cloud Jam, LT-2, Oct 12, 2:00 PM - 4:00 PM IST (VERIFIED)
  // - Event 5: E-Cell Startup Pitch, Auditorium, Oct 20, 11:00 AM - 3:00 PM IST (SUBMITTED)
  // - Event 6: Coding Club Draft Meetup, Lab 1, Oct 28, 2:00 PM - 4:00 PM IST (DRAFT)
  // ============================================================
  console.log('Creating exactly 6 demo events...')

  // Event 1 (Conflict Pair - Event A)
  const event1 = await prisma.event.create({
    data: {
      title: '[DEMO] Technical Hackathon — Coding Club',
      description: 'Flagship competitive hackathon for 2nd year engineering students focusing on web and systems development.',
      eventType: EventType.HACKATHON,
      clubId: codingClub.id,
      venueId: lt1.id,
      semesterId: currentSemester.id,
      submittedByUserId: codingClubRep.id,
      startAt: istToUtc('2026-09-20', '16:00'), // 10:30 UTC
      endAt: istToUtc('2026-09-20', '20:00'),   // 14:30 UTC
      targetYears: [2],
      targetBranches: ['CSE', 'IT'],
      expectedAttendees: 80,
      status: EventStatus.VERIFIED,
      tags: ['hackathon', 'competitive', 'coding'],
    },
  })

  // Event 2 (Conflict Pair - Event B)
  const event2 = await prisma.event.create({
    data: {
      title: '[DEMO] Technical Workshop on DSA — ACM',
      description: 'Intensive data structures and algorithms problem solving workshop for 2nd year students targeting competitive programming.',
      eventType: EventType.WORKSHOP,
      clubId: acmClub.id,
      venueId: lt1.id, // SAME VENUE AS EVENT 1
      semesterId: currentSemester.id,
      submittedByUserId: acmExec.id,
      startAt: istToUtc('2026-09-20', '17:00'), // 11:30 UTC (OVERLAPS EVENT 1: 17:00 to 19:00 IST)
      endAt: istToUtc('2026-09-20', '19:00'),   // 13:30 UTC
      targetYears: [2],                        // OVERLAPS TARGET AUDIENCE
      targetBranches: ['CSE', 'IT'],
      expectedAttendees: 60,
      status: EventStatus.SUBMITTED,
      tags: ['workshop', 'DSA', 'algorithms'],
    },
  })

  // Event 3 (No Conflict - Distinct Date & Venue)
  const event3 = await prisma.event.create({
    data: {
      title: 'Robotics Club Annual Hardware Exhibition',
      description: 'Showcase of student-built autonomous line followers, maze solvers, and IoT sensor projects.',
      eventType: EventType.WORKSHOP,
      clubId: roboticsClub.id,
      venueId: seminarHall.id,
      semesterId: currentSemester.id,
      submittedByUserId: roboticsRep.id,
      startAt: istToUtc('2026-10-05', '10:00'), // 04:30 UTC
      endAt: istToUtc('2026-10-05', '13:00'),   // 07:30 UTC
      targetYears: [1, 2, 3],
      targetBranches: [],
      expectedAttendees: 100,
      status: EventStatus.VERIFIED,
      tags: ['robotics', 'hardware', 'exhibition'],
    },
  })

  // Event 4 (No Conflict - Distinct Date & Venue)
  const event4 = await prisma.event.create({
    data: {
      title: 'GDSC Cloud & DevOps Study Jam',
      description: 'Hands-on cloud deployment workshop covering Docker containerization, CI/CD pipelines, and cloud computing fundamentals.',
      eventType: EventType.WORKSHOP,
      clubId: gdscClub.id,
      venueId: lt2.id,
      semesterId: currentSemester.id,
      submittedByUserId: gdscRep.id,
      startAt: istToUtc('2026-10-12', '14:00'), // 08:30 UTC
      endAt: istToUtc('2026-10-12', '16:00'),   // 10:30 UTC
      targetYears: [2, 3, 4],
      targetBranches: ['CSE', 'IT'],
      expectedAttendees: 45,
      status: EventStatus.VERIFIED,
      tags: ['cloud', 'devops', 'gcp'],
    },
  })

  // Event 5 (No Conflict - Distinct Date & Venue)
  const event5 = await prisma.event.create({
    data: {
      title: 'E-Cell Campus Startup Pitch 2026',
      description: 'Annual startup pitching competition and investor deck presentation for student founders and early-stage ideas.',
      eventType: EventType.COMPETITION,
      clubId: ecellClub.id,
      venueId: auditorium.id,
      semesterId: currentSemester.id,
      submittedByUserId: ecellRep.id,
      startAt: istToUtc('2026-10-20', '11:00'), // 05:30 UTC
      endAt: istToUtc('2026-10-20', '15:00'),   // 09:30 UTC
      targetYears: [1, 2, 3, 4],
      targetBranches: [],
      expectedAttendees: 150,
      status: EventStatus.SUBMITTED,
      tags: ['startup', 'pitch', 'entrepreneurship'],
    },
  })

  // Event 6 (No Conflict - Distinct Date & Venue, DRAFT for demonstrating creator-only editing)
  const event6 = await prisma.event.create({
    data: {
      title: 'Coding Club CodeSprint Hack Meetup',
      description: 'Bi-weekly community coding sprint and peer debugging meetup for introductory and intermediate coders.',
      eventType: EventType.WORKSHOP,
      clubId: codingClub.id,
      venueId: lab1.id,
      semesterId: currentSemester.id,
      submittedByUserId: codingClubRep.id,
      startAt: istToUtc('2026-10-28', '14:00'), // 08:30 UTC
      endAt: istToUtc('2026-10-28', '16:00'),   // 10:30 UTC
      targetYears: [1, 2],
      targetBranches: ['CSE', 'IT'],
      expectedAttendees: 35,
      status: EventStatus.DRAFT,
      tags: ['CP', 'meetup', 'coding'],
    },
  })

  // ============================================================
  // 9. CONFLICT DETECTION ENGINE EXECUTION
  // Detect conflicts for Event 2 against other events.
  // This produces exactly 1 intentional conflict pair (VENUE + AUDIENCE).
  // ============================================================
  console.log('Running conflict detection for the demo conflict pair...')

  const conflictService = new ConflictService()
  const acmCoreSession: SessionUser = {
    id: acmCore.id,
    email: acmCore.email,
    name: acmCore.name,
    role: acmCore.role,
    clubId: acmCore.clubId,
  }

  // Detect conflicts for all 6 events to verify engine output
  await conflictService.detectConflicts(acmCoreSession, event1.id)
  await conflictService.detectConflicts(acmCoreSession, event2.id)
  await conflictService.detectConflicts(acmCoreSession, event3.id)
  await conflictService.detectConflicts(acmCoreSession, event4.id)
  await conflictService.detectConflicts(acmCoreSession, event5.id)
  await conflictService.detectConflicts(acmCoreSession, event6.id)

  const totalConflicts = await prisma.conflictRecord.count()
  console.log(`Generated ${totalConflicts} conflict records for intentional conflict pair (Event 1 & Event 2).`)

  // ============================================================
  // 10. MINIMAL DEMO EXPENSES (EXACTLY 5 EXPENSES)
  //
  // - Expense 1: Coding Club Hackathon Snacks (DRAFT, ₹4,500, Refreshments, rep.coding, linked to Event 1)
  // - Expense 2: ACM Workshop Kits (SUBMITTED, ₹3,200, Logistics, exec, linked to Event 2)
  // - Expense 3: Speaker Honorarium (APPROVED, ₹5,000, Honorarium, exec, reviewed by core, linked to Event 2) + PDF Receipt
  // - Expense 4: Robotics Sensors (APPROVED, ₹6,500, Equipment, rep.robotics, reviewed by core, linked to Event 3) + Image Receipt
  // - Expense 5: E-Cell Mentor Travel (REJECTED, ₹4,800, Travel, rep.ecell, reviewed by core with reason, linked to Event 5)
  // ============================================================
  console.log('Creating exactly 5 demo expenses...')

  // Expense 1: DRAFT (Creator-Only Edit demo for rep.coding)
  const expense1 = await prisma.expense.create({
    data: {
      eventId: event1.id,
      semesterId: currentSemester.id,
      categoryId: catRefreshments.id,
      clubId: codingClub.id,
      createdByUserId: codingClubRep.id,
      title: 'Hackathon Refreshments & Snacks',
      description: 'Evening refreshments, bottled water, and tea/coffee for hackathon participants and mentors.',
      amount: '4500.00',
      date: new Date('2026-09-19T00:00:00.000Z'),
      status: ExpenseStatus.DRAFT,
    },
  })

  // Expense 2: SUBMITTED (Review Queue demo for Core/Admin)
  const expense2 = await prisma.expense.create({
    data: {
      eventId: event2.id,
      semesterId: currentSemester.id,
      categoryId: catLogistics.id,
      clubId: acmClub.id,
      createdByUserId: acmExec.id,
      title: 'DSA Workshop Kit & Materials',
      description: 'Printed problem sheets, participant badge cards, and workshop stationery.',
      amount: '3200.00',
      date: new Date('2026-09-18T00:00:00.000Z'),
      status: ExpenseStatus.SUBMITTED,
    },
  })

  // Expense 3: APPROVED (Exact Decimal Honorarium demo + PDF receipt)
  const expense3 = await prisma.expense.create({
    data: {
      eventId: event2.id,
      semesterId: currentSemester.id,
      categoryId: catHonorarium.id,
      clubId: acmClub.id,
      createdByUserId: acmExec.id,
      title: 'Speaker Honorarium — AI & Systems Tech Talk',
      description: 'Keynote guest speaker honorarium for advanced competitive programming session.',
      amount: '5000.00',
      date: new Date('2026-09-21T00:00:00.000Z'),
      status: ExpenseStatus.APPROVED,
      reviewedByUserId: acmCore.id,
      reviewedAt: new Date('2026-09-22T10:00:00.000Z'),
    },
  })

  // Expense 4: APPROVED (Budget deduction demo + Image receipt)
  const expense4 = await prisma.expense.create({
    data: {
      eventId: event3.id,
      semesterId: currentSemester.id,
      categoryId: catEquipment.id,
      clubId: roboticsClub.id,
      createdByUserId: roboticsRep.id,
      title: 'Robotics Hardware Sensors & Microcontrollers',
      description: 'Ultrasonic sensors, Arduino Nano microcontrollers, and breadboards for hardware demonstration.',
      amount: '6500.00',
      date: new Date('2026-10-04T00:00:00.000Z'),
      status: ExpenseStatus.APPROVED,
      reviewedByUserId: acmCore.id,
      reviewedAt: new Date('2026-10-06T10:00:00.000Z'),
    },
  })

  // Expense 5: REJECTED (Rejection reason display demo)
  const expense5 = await prisma.expense.create({
    data: {
      eventId: event5.id,
      semesterId: currentSemester.id,
      categoryId: catTravel.id,
      clubId: ecellClub.id,
      createdByUserId: ecellRep.id,
      title: 'External Mentor Travel Reimbursement',
      description: 'Inter-city travel reimbursement claim for guest investor mentor.',
      amount: '4800.00',
      date: new Date('2026-10-19T00:00:00.000Z'),
      status: ExpenseStatus.REJECTED,
      reviewedByUserId: acmCore.id,
      reviewedAt: new Date('2026-10-21T11:00:00.000Z'),
      rejectionReason: 'Exceeds pre-approved student club travel threshold without prior administrative sanction.',
    },
  })

  // ============================================================
  // 11. DEMO RECEIPTS (Attached to Approved Expenses)
  // ============================================================
  console.log('Attaching demo receipts to approved expenses...')

  await prisma.receipt.create({
    data: {
      expenseId: expense3.id,
      fileUrl: 'https://res.cloudinary.com/demo/image/upload/sample-invoice.pdf',
      storagePublicId: 'receipts/demo-receipt-speaker',
      fileName: 'speaker_honorarium_receipt_sept2026.pdf',
      mimeType: 'application/pdf',
      fileSizeBytes: 142857,
      sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      uploadedByUserId: acmExec.id,
    },
  })

  await prisma.receipt.create({
    data: {
      expenseId: expense4.id,
      fileUrl: 'https://res.cloudinary.com/demo/image/upload/sample.jpg',
      storagePublicId: 'receipts/demo-receipt-robotics',
      fileName: 'robotics_sensor_invoice_oct2026.png',
      mimeType: 'image/png',
      fileSizeBytes: 204800,
      sha256: 'ca978112ca1bbdccafac231b39a23dc4da786eff8147c4e72b9807785afee48e',
      uploadedByUserId: roboticsRep.id,
    },
  })

  // ============================================================
  // 12. SAMPLE AUDIT LOGS
  // ============================================================
  console.log('Creating sample audit logs...')

  await prisma.auditLog.create({
    data: {
      actorUserId: superAdmin.id,
      action: AuditAction.SEMESTER_LOCK,
      targetType: 'Semester',
      targetId: prevSemester.id,
      beforeState: { isLocked: false },
      afterState: { isLocked: true, lockedAt: '2026-06-05T05:30:00.000Z' },
      metadata: { reason: 'End of semester - locked for archival and institutional record preservation.' },
    },
  })

  await prisma.auditLog.create({
    data: {
      actorUserId: acmCore.id,
      action: AuditAction.BUDGET_ALLOCATE,
      targetType: 'BudgetAllocation',
      targetId: currentSemester.id,
      beforeState: undefined,
      afterState: { totalBudget: '50000.00', semester: 'Odd Semester 2026-27' },
      metadata: { note: 'Initial semester budget allocations established across categories.' },
    },
  })

  await prisma.auditLog.create({
    data: {
      actorUserId: codingClubRep.id,
      action: AuditAction.EVENT_SUBMIT,
      targetType: 'Event',
      targetId: event1.id,
      beforeState: { status: 'DRAFT' },
      afterState: { status: 'SUBMITTED' },
      metadata: { note: 'Submitted for ACM Core scheduling review.' },
    },
  })

  await prisma.auditLog.create({
    data: {
      actorUserId: acmCore.id,
      action: AuditAction.EVENT_VERIFY,
      targetType: 'Event',
      targetId: event1.id,
      beforeState: { status: 'SUBMITTED' },
      afterState: { status: 'VERIFIED' },
      metadata: { note: 'Event schedule verified and published to calendar.' },
    },
  })

  await prisma.auditLog.create({
    data: {
      actorUserId: acmExec.id,
      action: AuditAction.EVENT_SUBMIT,
      targetType: 'Event',
      targetId: event2.id,
      beforeState: { status: 'DRAFT' },
      afterState: { status: 'SUBMITTED' },
      metadata: { note: 'Submitted for scheduling review. Detected schedule overlap with Coding Club Hackathon.' },
    },
  })

  await prisma.auditLog.create({
    data: {
      actorUserId: acmCore.id,
      action: AuditAction.EXPENSE_APPROVE,
      targetType: 'Expense',
      targetId: expense3.id,
      beforeState: { status: 'SUBMITTED' },
      afterState: { status: 'APPROVED' },
      metadata: { note: 'Verified honorarium payment voucher against Honorarium budget allocation.' },
    },
  })

  await prisma.auditLog.create({
    data: {
      actorUserId: acmCore.id,
      action: AuditAction.EXPENSE_REJECT,
      targetType: 'Expense',
      targetId: expense5.id,
      beforeState: { status: 'SUBMITTED' },
      afterState: { status: 'REJECTED' },
      metadata: { reason: 'Exceeds pre-approved student club travel threshold without prior administrative sanction.' },
    },
  })

  // Final counts
  const counts = {
    clubs: await prisma.club.count(),
    users: await prisma.user.count(),
    venues: await prisma.venue.count(),
    semesters: await prisma.semester.count(),
    categories: await prisma.expenseCategory.count(),
    budgetAllocations: await prisma.budgetAllocation.count(),
    events: await prisma.event.count(),
    expenses: await prisma.expense.count(),
    conflicts: await prisma.conflictRecord.count(),
    receipts: await prisma.receipt.count(),
    notifications: await prisma.notification.count(),
    auditLogs: await prisma.auditLog.count(),
  }

  console.log('')
  console.log('✅ Idempotent minimal demo seed completed successfully!')
  console.log('📊 Verified Database Summary:')
  console.log(`  Clubs: ${counts.clubs} (ACM, CC, RC, GDSC, ECELL)`)
  console.log(`  Users: ${counts.users} (9 demo accounts, password: "${DEMO_PASSWORD}")`)
  console.log(`  Venues: ${counts.venues} (LT-1, LT-2, Seminar Hall, Auditorium, Lab 1, Lab 2, Amphitheater)`)
  console.log(`  Semesters: ${counts.semesters} (Even 2025-26 [Locked], Odd 2026-27 [Active])`)
  console.log(`  Expense Categories: ${counts.categories}`)
  console.log(`  Budget Allocations: ${counts.budgetAllocations} (Odd Semester 2026-27, ₹50,000 total)`)
  console.log(`  Events: ${counts.events} (EXACTLY 6 demo events)`)
  console.log(`  Expenses: ${counts.expenses} (EXACTLY 5 demo expenses: 1 DRAFT, 1 SUBMITTED, 2 APPROVED, 1 REJECTED)`)
  console.log(`  Conflict Records: ${counts.conflicts} (Single intentional conflict pair: Event 1 & Event 2)`)
  console.log(`  Receipts: ${counts.receipts} (2 receipts attached to approved expenses)`)
  console.log(`  Audit Logs: ${counts.auditLogs}`)
  console.log(`  Notifications: ${counts.notifications}`)
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
