"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("../../prisma/client");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const requirePrivilege_1 = require("../../middleware/requirePrivilege");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authMiddleware);
function canManageScope(req, user) {
    if (req.user?.role === "WOREDA_ADMIN")
        return true;
    if (req.user?.role === "HIBRET_ADMIN" && user.hibretId === req.user?.hibretId)
        return true;
    return false;
}
function mapUser(user) {
    return {
        id: user.id,
        email: user.email,
        role: user.role,
        status: user.status,
        hibretId: user.hibretId,
        hibretName: user.hibret?.name ?? null,
        memberId: user.memberId,
        memberName: user.member
            ? [user.member.firstName, user.member.fatherName, user.member.grandfatherName].filter(Boolean).join(" ")
            : null,
        lastLoginAt: user.lastLoginAt,
        createdAt: user.createdAt,
    };
}
router.get("/", (0, requirePrivilege_1.requirePrivilege)("member_account.read"), async (req, res) => {
    const search = String(req.query.search || "").trim();
    const status = String(req.query.status || "").trim();
    const requestedRole = String(req.query.role || "MEMBER").trim();
    const role = ["MEMBER", "HIBRET_ADMIN", "WOREDA_ADMIN"].includes(requestedRole)
        ? requestedRole
        : "MEMBER";
    const where = {};
    if (req.user?.role === "HIBRET_ADMIN") {
        where.hibretId = req.user.hibretId || "__none__";
        where.role = "MEMBER";
    }
    else {
        where.role = role || "MEMBER";
    }
    if (status)
        where.status = status;
    if (search) {
        where.OR = [
            { email: { contains: search, mode: "insensitive" } },
            { hibret: { name: { contains: search, mode: "insensitive" } } },
            { member: { firstName: { contains: search, mode: "insensitive" } } },
            { member: { fatherName: { contains: search, mode: "insensitive" } } },
            { member: { ppId: { contains: search, mode: "insensitive" } } },
            { member: { fanId: { contains: search, mode: "insensitive" } } },
        ];
    }
    const users = await client_1.prisma.user.findMany({
        where,
        include: { hibret: true, member: true },
        orderBy: [{ role: "asc" }, { email: "asc" }],
    });
    const summary = {
        total: users.length,
        active: users.filter((u) => u.status === "ACTIVE").length,
        pending: users.filter((u) => u.status === "PENDING_SETUP").length,
        disabled: users.filter((u) => u.status === "DISABLED").length,
    };
    return res.json({ summary, users: users.map(mapUser) });
});
router.patch("/:userId/status", (0, requirePrivilege_1.requirePrivilege)("member_account.update"), async (req, res) => {
    const userId = String(req.params.userId);
    const status = String(req.body.status || "").trim();
    if (!["ACTIVE", "DISABLED", "PENDING_SETUP"].includes(status)) {
        return res.status(400).json({ message: "Invalid account status." });
    }
    const user = await client_1.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !canManageScope(req, user)) {
        return res.status(404).json({ message: "User account not found in your scope." });
    }
    const updated = await client_1.prisma.user.update({
        where: { id: userId },
        data: { status: status },
        include: { hibret: true, member: true },
    });
    return res.json({ user: mapUser(updated) });
});
router.patch("/bulk/status", (0, requirePrivilege_1.requirePrivilege)("member_account.update"), async (req, res) => {
    const userIds = Array.isArray(req.body.userIds) ? req.body.userIds.map(String) : [];
    const status = String(req.body.status || "").trim();
    if (!userIds.length)
        return res.status(400).json({ message: "Select at least one user." });
    if (!["ACTIVE", "DISABLED", "PENDING_SETUP"].includes(status)) {
        return res.status(400).json({ message: "Invalid account status." });
    }
    const users = await client_1.prisma.user.findMany({ where: { id: { in: userIds } } });
    const allowed = users.filter((user) => canManageScope(req, user));
    await client_1.prisma.user.updateMany({
        where: { id: { in: allowed.map((u) => u.id) } },
        data: { status: status },
    });
    return res.json({ message: "Selected users updated.", updated: allowed.length });
});
exports.default = router;
