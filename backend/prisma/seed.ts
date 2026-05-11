import { AccountStatus, UserRole } from "@prisma/client";
import { prisma } from "../src/prisma/client";
import { hashPassword } from "../src/utils/password";

async function main() {
  const passwordHash = await hashPassword("admin@123.A");

  await prisma.user.upsert({
    where: { email: "admin@woreda.local" },
    update: {
      passwordHash,
      role: UserRole.WOREDA_ADMIN,
      status: AccountStatus.ACTIVE,
      privileges: ["*"],
    },
    create: {
      email: "admin@woreda.local",
      passwordHash,
      role: UserRole.WOREDA_ADMIN,
      status: AccountStatus.ACTIVE,
      privileges: ["*"],
    },
  });

  const hibretNames = [
    "የጠቅላይ ሚኒስትር ጽሕፈት ቤት",
    "የኢትዮጵያ ኢንቨስትመንት ኮሚሽን",
    "የሥነ-ምግባርና ፀረ-ሙስና ኮሚሽን",
    "የመንግሥት ሠራተኞች ማኅበራዊ ዋስትና አስተዳደር",
    "የስደተኞችና ተመላሾች አገልግሎት ቁ. 1",
    "የስደተኞችና ተመላሾች አገልግሎት ቁ. 2",
    "የኢምግሬሽንና ዜግነት አገልግሎት ቁ. 1",
    "የኢምግሬሽንና ዜግነት አገልግሎት ቁ. 2",
    "የኢትዮጵያ ብቃትና ሥራ አመራር",
    "የአደጋ ሥጋት ሥራ አመራር ቁ. 1",
    "የአደጋ ሥጋት ሥራ አመራር ቁ. 2",
    "አፍሪካ አመራር ልህቀት አካዳሚ",
    "የግል ድርጅቶች ሠራተኞች ማኅበራዊ ዋስትና አስተዳደር",
    "አንድነት ፓርኮች ኮርፖሬሽን ቁ. 1",
    "አንድነት ፓርኮች ኮርፖሬሽን ቁ. 2",
    "የቤተ-መንግሥትና ኮሚኒኬሽን",
    "ሲቪል ሰርቪስ ኮሚሽን",
  ];

  for (const name of hibretNames) {
    await prisma.hibret.upsert({
      where: { name },
      update: {},
      create: {
        name,
        description: name,
        status: "active",
      },
    });
  }

  console.log("Seeded Woreda user and real sample Hibrets");
  console.log("Email: admin@woreda.local");
  console.log("Password: admin@123.A");
  console.log(`Hibrets: ${hibretNames.length}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
