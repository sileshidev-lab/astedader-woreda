"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const client_2 = require("../src/prisma/client");
const password_1 = require("../src/utils/password");
async function main() {
    const passwordHash = await (0, password_1.hashPassword)("admin@123.A");
    await client_2.prisma.user.upsert({
        where: { email: "admin@woreda.local" },
        update: {
            passwordHash,
            role: client_1.UserRole.WOREDA_ADMIN,
            status: client_1.AccountStatus.ACTIVE,
            privileges: ["*"],
        },
        create: {
            email: "admin@woreda.local",
            passwordHash,
            role: client_1.UserRole.WOREDA_ADMIN,
            status: client_1.AccountStatus.ACTIVE,
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
        await client_2.prisma.hibret.upsert({
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
    await client_2.prisma.$disconnect();
});
