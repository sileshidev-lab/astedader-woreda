"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const client_2 = require("../src/prisma/client");
const password_1 = require("../src/utils/password");
async function main() {
    const hibret = await client_2.prisma.hibret.findFirst({
        orderBy: {
            name: "asc",
        },
    });
    if (!hibret) {
        throw new Error("No Hibret found. Seed Hibrets first.");
    }
    const passwordHash = await (0, password_1.hashPassword)("hibret@123.A");
    const user = await client_2.prisma.user.upsert({
        where: {
            email: "hibret@woreda.local",
        },
        update: {
            passwordHash,
            role: client_1.UserRole.HIBRET_ADMIN,
            status: client_1.AccountStatus.ACTIVE,
            hibretId: hibret.id,
            memberId: null,
            privileges: [
                "announcement.read",
                "report.read",
                "report.create",
                "report.update",
                "report.submit",
                "report.export",
                "media.upload",
                "attendance.read",
                "attendance.update",
                "attendance.export",
                "family.read",
                "member.read",
                "resource.read",
                "broadcast.read",
                "chat.read",
                "chat.send",
                "analytics.read",
                "profile.read",
                "profile.update"
            ],
        },
        create: {
            email: "hibret@woreda.local",
            passwordHash,
            role: client_1.UserRole.HIBRET_ADMIN,
            status: client_1.AccountStatus.ACTIVE,
            hibretId: hibret.id,
            privileges: [
                "announcement.read",
                "report.read",
                "report.create",
                "report.update",
                "report.submit",
                "report.export",
                "media.upload",
                "attendance.read",
                "attendance.update",
                "attendance.export",
                "family.read",
                "member.read",
                "resource.read",
                "broadcast.read",
                "chat.read",
                "chat.send",
                "analytics.read",
                "profile.read",
                "profile.update"
            ],
        },
    });
    console.log("Seeded Hibret admin:");
    console.log("Email: hibret@woreda.local");
    console.log("Password: hibret@123.A");
    console.log("Assigned Hibret:", hibret.name);
    console.log("User ID:", user.id);
}
main()
    .catch((error) => {
    console.error(error);
    process.exit(1);
})
    .finally(async () => {
    await client_2.prisma.$disconnect();
});
