import { Router } from "express";
import { prisma } from "../../prisma/client";
import { authMiddleware } from "../../middleware/auth.middleware";
import { requirePrivilege } from "../../middleware/requirePrivilege";
import { notifyRole } from "../notifications/notification.service";

const router = Router();
router.use(authMiddleware);

function visibleWhere(req: any) {
  if (req.user?.role === "WOREDA_ADMIN") return {};
  return {
    status: "published",
    targetRoles: {
      has: req.user?.role,
    },
  };
}


async function getResourceOr404(id: string, res: any) {
  const item = await prisma.resource.findUnique({
    where: { id },
  });

  if (!item) {
    res.status(404).json({ message: "Resource not found." });
    return null;
  }

  return item;
}

function mapResource(resource: any) {
  return {
    id: resource.id,
    title: resource.title,
    description: resource.description,
    status: resource.status,
    category: resource.category,
    fileId: resource.fileId,
    targetRoles: resource.targetRoles,
    file: resource.file,
    publishedAt: resource.publishedAt,
    archivedAt: resource.archivedAt,
    createdAt: resource.createdAt,
    updatedAt: resource.updatedAt,
  };
}

router.get("/", requirePrivilege("resource.read"), async (req, res) => {
  const resources = await prisma.resource.findMany({
    where: visibleWhere(req),
    include: {
      file: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return res.json({
    resources: resources.map(mapResource),
    summary: {
      total: resources.length,
      published: resources.filter((item: any) => item.status === "published").length,
      drafts: resources.filter((item: any) => item.status === "draft").length,
      archived: resources.filter((item: any) => item.status === "archived").length,
    },
  });
});

router.post("/", requirePrivilege("resource.create"), async (req, res) => {
  const title = String(req.body.title || "").trim();
  const description = req.body.description ? String(req.body.description).trim() : null;
  const category = req.body.category ? String(req.body.category).trim() : null;
  const fileId = req.body.fileId ? String(req.body.fileId) : null;
  const targetRoles = Array.isArray(req.body.targetRoles) ? req.body.targetRoles.map(String) : ["HIBRET_ADMIN", "MEMBER"];

  if (!title) {
    return res.status(400).json({ message: "Resource title is required." });
  }

  const resource = await prisma.resource.create({
    data: {
      title,
      description,
      category,
      fileId,
      targetRoles,
      createdByUserId: req.user?.id,
    },
    include: {
      file: true,
    },
  });

  return res.status(201).json({ resource: mapResource(resource) });
});

router.patch("/:resourceId", requirePrivilege("resource.update"), async (req, res) => {
  const title = req.body.title === undefined ? undefined : String(req.body.title || "").trim();
  const description = req.body.description === undefined ? undefined : (req.body.description ? String(req.body.description).trim() : null);
  const category = req.body.category === undefined ? undefined : (req.body.category ? String(req.body.category).trim() : null);
  const fileId = req.body.fileId === undefined ? undefined : (req.body.fileId ? String(req.body.fileId) : null);
  const targetRoles = req.body.targetRoles === undefined ? undefined : Array.isArray(req.body.targetRoles) ? req.body.targetRoles.map(String) : [];

  if (title !== undefined && !title) {
    return res.status(400).json({ message: "Resource title is required." });
  }

  const resource = await prisma.resource.update({
    where: { id: String(req.params.resourceId) },
    data: {
      ...(title !== undefined ? { title } : {}),
      ...(description !== undefined ? { description } : {}),
      ...(category !== undefined ? { category } : {}),
      ...(fileId !== undefined ? { fileId } : {}),
      ...(targetRoles !== undefined ? { targetRoles } : {}),
    },
    include: {
      file: true,
    },
  });

  return res.json({ resource: mapResource(resource) });
});

router.post("/:resourceId/publish", requirePrivilege("resource.publish"), async (req, res) => {
  const existing = await getResourceOr404(String(req.params.resourceId), res);
  if (!existing) return;

  const resource = await prisma.resource.update({
    where: { id: String(req.params.resourceId) },
    data: {
      status: "published",
      publishedAt: new Date(),
      archivedAt: null,
    },
    include: {
      file: true,
    },
  });

  return res.json({ resource: mapResource(resource) });
});

router.post("/:resourceId/archive", requirePrivilege("resource.archive"), async (req, res) => {
  const existing = await getResourceOr404(String(req.params.resourceId), res);
  if (!existing) return;

  const resource = await prisma.resource.update({
    where: { id: String(req.params.resourceId) },
    data: {
      status: "archived",
      archivedAt: new Date(),
    },
    include: {
      file: true,
    },
  });

  return res.json({ resource: mapResource(resource) });
});

router.delete("/:resourceId", requirePrivilege("resource.delete"), async (req, res) => {
  await prisma.resource.delete({
    where: { id: String(req.params.resourceId) },
  });

  return res.json({ message: "Resource deleted." });
});

export default router;
