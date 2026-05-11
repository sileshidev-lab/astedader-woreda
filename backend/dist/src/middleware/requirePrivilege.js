"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requirePrivilege = requirePrivilege;
exports.requireAnyPrivilege = requireAnyPrivilege;
function hasPrivilege(userPrivileges, required) {
    if (userPrivileges.includes("*"))
        return true;
    return required.some((privilege) => userPrivileges.includes(privilege));
}
function requirePrivilege(privilege) {
    return (req, res, next) => {
        const privileges = req.user?.privileges ?? [];
        if (hasPrivilege(privileges, [privilege])) {
            return next();
        }
        return res.status(403).json({ message: "Permission denied" });
    };
}
function requireAnyPrivilege(privilegesToAllow) {
    return (req, res, next) => {
        const privileges = req.user?.privileges ?? [];
        if (hasPrivilege(privileges, privilegesToAllow)) {
            return next();
        }
        return res.status(403).json({ message: "Permission denied" });
    };
}
