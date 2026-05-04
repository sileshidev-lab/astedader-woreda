import pkg from "@prisma/client";
import bcrypt from "bcrypt";

const { PrismaClient } = pkg;
const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("admin123", 12);

  const woredaAdmin = await prisma.user.upsert({
    where: { email: "admin@woreda.local" },
    update: {
      passwordHash,
      role: "woreda_admin",
      status: "active",
      privileges: ["*"],
      hibretId: null,
      familyId: null,
      memberId: null,
    },
    create: {
      email: "admin@woreda.local",
      passwordHash,
      role: "woreda_admin",
      status: "active",
      privileges: ["*"],
    },
  });

  const hibret1 = await prisma.hibret.upsert({
    where: { name: "ሲቪል ሰርቪስ ኮሚሽን" },
    update: {},
    create: { name: "ሲቪል ሰርቪስ ኮሚሽን" },
  });

  const hibret2 = await prisma.hibret.upsert({
    where: { name: "የጠቅላይ ሚኒስትር ጽሕፈት ቤት" },
    update: {},
    create: { name: "የጠቅላይ ሚኒስትር ጽሕፈት ቤት" },
  });

  const family1 = await prisma.family.upsert({
    where: { name_hibretId: { name: "Family 1", hibretId: hibret1.id } },
    update: {},
    create: { name: "Family 1", hibretId: hibret1.id },
  });

  const family2 = await prisma.family.upsert({
    where: { name_hibretId: { name: "Family 2", hibretId: hibret1.id } },
    update: {},
    create: { name: "Family 2", hibretId: hibret1.id },
  });

  const family3 = await prisma.family.upsert({
    where: { name_hibretId: { name: "Family 1", hibretId: hibret2.id } },
    update: {},
    create: { name: "Family 1", hibretId: hibret2.id },
  });

  await prisma.member.upsert({
    where: { memberCode: "MEM-001" },
    update: {},
    create: {
      memberCode: "MEM-001",
      fanId: "FAN-001",
      ppId: "PP-001",
      firstName: "Abebe",
      fatherName: "Kebede",
      grandfatherName: "Tesfaye",
      gender: "male",
      email: "member1@example.com",
      phone: "0911000001",
      hibretId: hibret1.id,
      familyId: family1.id,
      membershipStatus: "active",
      registrationType: "regular",
      educationLevel: "degree",
      workType: "government",
      profileCompletion: 80,
    },
  });

  await prisma.member.upsert({
    where: { memberCode: "MEM-002" },
    update: {},
    create: {
      memberCode: "MEM-002",
      fanId: "FAN-002",
      ppId: "PP-002",
      firstName: "Almaz",
      fatherName: "Bekele",
      grandfatherName: "Tadesse",
      gender: "female",
      email: "member2@example.com",
      phone: "0911000002",
      hibretId: hibret1.id,
      familyId: family2.id,
      membershipStatus: "active",
      registrationType: "regular",
      educationLevel: "diploma",
      workType: "private",
      profileCompletion: 75,
    },
  });

  await prisma.member.upsert({
    where: { memberCode: "MEM-003" },
    update: {},
    create: {
      memberCode: "MEM-003",
      fanId: "FAN-003",
      ppId: "PP-003",
      firstName: "Dawit",
      fatherName: "Alemu",
      grandfatherName: "Girma",
      gender: "male",
      email: "member3@example.com",
      phone: "0911000003",
      hibretId: hibret2.id,
      familyId: family3.id,
      membershipStatus: "active",
      registrationType: "regular",
      educationLevel: "degree",
      workType: "government",
      profileCompletion: 70,
    },
  });

  const hibretAdminPassword = await bcrypt.hash("hibret123", 12);
  await prisma.user.upsert({
    where: { email: "hibret@woreda.local" },
    update: {
      passwordHash: hibretAdminPassword,
      role: "hibret_admin",
      status: "active",
      hibretId: hibret1.id,
      familyId: null,
      memberId: null,
      privileges: ["*"],
    },
    create: {
      email: "hibret@woreda.local",
      passwordHash: hibretAdminPassword,
      role: "hibret_admin",
      status: "active",
      hibretId: hibret1.id,
      privileges: ["*"],
    },
  });

  const familyAdminPassword = await bcrypt.hash("family123", 12);
  const familyAdmin = await prisma.user.upsert({
    where: { email: "family@woreda.local" },
    update: {
      passwordHash: familyAdminPassword,
      role: "family_admin",
      status: "active",
      hibretId: hibret1.id,
      familyId: family1.id,
      memberId: null,
      privileges: ["*"],
    },
    create: {
      email: "family@woreda.local",
      passwordHash: familyAdminPassword,
      role: "family_admin",
      status: "active",
      hibretId: hibret1.id,
      familyId: family1.id,
      privileges: ["*"],
    },
  });

  const member = await prisma.member.findUnique({ where: { memberCode: "MEM-001" } });
  const memberPassword = await bcrypt.hash("member123", 12);

  await prisma.user.upsert({
    where: { email: "member@woreda.local" },
    update: {
      passwordHash: memberPassword,
      role: "member",
      status: "active",
      hibretId: member.hibretId,
      familyId: member.familyId,
      memberId: member.id,
      privileges: [
        "broadcast.read",
        "form.read",
        "form_submission.create",
        "resource.read",
        "resource.download",
        "profile.read",
        "profile.update_request",
        "account.password_change"
      ],
    },
    create: {
      email: "member@woreda.local",
      passwordHash: memberPassword,
      role: "member",
      status: "active",
      hibretId: member.hibretId,
      familyId: member.familyId,
      memberId: member.id,
      privileges: [
        "broadcast.read",
        "form.read",
        "form_submission.create",
        "resource.read",
        "resource.download",
        "profile.read",
        "profile.update_request",
        "account.password_change"
      ],
    },
  });

  await prisma.family.update({
    where: { id: family1.id },
    data: { familyAdminUserId: familyAdmin.id },
  });

  await prisma.activityLog.create({
    data: {
      actorUserId: woredaAdmin.id,
      actorEmail: woredaAdmin.email,
      actorRole: woredaAdmin.role,
      operation: "seed",
      targetType: "system",
      description: "Seed data created",
      metadata: { noWoredaId: true },
    },
  });

  console.log("Seed completed");
  console.log("Woreda admin: admin@woreda.local / admin123");
  console.log("Hibret admin: hibret@woreda.local / hibret123");
  console.log("Family admin: family@woreda.local / family123");
  console.log("Member: member@woreda.local / member123");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });