import { prisma } from "../src/prisma/client";

const sampleMembers = [
  {
    memberCode: "CSC-001",
    fanId: "100001",
    ppId: "PP/000001",
    firstName: "Abebe",
    fatherName: "Kebede",
    grandfatherName: "Tesfaye",
    gender: "male",
    phone: "0911000001",
    membershipStatus: "active",
  },
  {
    memberCode: "CSC-002",
    fanId: "100002",
    ppId: "PP/000002",
    firstName: "Marta",
    fatherName: "Alemu",
    grandfatherName: "Bekele",
    gender: "female",
    phone: "0911000002",
    membershipStatus: "active",
  },
  {
    memberCode: "CSC-003",
    fanId: "100003",
    ppId: "PP/000003",
    firstName: "Dawit",
    fatherName: "Tadesse",
    grandfatherName: "Girma",
    gender: "male",
    phone: "0911000003",
    membershipStatus: "active",
  },
  {
    memberCode: "CSC-004",
    fanId: "100004",
    ppId: "PP/000004",
    firstName: "Sara",
    fatherName: "Mekonnen",
    grandfatherName: "Hailu",
    gender: "female",
    phone: "0911000004",
    membershipStatus: "active",
  },
  {
    memberCode: "CSC-005",
    fanId: "100005",
    ppId: "PP/000005",
    firstName: "Yonas",
    fatherName: "Getachew",
    grandfatherName: "Asefa",
    gender: "male",
    phone: "0911000005",
    membershipStatus: "active",
  },
];

async function main() {
  const hibretAdmin = await prisma.user.findUnique({
    where: {
      email: "hibret@woreda.local",
    },
    include: {
      hibret: true,
    },
  });

  if (!hibretAdmin?.hibretId || !hibretAdmin.hibret) {
    throw new Error("hibret@woreda.local is not assigned to a Hibret.");
  }

  for (const member of sampleMembers) {
    await prisma.member.upsert({
      where: {
        memberCode: member.memberCode,
      },
      update: {
        ...member,
        hibretId: hibretAdmin.hibretId,
      },
      create: {
        ...member,
        hibretId: hibretAdmin.hibretId,
      },
    });
  }

  console.log(`Seeded ${sampleMembers.length} members for ${hibretAdmin.hibret.name}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
