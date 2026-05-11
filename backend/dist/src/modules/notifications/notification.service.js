"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createNotification = createNotification;
exports.notifyRole = notifyRole;
exports.notifyHibret = notifyHibret;
exports.notifyWoredaAdmins = notifyWoredaAdmins;
const client_1 = require("../../prisma/client");
async function createNotification(input) {
    return client_1.prisma.notification.create({
        data: {
            title: input.title,
            message: input.message ?? null,
            type: input.type,
            link: input.link ?? null,
            recipientRole: input.recipientRole ?? null,
            recipientUserId: input.recipientUserId ?? null,
            recipientHibretId: input.recipientHibretId ?? null,
            createdByUserId: input.createdByUserId ?? null,
        },
    });
}
async function notifyRole(role, title, message, type, link, createdByUserId) {
    return createNotification({
        title,
        message,
        type,
        link,
        recipientRole: role,
        createdByUserId,
    });
}
async function notifyHibret(hibretId, title, message, type, link, createdByUserId) {
    return createNotification({
        title,
        message,
        type,
        link,
        recipientHibretId: hibretId,
        createdByUserId,
    });
}
async function notifyWoredaAdmins(title, message, type, link, createdByUserId) {
    return notifyRole("WOREDA_ADMIN", title, message, type, link, createdByUserId);
}
