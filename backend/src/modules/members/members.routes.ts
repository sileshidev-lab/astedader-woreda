import { Router } from "express";
import crypto from "crypto";
import { prisma } from "../../prisma/client";
import { authMiddleware } from "../../middleware/auth.middleware";
import { requirePrivilege } from "../../middleware/requirePrivilege";
import { buildSetupEmail, sendMail } from "../mail/mail.service";
import { env } from "../../config/env";

const router = Router();

async function resolveCurrentMemberId(req: any) {
  const directMemberId = req.user?.memberId;

  if (directMemberId) {
    return String(directMemberId);
  }

  const userId = req.user?.id;
  const userEmail = req.user?.email;

  if (userId) {
    const user = await prisma.user.findUnique({
      where: { id: String(userId) },
      select: {
        memberId: true,
        email: true,
      },
    });

    if (user?.memberId) {
      return user.memberId;
    }

    const emailToMatch = user?.email || userEmail;

    if (emailToMatch) {
      const memberByEmail = await prisma.member.findFirst({
        where: {
          OR: [
            { email: { equals: String(emailToMatch), mode: "insensitive" } },
            { user: { is: { email: { equals: String(emailToMatch), mode: "insensitive" } } } },
          ],
        },
        select: { id: true },
      });

      if (memberByEmail?.id) {
        return memberByEmail.id;
      }
    }
  }

  if (userEmail) {
    const memberByEmail = await prisma.member.findFirst({
      where: {
        OR: [
          { email: { equals: String(userEmail), mode: "insensitive" } },
          { user: { is: { email: { equals: String(userEmail), mode: "insensitive" } } } },
        ],
      },
      select: { id: true },
    });

    if (memberByEmail?.id) {
      return memberByEmail.id;
    }
  }

  return null;
}


router.use(authMiddleware);

function currentHibretScope(req: any) {
  return req.user?.role === "HIBRET_ADMIN" ? String(req.user?.hibretId || "__none__") : null;
}

function applyHibretScope(req: any, where: any, requestedHibretId?: string | null) {
  const scopedHibretId = currentHibretScope(req);

  if (scopedHibretId) {
    where.hibretId = scopedHibretId;
    return;
  }

  if (requestedHibretId) {
    where.hibretId = requestedHibretId;
  }
}

function canAccessMember(req: any, member: any) {
  const scopedHibretId = currentHibretScope(req);
  if (!scopedHibretId) return true;
  return member?.hibretId === scopedHibretId;
}


function cleanString(value: unknown) {
  if (value === undefined || value === null) return null;

  const text = String(value).trim();

  // In bulk imports, users often use "-" as an empty placeholder.
  // Store it as null instead of saving "-" into member profile fields.
  if (
    text === "" ||
    text === "-" ||
    text === "—" ||
    text === "–" ||
    text.toLowerCase() === "n/a" ||
    text.toLowerCase() === "na" ||
    text.toLowerCase() === "null"
  ) {
    return null;
  }

  return text;
}

function cleanInt(value: unknown) {
  if (value === undefined || value === null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function cleanDate(value: unknown) {
  const text = cleanString(value);
  if (!text) return null;
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date;
}

function fullName(member: {
  firstName: string;
  fatherName: string;
  grandfatherName?: string | null;
}) {
  return [member.firstName, member.fatherName, member.grandfatherName]
    .filter(Boolean)
    .join(" ");
}

function setupUrl(token: string) {
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
  return `${frontendUrl}/setup-account?token=${encodeURIComponent(token)}`;
}

async function sendSetupEmailForUser(user: any, member: any) {
  const url = setupUrl(user.setupToken);
  const email = buildSetupEmail({
    memberName: fullName(member),
    setupUrl: url,
  });

  const result = await sendMail({
    to: user.email,
    subject: email.subject,
    text: email.text,
    html: email.html,
  });

  return {
    setupUrl: url,
    previewUrl: env.IS_PRODUCTION ? null : result.previewUrl,
    messageId: result.messageId,
    skipped: result.skipped,
  };
}

function calculateProfileCompletion(data: any) {
  const fields = [
    data.memberCode,
    data.fanId,
    data.ppId,
    data.firstName,
    data.fatherName,
    data.grandfatherName,
    data.gender,
    data.dateOfBirth,
    data.phone,
    data.email,
    data.hibretId,
    data.familyId,
    data.membershipStatus,
    data.registrationType,
    data.membershipYear,
    data.partyRole,
    data.educationLevel,
    data.fieldOfStudy,
    data.workplace,
    data.workType,
    data.workExperienceYears,
    data.zone,
    data.kebele,
    data.photoFileId,
  ];

  const filled = fields.filter((field) => field !== null && field !== undefined && field !== "").length;
  return Math.round((filled / fields.length) * 100);
}

function buildMemberData(body: any, mode: "create" | "update") {
  const data: any = {
    memberCode: cleanString(body.memberCode),
    fanId: cleanString(body.fanId),
    ppId: cleanString(body.ppId),

    firstName: cleanString(body.firstName),
    fatherName: cleanString(body.fatherName),
    grandfatherName: cleanString(body.grandfatherName),
    gender: cleanString(body.gender),

    dateOfBirth: cleanDate(body.dateOfBirth),
    phone: cleanString(body.phone),
    email: cleanString(body.email),

    hibretId: cleanString(body.hibretId),
    familyId: cleanString(body.familyId),

    membershipStatus: cleanString(body.membershipStatus),
    registrationType: cleanString(body.registrationType),
    membershipYear: cleanInt(body.membershipYear),
    partyRole: cleanString(body.partyRole),

    educationLevel: cleanString(body.educationLevel),
    fieldOfStudy: cleanString(body.fieldOfStudy),
    workplace: cleanString(body.workplace),
    workType: cleanString(body.workType),
    workExperienceYears: cleanInt(body.workExperienceYears),

    zone: cleanString(body.zone),
    kebele: cleanString(body.kebele),
    ethnicity: cleanString(body.ethnicity),
    healthStatus: cleanString(body.healthStatus),
    photoFileId: cleanString(body.photoFileId),
  };

  if (mode === "update") {
    for (const key of Object.keys(data)) {
      if (body[key] === undefined) {
        delete data[key];
      }
    }
  }

  data.profileCompletion = calculateProfileCompletion(data);

  return data;
}

function mapMember(member: any) {
  return {
    id: member.id,
    memberCode: member.memberCode,
    fanId: member.fanId,
    ppId: member.ppId,

    firstName: member.firstName,
    fatherName: member.fatherName,
    grandfatherName: member.grandfatherName,
    name: fullName(member),
    gender: member.gender,
    dateOfBirth: member.dateOfBirth,
    phone: member.phone,
    email: member.email,

    hibretId: member.hibretId,
    hibretName: member.hibret?.name ?? null,
    familyId: member.familyId,
    familyName: member.family?.name ?? null,

    membershipStatus: member.membershipStatus,
    registrationType: member.registrationType,
    membershipYear: member.membershipYear,
    partyRole: member.partyRole,

    educationLevel: member.educationLevel,
    fieldOfStudy: member.fieldOfStudy,
    workplace: member.workplace,
    workType: member.workType,
    workExperienceYears: member.workExperienceYears,

    zone: member.zone,
    kebele: member.kebele,
    ethnicity: member.ethnicity,
    healthStatus: member.healthStatus,

    photoFileId: member.photoFileId,
    profileCompletion: member.profileCompletion,

    account: member.user
      ? {
          email: member.user.email,
          role: member.user.role,
          status: member.user.status,
          lastLoginAt: member.user.lastLoginAt,
          createdAt: member.user.createdAt,
        }
      : null,

    createdAt: member.createdAt,
    updatedAt: member.updatedAt,
  };
}

async function getMemberWithRelations(memberId: string) {
  return prisma.member.findUnique({
    where: { id: memberId },
    include: {
      hibret: true,
      family: true,
      user: true,
      attendanceRecords: {
        include: {
          announcement: true,
        },
        orderBy: {
          updatedAt: "desc",
        },
        take: 12,
      },
    },
  });
}


type ParsedCsvRow = Record<string, string>;

const importHeaderAliases: Record<string, string> = {
  membercode: "memberCode",
  member_code: "memberCode",
  code: "memberCode",
  fanid: "fanId",
  fan_id: "fanId",
  ppid: "ppId",
  pp_id: "ppId",
  firstname: "firstName",
  first_name: "firstName",
  fathername: "fatherName",
  father_name: "fatherName",
  grandfathername: "grandfatherName",
  grandfather_name: "grandfatherName",
  gender: "gender",
  dateofbirth: "dateOfBirth",
  date_of_birth: "dateOfBirth",
  phone: "phone",
  email: "email",
  hibretid: "hibretId",
  hibret_id: "hibretId",
  hibretname: "hibretName",
  hibret_name: "hibretName",
  familyid: "familyId",
  family_id: "familyId",
  familyname: "familyName",
  family_name: "familyName",
  membershipstatus: "membershipStatus",
  membership_status: "membershipStatus",
  registrationtype: "registrationType",
  registration_type: "registrationType",
  membershipyear: "membershipYear",
  membership_year: "membershipYear",
  partyrole: "partyRole",
  party_role: "partyRole",
  educationlevel: "educationLevel",
  education_level: "educationLevel",
  fieldofstudy: "fieldOfStudy",
  field_of_study: "fieldOfStudy",
  workplace: "workplace",
  worktype: "workType",
  work_type: "workType",
  workexperienceyears: "workExperienceYears",
  work_experience_years: "workExperienceYears",
  zone: "zone",
  kebele: "kebele",
  ethnicity: "ethnicity",
  healthstatus: "healthStatus",
  health_status: "healthStatus",
};

function normalizeImportHeader(value: string) {
  const key = value.trim().replace(/[\s-]+/g, "_").replace(/[^a-zA-Z0-9_]/g, "").toLowerCase();
  return importHeaderAliases[key] || key;
}

function parseCsvLine(line: string) {
  const result: string[] = [];
  let current = "";
  let insideQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === '"' && insideQuotes && next === '"') {
      current += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      insideQuotes = !insideQuotes;
      continue;
    }

    if (char === "," && !insideQuotes) {
      result.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  result.push(current.trim());
  return result;
}

function parseCsv(csvText: string) {
  const lines = csvText
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0);

  if (lines.length === 0) return [];

  const headers = parseCsvLine(lines[0]).map(normalizeImportHeader);

  return lines.slice(1).map((line, index) => {
    const values = parseCsvLine(line);
    const row: ParsedCsvRow = {};

    headers.forEach((header, headerIndex) => {
      row[header] = values[headerIndex]?.trim() ?? "";
    });

    return {
      rowNumber: index + 2,
      row,
    };
  });
}

function lower(value?: string | null) {
  return String(value || "").trim().toLowerCase();
}

function normalizeAmharicName(value?: string | null) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[፣።፤፥፦፧፨.,;:()\[\]{}'"`“”‘’_\-\/\\|]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^የ\s*/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function nameTokens(value?: string | null) {
  return normalizeAmharicName(value)
    .split(" ")
    .map((part) => part.trim())
    .filter(Boolean);
}

function compactName(value?: string | null) {
  return normalizeAmharicName(value).replace(/\s+/g, "");
}

function diceCoefficient(a?: string | null, b?: string | null) {
  const first = compactName(a);
  const second = compactName(b);

  if (!first || !second) return 0;
  if (first === second) return 100;
  if (first.includes(second) || second.includes(first)) return 96;

  function bigrams(value: string) {
    const pairs: string[] = [];
    for (let index = 0; index < value.length - 1; index += 1) {
      pairs.push(value.slice(index, index + 2));
    }
    return pairs;
  }

  const firstPairs = bigrams(first);
  const secondPairs = bigrams(second);

  if (!firstPairs.length || !secondPairs.length) return 0;

  const secondCounts = new Map<string, number>();
  for (const pair of secondPairs) {
    secondCounts.set(pair, (secondCounts.get(pair) || 0) + 1);
  }

  let shared = 0;

  for (const pair of firstPairs) {
    const count = secondCounts.get(pair) || 0;
    if (count > 0) {
      shared += 1;
      secondCounts.set(pair, count - 1);
    }
  }

  return Math.round((2 * shared * 100) / (firstPairs.length + secondPairs.length));
}

function levenshteinSimilarity(a?: string | null, b?: string | null) {
  const first = compactName(a);
  const second = compactName(b);

  if (!first || !second) return 0;
  if (first === second) return 100;

  const rows = first.length + 1;
  const columns = second.length + 1;
  const matrix: number[][] = Array.from({ length: rows }, () => Array(columns).fill(0));

  for (let i = 0; i < rows; i += 1) matrix[i][0] = i;
  for (let j = 0; j < columns; j += 1) matrix[0][j] = j;

  for (let i = 1; i < rows; i += 1) {
    for (let j = 1; j < columns; j += 1) {
      const cost = first[i - 1] === second[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  const distance = matrix[first.length][second.length];
  const maxLength = Math.max(first.length, second.length);

  return Math.round(((maxLength - distance) / maxLength) * 100);
}

function tokenScore(inputName?: string | null, systemName?: string | null) {
  const input = normalizeAmharicName(inputName);
  const system = normalizeAmharicName(systemName);

  if (!input || !system) return 0;
  if (input === system) return 100;

  const compactInput = compactName(input);
  const compactSystem = compactName(system);

  if (compactInput === compactSystem) return 100;
  if (compactInput.includes(compactSystem) || compactSystem.includes(compactInput)) return 96;

  const inputTokens = new Set(nameTokens(input));
  const systemTokens = new Set(nameTokens(system));

  let tokenCoverageScore = 0;

  if (inputTokens.size > 0 && systemTokens.size > 0) {
    let shared = 0;

    for (const token of inputTokens) {
      if (systemTokens.has(token)) {
        shared += 1;
        continue;
      }

      // Also count token match when one token is joined/split across the other name.
      const compactToken = compactName(token);
      if (compactSystem.includes(compactToken)) {
        shared += 1;
      }
    }

    tokenCoverageScore = Math.round(
      (shared / Math.max(inputTokens.size, systemTokens.size)) * 100
    );
  }

  const diceScore = diceCoefficient(input, system);
  const levenshteinScore = levenshteinSimilarity(input, system);

  return Math.max(tokenCoverageScore, diceScore, levenshteinScore);
}

function findBestHibretByName(hibrets: any[], importedName?: string | null) {
  const cleanName = cleanString(importedName);
  if (!cleanName) return null;

  const exact = hibrets.find(
    (hibret) => normalizeAmharicName(hibret.name) === normalizeAmharicName(cleanName)
  );

  if (exact) return exact;

  const scored = hibrets
    .map((hibret) => ({
      hibret,
      score: tokenScore(cleanName, hibret.name),
    }))
    .sort((a, b) => b.score - a.score);

  const best = scored[0];

  return best && best.score >= 62 ? best.hibret : null;
}

function findBestFamilyByName(families: any[], hibretId: string, importedName?: string | null) {
  const cleanName = cleanString(importedName);
  if (!cleanName) return null;

  const candidates = families.filter((family) => family.hibretId === hibretId);

  const exact = candidates.find(
    (family) => normalizeAmharicName(family.name) === normalizeAmharicName(cleanName)
  );

  if (exact) return exact;

  const scored = candidates
    .map((family) => ({
      family,
      score: tokenScore(cleanName, family.name),
    }))
    .sort((a, b) => b.score - a.score);

  const best = scored[0];

  return best && best.score >= 80 ? best.family : null;
}

async function validateImportRows(rawRows: Array<{ rowNumber: number; row: ParsedCsvRow }>) {
  const [hibrets, families, existingMembers] = await Promise.all([
    prisma.hibret.findMany(),
    prisma.family.findMany(),
    prisma.member.findMany({
      select: {
        memberCode: true,
        fanId: true,
        ppId: true,
        email: true,
      },
    }),
  ]);

  const hibretById = new Map(hibrets.map((hibret) => [hibret.id, hibret]));

  const familyById = new Map(families.map((family) => [family.id, family]));

  const existingMemberCodes = new Set(existingMembers.map((member) => lower(member.memberCode)).filter(Boolean));
  const existingFanIds = new Set(existingMembers.map((member) => lower(member.fanId)).filter(Boolean));
  const existingPpIds = new Set(existingMembers.map((member) => lower(member.ppId)).filter(Boolean));
  const existingEmails = new Set(existingMembers.map((member) => lower(member.email)).filter(Boolean));

  const batchMemberCodes = new Set<string>();
  const batchFanIds = new Set<string>();
  const batchPpIds = new Set<string>();
  const batchEmails = new Set<string>();

  return rawRows.map(({ rowNumber, row }) => {
    const errors: string[] = [];

    const importedHibretName = cleanString(row.hibretName);

    const hibret = importedHibretName
      ? findBestHibretByName(hibrets, importedHibretName)
      : cleanString(row.hibretId) && hibretById.has(String(cleanString(row.hibretId)))
        ? hibretById.get(String(cleanString(row.hibretId)))
        : null;

    if (!cleanString(row.firstName)) errors.push("First name is required.");
    if (!cleanString(row.fatherName)) errors.push("Father name is required.");
    if (!cleanString(row.gender)) errors.push("Gender is required.");
    if (!hibret) errors.push("Valid Hibret name is required.");

    let family = null as any;

    if (hibret && cleanString(row.familyId)) {
      family = familyById.get(String(cleanString(row.familyId)));
      if (!family || family.hibretId !== hibret.id) {
        errors.push("Selected family does not belong to the selected Hibret.");
      }
    }

    if (hibret && cleanString(row.familyName)) {
      family = findBestFamilyByName(families, hibret.id, row.familyName);
      if (!family) {
        errors.push("Family name was not found under the selected Hibret.");
      }
    }

    const memberCode = lower(row.memberCode);
    const fanId = lower(row.fanId);
    const ppId = lower(row.ppId);
    const email = lower(row.email);

    if (memberCode && existingMemberCodes.has(memberCode)) errors.push("Member code already exists.");
    if (fanId && existingFanIds.has(fanId)) errors.push("FAN ID already exists.");
    if (ppId && existingPpIds.has(ppId)) errors.push("PP ID already exists.");
    if (email && existingEmails.has(email)) errors.push("Email already exists on another member.");

    if (memberCode && batchMemberCodes.has(memberCode)) errors.push("Duplicate member code in import file.");
    if (fanId && batchFanIds.has(fanId)) errors.push("Duplicate FAN ID in import file.");
    if (ppId && batchPpIds.has(ppId)) errors.push("Duplicate PP ID in import file.");
    if (email && batchEmails.has(email)) errors.push("Duplicate email in import file.");

    if (memberCode) batchMemberCodes.add(memberCode);
    if (fanId) batchFanIds.add(fanId);
    if (ppId) batchPpIds.add(ppId);
    if (email) batchEmails.add(email);

    const normalized = {
      memberCode: cleanString(row.memberCode),
      fanId: cleanString(row.fanId),
      ppId: cleanString(row.ppId),
      firstName: cleanString(row.firstName),
      fatherName: cleanString(row.fatherName),
      grandfatherName: cleanString(row.grandfatherName),
      gender: cleanString(row.gender)?.toLowerCase(),
      dateOfBirth: cleanString(row.dateOfBirth),
      phone: cleanString(row.phone),
      email: cleanString(row.email),
      hibretId: hibret?.id || null,
      hibretName: hibret?.name || cleanString(row.hibretName),
      familyId: family?.id || null,
      familyName: family?.name || cleanString(row.familyName),
      membershipStatus: cleanString(row.membershipStatus) || "active",
      registrationType: cleanString(row.registrationType),
      membershipYear: cleanInt(row.membershipYear),
      partyRole: cleanString(row.partyRole),
      educationLevel: cleanString(row.educationLevel),
      fieldOfStudy: cleanString(row.fieldOfStudy),
      workplace: cleanString(row.workplace),
      workType: cleanString(row.workType),
      workExperienceYears: cleanInt(row.workExperienceYears),
      zone: cleanString(row.zone),
      kebele: cleanString(row.kebele),
      ethnicity: cleanString(row.ethnicity),
      healthStatus: cleanString(row.healthStatus),
    };

    return {
      rowNumber,
      raw: row,
      normalized,
      isValid: errors.length === 0,
      errors,
    };
  });
}

router.post("/import/preview", requirePrivilege("member.create"), async (req, res) => {
  const csvText = String(req.body.csvText || "");

  if (!csvText.trim()) {
    return res.status(400).json({ message: "CSV content is required." });
  }

  const parsedRows = parseCsv(csvText);

  if (parsedRows.length === 0) {
    return res.status(400).json({ message: "CSV has no member rows." });
  }

  const rows = await validateImportRows(parsedRows);

  return res.json({
    rows,
    summary: {
      total: rows.length,
      valid: rows.filter((row) => row.isValid).length,
      invalid: rows.filter((row) => !row.isValid).length,
    },
  });
});

router.post("/import/commit", requirePrivilege("member.create"), async (req, res) => {
  const rows = Array.isArray(req.body.rows) ? req.body.rows : [];
  const validRows = rows.filter((row: any) => row?.isValid && row?.normalized);

  if (validRows.length === 0) {
    return res.status(400).json({ message: "There are no valid rows to import." });
  }

  const revalidatedRows = await validateImportRows(
    validRows.map((row: any) => ({
      rowNumber: Number(row.rowNumber),
      row: {
        ...row.normalized,
        hibretName: row.normalized.hibretName,
        familyName: row.normalized.familyName,
      },
    }))
  );

  const stillValid = revalidatedRows.filter((row) => row.isValid);

  if (stillValid.length === 0) {
    return res.status(400).json({
      message: "Rows are no longer valid. Preview again before importing.",
      rows: revalidatedRows,
    });
  }

  const created: any[] = [];
  const failed: any[] = [];

  for (const row of stillValid) {
    try {
      const data = buildMemberData(row.normalized, "create");

      const member = await prisma.member.create({
        data: {
          ...data,
          hibretId: row.normalized.hibretId,
          familyId: row.normalized.familyId,
          membershipStatus: row.normalized.membershipStatus || "active",
        },
        include: {
          hibret: true,
          family: true,
          user: true,
        },
      });

      created.push({
        rowNumber: row.rowNumber,
        member: mapMember(member),
      });
    } catch (error: any) {
      failed.push({
        rowNumber: row.rowNumber,
        message: error?.message || "Unable to create member.",
      });
    }
  }

  return res.json({
    message: "Member import completed.",
    createdCount: created.length,
    failedCount: failed.length,
    created,
    failed,
  });
});




router.patch("/me/profile", requirePrivilege("profile.update"), async (req, res) => {
  const memberId = await resolveCurrentMemberId(req);

  if (!memberId) {
    return res.status(404).json({ message: "No member profile is linked to this account." });
  }

  const existingMember = await prisma.member.findUnique({
    where: { id: String(memberId) },
  });

  if (!existingMember) {
    return res.status(404).json({ message: "Member profile not found." });
  }

  const body = req.body as Record<string, unknown>;

  const cleanText = (value: unknown) => {
    if (value === undefined) return undefined;
    if (value === null) return null;
    const text = String(value).trim();
    if (!text || text === "-") return null;
    return text;
  };

  const cleanNumber = (value: unknown) => {
    if (value === undefined || value === null || value === "") return undefined;
    const numberValue = Number(value);
    return Number.isFinite(numberValue) ? numberValue : undefined;
  };

  const cleanDate = (value: unknown) => {
    const text = cleanText(value);
    if (!text) return null;
    const date = new Date(String(text));
    return Number.isNaN(date.getTime()) ? null : date;
  };

  const updateData: any = {};

  const editableTextFields = [
    "firstName",
    "fatherName",
    "grandfatherName",
    "gender",
    "phone",
    "email",
    "registrationType",
    "membershipYear",
    "partyRole",
    "educationLevel",
    "fieldOfStudy",
    "workplace",
    "workType",
    "zone",
    "kebele",
    "ethnicity",
    "healthStatus",
    "photoFileId",
  ];

  for (const field of editableTextFields) {
    if (Object.prototype.hasOwnProperty.call(body, field)) {
      updateData[field] = cleanText(body[field]);
    }
  }

  if (Object.prototype.hasOwnProperty.call(body, "dateOfBirth")) {
    updateData.dateOfBirth = cleanDate(body.dateOfBirth);
  }

  if (Object.prototype.hasOwnProperty.call(body, "workExperienceYears")) {
    updateData.workExperienceYears = cleanNumber(body.workExperienceYears) ?? null;
  }

  const profileCheck = {
    ...existingMember,
    ...updateData,
  };

  const completionFields = [
    "firstName",
    "fatherName",
    "grandfatherName",
    "gender",
    "dateOfBirth",
    "phone",
    "email",
    "hibretId",
    "familyId",
    "membershipStatus",
    "registrationType",
    "membershipYear",
    "partyRole",
    "educationLevel",
    "fieldOfStudy",
    "workplace",
    "workType",
    "workExperienceYears",
    "zone",
    "kebele",
    "ethnicity",
    "healthStatus",
    "photoFileId",
  ];

  const filledFields = completionFields.filter((field) => {
    const value = (profileCheck as any)[field];
    return value !== null && value !== undefined && String(value).trim() !== "" && String(value).trim() !== "-";
  }).length;

  updateData.profileCompletion = Math.round((filledFields / completionFields.length) * 100);

  const updatedMember = await prisma.member.update({
    where: { id: String(memberId) },
    data: updateData,
  });

  const member = await getMemberWithRelations(updatedMember.id);

  if (!member) {
    return res.status(404).json({ message: "Member profile not found after update." });
  }

  return res.json({
    member: {
      ...mapMember(member),
      attendance: member.attendanceRecords.map((record) => ({
        id: record.id,
        announcementTitle: record.announcement.title,
        announcementType: record.announcement.type,
        status: record.status,
        note: record.note,
        recordedAt: record.updatedAt,
      })),
    },
  });
});

router.get("/me/profile", requirePrivilege("profile.read"), async (req, res) => {
  const memberId = await resolveCurrentMemberId(req);

  if (!memberId) {
    return res.status(404).json({ message: "No member profile is linked to this account." });
  }

  const member = await getMemberWithRelations(String(memberId));

  if (!member) {
    return res.status(404).json({ message: "Member profile not found." });
  }

  return res.json({
    member: {
      ...mapMember(member),
      attendance: member.attendanceRecords.map((record) => ({
        id: record.id,
        announcementTitle: record.announcement.title,
        announcementType: record.announcement.type,
        status: record.status,
        note: record.note,
        recordedAt: record.updatedAt,
      })),
    },
  });
});

router.get("/filter-counts", requirePrivilege("member.read"), async (req: any, res) => {
  const search = cleanString(req.query.search);
  const hibretId = cleanString(req.query.hibretId);

  // Build base where clause with search and scope
  const scopedWhere: any = {};
  applyHibretScope(req, scopedWhere, hibretId);

  // Add search conditions if provided
  if (search) {
    // Use same search logic as main endpoint for consistency
    scopedWhere.OR = [
      { firstName: { contains: search, mode: "insensitive" } },
      { fatherName: { contains: search, mode: "insensitive" } },
      { grandfatherName: { contains: search, mode: "insensitive" } },
      { memberCode: { contains: search, mode: "insensitive" } },
      { fanId: { contains: search, mode: "insensitive" } },
      { ppId: { contains: search, mode: "insensitive" } },
      { phone: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      { hibret: { name: { contains: search, mode: "insensitive" } } },
      { family: { name: { contains: search, mode: "insensitive" } } },
    ];
  }

  // Get total count
  const totalCount = await prisma.member.count({ where: scopedWhere });

  // Function to count distinct values for a field
  async function countField(field: string) {
    const results = await prisma.member.groupBy({
      by: [field as any],
      where: scopedWhere,
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
    });

    const counts: Record<string, number> = {};
    results.forEach((result: any) => {
      const value = result[field];
      if (value != null && String(value).trim() !== "") {
        counts[String(value)] = result._count.id;
      }
    });
    return counts;
  }

  // Function to count FAN status
  async function countFanStatus() {
    const [registered, notRegistered] = await Promise.all([
      prisma.member.count({
        where: { ...scopedWhere, fanId: { not: null } },
      }),
      prisma.member.count({
        where: { ...scopedWhere, fanId: null },
      }),
    ]);

    return {
      registered,
      "not-registered": notRegistered,
    };
  }

  // Members always have hibretId (required in schema); group for facet counts without null checks.
  async function countHibrets() {
    const results = await prisma.member.groupBy({
      by: ["hibretId"],
      where: scopedWhere,
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
    });

    const counts: Record<string, number> = {};
    results.forEach((result: any) => {
      if (result.hibretId) {
        counts[result.hibretId] = result._count.id;
      }
    });
    return counts;
  }

  try {
    // Run all count queries in parallel
    const [
      genderCounts,
      workTypeCounts,
      educationLevelCounts,
      healthStatusCounts,
      membershipStatusCounts,
      registrationTypeCounts,
      fanStatusCounts,
      hibretCounts,
    ] = await Promise.all([
      countField("gender"),
      countField("workType"),
      countField("educationLevel"),
      countField("healthStatus"),
      countField("membershipStatus"),
      countField("registrationType"),
      countFanStatus(),
      countHibrets(),
    ]);

    return res.json({
      total: totalCount,
      gender: genderCounts,
      workType: workTypeCounts,
      educationLevel: educationLevelCounts,
      healthStatus: healthStatusCounts,
      membershipStatus: membershipStatusCounts,
      registrationType: registrationTypeCounts,
      fanStatus: fanStatusCounts,
      hibret: hibretCounts,
    });
  } catch (error) {
    console.error("Error getting filter counts:", error);
    return res.status(500).json({ message: "Failed to get filter counts" });
  }
});

router.get("/filter-options", requirePrivilege("member.read"), async (req: any, res) => {
  const scopedWhere: any = {};
  const hibretId = cleanString(req.query.hibretId);
  applyHibretScope(req, scopedWhere, hibretId);

  const members = await prisma.member.findMany({
    where: scopedWhere,
    include: { hibret: true, family: true },
  });

  function countBy(field: string) {
    const map = new Map<string, number>();
    for (const member of members as any[]) {
      const value = String(member[field] || "").trim();
      if (!value) continue;
      map.set(value, (map.get(value) || 0) + 1);
    }
    return Array.from(map.entries())
      .map(([value, count]) => ({ value, label: value, count }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }

  const faydaRegistered = members.filter((m) => Boolean(m.fanId)).length;
  const withPp = members.filter((m) => Boolean(m.ppId)).length;
  const withoutPp = members.length - withPp;

  return res.json({
    options: {
      total: members.length,
      gender: countBy("gender"),
      faydaStatus: [
        { value: "registered", label: "Fayda Registered", count: faydaRegistered },
        { value: "not_registered", label: "Fayda Not Registered", count: members.length - faydaRegistered },
      ],
      ppStatus: [
        { value: "printed", label: "ታትሟል", count: withPp },
        { value: "not_printed", label: "አልታተመም", count: withoutPp },
      ],
      workType: countBy("workType"),
      educationLevel: countBy("educationLevel"),
      healthStatus: countBy("healthStatus"),
      registrationType: countBy("registrationType"),
      membershipStatus: countBy("membershipStatus"),
      hibrets: Array.from(new Map(members.map((m) => [m.hibretId, m.hibret])).values())
        .filter(Boolean)
        .map((hibret: any) => ({
          value: hibret.id,
          label: hibret.name,
          count: members.filter((member) => member.hibretId === hibret.id).length,
        })),
      families: Array.from(new Map(members.filter((m) => m.family).map((m) => [m.familyId, m.family])).values())
        .filter(Boolean)
        .map((family: any) => ({
          value: family.id,
          label: family.name,
          hibretId: family.hibretId,
          count: members.filter((member) => member.familyId === family.id).length,
        })),
    },
  });
});


router.get("/form-options", requirePrivilege("member.read"), async (_req, res) => {
  const [hibrets, families] = await Promise.all([
    prisma.hibret.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        status: true,
      },
    }),
    prisma.family.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        hibretId: true,
        status: true,
      },
    }),
  ]);

  return res.json({
    options: {
      hibrets,
      families,
    },
  });
});

router.get("/", requirePrivilege("member.read"), async (req, res) => {
  const page = Math.max(1, Number(req.query.page || 1));
  const rawPageSize = Number(req.query.pageSize || 25);
  const pageSize = Math.min(5000, Math.max(10, Number.isFinite(rawPageSize) ? rawPageSize : 25));
  const skip = (page - 1) * pageSize;

  const search = cleanString(req.query.search);
  const hibretId = cleanString(req.query.hibretId);
  const familyId = cleanString(req.query.familyId);
  const gender = cleanString(req.query.gender);
  const fanStatus = cleanString(req.query.fanStatus);
  const accountStatus = cleanString(req.query.accountStatus);
  const partyRole = cleanString(req.query.partyRole);
  const educationLevel = cleanString(req.query.educationLevel);
  const fieldOfStudy = cleanString(req.query.fieldOfStudy);
  const workplace = cleanString(req.query.workplace);
  const workType = cleanString(req.query.workType);
  const zone = cleanString(req.query.zone);
  const kebele = cleanString(req.query.kebele);
  const ethnicity = cleanString(req.query.ethnicity);
  const healthStatus = cleanString(req.query.healthStatus);
  const registrationType = cleanString(req.query.registrationType);
  const membershipStatus = cleanString(req.query.membershipStatus);
  const faydaStatus = cleanString(req.query.faydaStatus);
  const ppStatus = cleanString(req.query.ppStatus);

  const where: any = {};

  applyHibretScope(req, where, hibretId);
  if (familyId) where.familyId = familyId;
  if (gender) where.gender = { equals: gender, mode: "insensitive" };
  if (partyRole) where.partyRole = { contains: partyRole, mode: "insensitive" };
  if (educationLevel) where.educationLevel = { contains: educationLevel, mode: "insensitive" };
  if (fieldOfStudy) where.fieldOfStudy = { contains: fieldOfStudy, mode: "insensitive" };
  if (workplace) where.workplace = { contains: workplace, mode: "insensitive" };
  if (workType) where.workType = { contains: workType, mode: "insensitive" };
  if (zone) where.zone = { contains: zone, mode: "insensitive" };
  if (kebele) where.kebele = { contains: kebele, mode: "insensitive" };
  if (ethnicity) where.ethnicity = { contains: ethnicity, mode: "insensitive" };
  if (healthStatus) where.healthStatus = { contains: healthStatus, mode: "insensitive" };
  if (registrationType) where.registrationType = { contains: registrationType, mode: "insensitive" };
  if (membershipStatus) where.membershipStatus = { contains: membershipStatus, mode: "insensitive" };
  if (faydaStatus === "registered" || fanStatus === "registered") where.fanId = { not: null };
  if (faydaStatus === "not_registered" || fanStatus === "not-registered") where.fanId = null;
  if (ppStatus === "printed") where.ppId = { not: null };
  if (ppStatus === "not_printed") where.ppId = null;

  if (accountStatus === "without_account") {
    where.user = { is: null };
  }

  if (accountStatus === "with_account") {
    where.user = { isNot: null };
  }

  if (accountStatus === "pending_setup") {
    where.user = { is: { status: "PENDING_SETUP" } };
  }

  if (accountStatus === "active") {
    where.user = { is: { status: "ACTIVE" } };
  }

  if (accountStatus === "disabled") {
    where.user = { is: { status: "DISABLED" } };
  }

  if (search) {
    where.OR = [
      { firstName: { contains: search, mode: "insensitive" } },
      { fatherName: { contains: search, mode: "insensitive" } },
      { grandfatherName: { contains: search, mode: "insensitive" } },
      { memberCode: { contains: search, mode: "insensitive" } },
      { fanId: { contains: search, mode: "insensitive" } },
      { ppId: { contains: search, mode: "insensitive" } },
      { phone: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      { membershipStatus: { contains: search, mode: "insensitive" } },
      { registrationType: { contains: search, mode: "insensitive" } },
      { partyRole: { contains: search, mode: "insensitive" } },
      { educationLevel: { contains: search, mode: "insensitive" } },
      { fieldOfStudy: { contains: search, mode: "insensitive" } },
      { workplace: { contains: search, mode: "insensitive" } },
      { workType: { contains: search, mode: "insensitive" } },
      { zone: { contains: search, mode: "insensitive" } },
      { kebele: { contains: search, mode: "insensitive" } },
      { ethnicity: { contains: search, mode: "insensitive" } },
      { healthStatus: { contains: search, mode: "insensitive" } },
      { hibret: { name: { contains: search, mode: "insensitive" } } },
      { family: { name: { contains: search, mode: "insensitive" } } },
      { user: { is: { email: { contains: search, mode: "insensitive" } } } },
    ];
  }

  const [members, total, summaryTotals] = await Promise.all([
    prisma.member.findMany({
      where,
      include: {
        hibret: true,
        family: true,
        user: true,
      },
      orderBy: [{ firstName: "asc" }, { fatherName: "asc" }, { grandfatherName: "asc" }],
      skip,
      take: pageSize,
    }),
    prisma.member.count({ where }),
    prisma.member.findMany({
      where,
      select: {
        membershipStatus: true,
        user: {
          select: {
            id: true,
          },
        },
      },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const summary = {
    total: summaryTotals.length,
    active: summaryTotals.filter((member) => member.membershipStatus === "active").length,
    withAccount: summaryTotals.filter((member) => Boolean(member.user)).length,
    withoutAccount: summaryTotals.filter((member) => !member.user).length,
  };

  return res.json({
    summary,
    pagination: {
      total,
      page,
      pageSize,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    },
    members: members.map(mapMember),
  });
});

router.post("/", requirePrivilege("member.create"), async (req, res) => {
  const data = buildMemberData(req.body, "create");

  if (!data.firstName || !data.fatherName || !data.gender || !data.hibretId) {
    return res.status(400).json({
      message: "First name, father name, gender, and Hibret are required.",
    });
  }

  if (data.familyId) {
    const family = await prisma.family.findUnique({
      where: { id: data.familyId },
    });

    if (!family || family.hibretId !== data.hibretId) {
      return res.status(400).json({
        message: "Selected family does not belong to the selected Hibret.",
      });
    }
  }

  const member = await prisma.member.create({
    data: {
      ...data,
      membershipStatus: data.membershipStatus ?? "active",
    },
    include: {
      hibret: true,
      family: true,
      user: true,
    },
  });

  return res.status(201).json({ member: mapMember(member) });
});


router.post("/:memberId/account", requirePrivilege("member_account.create"), async (req, res) => {
  const memberId = String(req.params.memberId);

  const member = await prisma.member.findUnique({
    where: { id: memberId },
    include: {
      user: true,
      hibret: true,
    },
  });

  if (!member || !canAccessMember(req, member)) {
    return res.status(404).json({ message: "Member not found" });
  }

  if (!member.email) {
    return res.status(400).json({ message: "Member email is required before creating an account." });
  }

  if (member.user) {
    return res.status(409).json({ message: "This member already has an account." });
  }

  const setupToken = crypto.randomBytes(32).toString("hex");

  const user = await prisma.user.create({
    data: {
      email: member.email.toLowerCase(),
      role: "MEMBER",
      status: "PENDING_SETUP",
      privileges: ["profile.read", "profile.update", "resource.read"],
      memberId: member.id,
      hibretId: member.hibretId,
      setupToken,
    },
  });

  const emailResult = await sendSetupEmailForUser(user, member);

  return res.status(201).json({
    message: "Member account created.",
    account: {
      email: user.email,
      role: user.role,
      status: user.status,
      setupUrl: emailResult.setupUrl,
      previewUrl: env.IS_PRODUCTION ? null : emailResult.previewUrl,
    },
  });
});

router.post("/:memberId/account/resend-setup", requirePrivilege("member_account.update"), async (req, res) => {
  const memberId = String(req.params.memberId);

  const member = await prisma.member.findUnique({
    where: { id: memberId },
    include: {
      user: true,
    },
  });

  if (!member) {
    return res.status(404).json({ message: "Member not found" });
  }

  if (!member.user) {
    return res.status(404).json({ message: "This member does not have an account yet." });
  }

  if (!member.email) {
    return res.status(400).json({ message: "Member email is required before sending setup email." });
  }

  const setupToken = crypto.randomBytes(32).toString("hex");

  const user = await prisma.user.update({
    where: { id: member.user.id },
    data: {
      setupToken,
      status: "PENDING_SETUP",
      passwordHash: null,
    },
  });

  const emailResult = await sendSetupEmailForUser(user, member);

  return res.json({
    message: "Setup email sent.",
    account: {
      email: user.email,
      role: user.role,
      status: user.status,
      setupUrl: emailResult.setupUrl,
      previewUrl: env.IS_PRODUCTION ? null : emailResult.previewUrl,
    },
  });
});

router.patch("/:memberId/account/status", requirePrivilege("member_account.update"), async (req, res) => {
  const memberId = String(req.params.memberId);
  const status = String(req.body.status || "");

  if (!["ACTIVE", "DISABLED", "PENDING_SETUP"].includes(status)) {
    return res.status(400).json({ message: "Invalid account status." });
  }

  const member = await prisma.member.findUnique({
    where: { id: memberId },
    include: {
      user: true,
    },
  });

  if (!member) {
    return res.status(404).json({ message: "Member not found" });
  }

  if (!member.user) {
    return res.status(404).json({ message: "This member does not have an account yet." });
  }

  const user = await prisma.user.update({
    where: { id: member.user.id },
    data: { status: status as any },
  });

  return res.json({
    message: "Account status updated.",
    account: {
      email: user.email,
      role: user.role,
      status: user.status,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
    },
  });
});

router.post("/accounts/bulk-create", requirePrivilege("member_account.create"), async (req, res) => {
  const memberIds = Array.isArray(req.body.memberIds) ? req.body.memberIds.map(String) : [];

  if (memberIds.length === 0) {
    return res.status(400).json({ message: "Select at least one member." });
  }

  const bulkWhere: any = {
    id: {
      in: memberIds,
    },
  };

  applyHibretScope(req, bulkWhere, null);

  const members = await prisma.member.findMany({
    where: bulkWhere,
    include: {
      user: true,
    },
  });

  const results: any[] = [];

  for (const member of members) {
    if (member.user) {
      results.push({
        memberId: member.id,
        name: fullName(member),
        status: "skipped",
        message: "Account already exists.",
      });
      continue;
    }

    if (!member.email) {
      results.push({
        memberId: member.id,
        name: fullName(member),
        status: "skipped",
        message: "Missing email.",
      });
      continue;
    }

    const setupToken = crypto.randomBytes(32).toString("hex");

    const user = await prisma.user.create({
      data: {
        email: member.email.toLowerCase(),
        role: "MEMBER",
        status: "PENDING_SETUP",
        privileges: ["profile.read", "profile.update", "resource.read"],
        memberId: member.id,
        hibretId: member.hibretId,
        setupToken,
      },
    });

    const emailResult = await sendSetupEmailForUser(user, member);

    results.push({
      memberId: member.id,
      name: fullName(member),
      email: user.email,
      status: "created",
      setupUrl: emailResult.setupUrl,
      previewUrl: env.IS_PRODUCTION ? null : emailResult.previewUrl,
    });
  }

  return res.json({
    message: "Bulk account creation completed.",
    results,
    created: results.filter((item) => item.status === "created").length,
    skipped: results.filter((item) => item.status === "skipped").length,
  });
});

// GET /members/analytics - Get analytics data for members
router.get("/analytics", requirePrivilege("member.read"), async (req, res) => {
  const user = req.user!;
  const search = cleanString(req.query.search);
  const hibretId = cleanString(req.query.hibretId);
  const gender = cleanString(req.query.gender);
  const workType = cleanString(req.query.workType);
  const educationLevel = cleanString(req.query.educationLevel);
  const membershipStatus = cleanString(req.query.membershipStatus);
  const registrationType = cleanString(req.query.registrationType);
  const healthStatus = cleanString(req.query.healthStatus);
  const ethnicity = cleanString(req.query.ethnicity);
  const zone = cleanString(req.query.zone);
  const kebele = cleanString(req.query.kebele);
  const fanStatus = cleanString(req.query.fanStatus);
  
  // Date and age filters
  const registrationFrom = cleanString(req.query.registrationFrom);
  const registrationTo = cleanString(req.query.registrationTo);
  const birthYearFrom = cleanString(req.query.birthYearFrom);
  const birthYearTo = cleanString(req.query.birthYearTo);
  const ageFrom = cleanString(req.query.ageFrom);
  const ageTo = cleanString(req.query.ageTo);

  try {
    // Build base where clause similar to other endpoints
    const scopedWhere: any = {};

    // Apply user role restrictions
    const scopedHibretId = user.role === "HIBRET_ADMIN" && user.hibretId ? user.hibretId : null;
    if (scopedHibretId) {
      scopedWhere.hibretId = scopedHibretId;
    }

    // Apply hibret filter
    if (hibretId && !scopedHibretId) {
      scopedWhere.hibretId = hibretId;
    }

    // Apply search filter
    if (search) {
      scopedWhere.OR = [
        { firstName: { contains: search, mode: "insensitive" } },
        { fatherName: { contains: search, mode: "insensitive" } },
        { grandfatherName: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
        { ppId: { contains: search, mode: "insensitive" } },
        { fanId: { contains: search, mode: "insensitive" } },
        { kebele: { contains: search, mode: "insensitive" } },
        { hibret: { is: { name: { contains: search, mode: "insensitive" } } } },
      ];
    }

    // Apply analytics-specific filters
    if (gender) scopedWhere.gender = gender;
    if (workType) scopedWhere.workType = workType;
    if (educationLevel) scopedWhere.educationLevel = educationLevel;
    if (membershipStatus) scopedWhere.membershipStatus = membershipStatus;
    if (registrationType) scopedWhere.registrationType = registrationType;
    if (healthStatus) scopedWhere.healthStatus = healthStatus;
    if (ethnicity) scopedWhere.ethnicity = ethnicity;
    if (zone) scopedWhere.zone = zone;
    if (kebele) scopedWhere.kebele = kebele;
    
    // Apply FAN status filter
    if (fanStatus === "registered") {
      scopedWhere.fanId = { not: null };
    } else if (fanStatus === "not-registered") {
      scopedWhere.fanId = null;
    }

    // Apply date range filters
    if (registrationFrom || registrationTo) {
      scopedWhere.createdAt = {};
      if (registrationFrom) {
        scopedWhere.createdAt.gte = new Date(registrationFrom);
      }
      if (registrationTo) {
        const toDate = new Date(registrationTo);
        toDate.setHours(23, 59, 59, 999); // End of day
        scopedWhere.createdAt.lte = toDate;
      }
    }

    // Apply birth year filters
    if (birthYearFrom || birthYearTo) {
      scopedWhere.dateOfBirth = {};
      if (birthYearFrom) {
        scopedWhere.dateOfBirth.gte = new Date(`${birthYearFrom}-01-01`);
      }
      if (birthYearTo) {
        scopedWhere.dateOfBirth.lte = new Date(`${birthYearTo}-12-31`);
      }
    }

    // Apply age filters (calculate date ranges from current age)
    if (ageFrom || ageTo) {
      const currentYear = new Date().getFullYear();
      if (!scopedWhere.dateOfBirth) scopedWhere.dateOfBirth = {};
      
      if (ageFrom) {
        // If someone is ageFrom years old, they were born in currentYear - ageFrom
        const maxBirthYear = currentYear - parseInt(ageFrom);
        scopedWhere.dateOfBirth.lte = new Date(`${maxBirthYear}-12-31`);
      }
      if (ageTo) {
        // If someone is ageTo years old, they were born in currentYear - ageTo
        const minBirthYear = currentYear - parseInt(ageTo);
        scopedWhere.dateOfBirth.gte = new Date(`${minBirthYear}-01-01`);
      }
    }

    // Get total count
    const totalCount = await prisma.member.count({ where: scopedWhere });

    // Get gender distribution
    const genderData = await prisma.member.groupBy({
      by: ['gender'],
      where: scopedWhere,
      _count: true
    });

    // Get work type distribution
    const workTypeData = await prisma.member.groupBy({
      by: ['workType'],
      where: scopedWhere,
      _count: true
    });

    // Get education level distribution
    const educationLevelData = await prisma.member.groupBy({
      by: ['educationLevel'],
      where: scopedWhere,
      _count: true
    });

    // Get membership status distribution
    const membershipStatusData = await prisma.member.groupBy({
      by: ['membershipStatus'],
      where: scopedWhere,
      _count: true
    });

    // Get hibret distribution
    const hibretData = await prisma.member.groupBy({
      by: ['hibretId'],
      where: scopedWhere,
      _count: true
    });

    // Get total hibret count (for the dashboard stat)
    const totalHibretCount = await prisma.hibret.count({
      where: scopedHibretId ? { id: scopedHibretId } : {}
    });

    // Enrich hibret data with names
    const hibretIds = hibretData.map(h => h.hibretId).filter(Boolean);
    const hibrets = await prisma.hibret.findMany({
      where: { id: { in: hibretIds } },
      select: { id: true, name: true }
    });

    const hibretMap = new Map(hibrets.map(h => [h.id, h.name]));
    const enrichedHibretData = hibretData.map(h => ({
      ...h,
      hibretName: hibretMap.get(h.hibretId) || 'Unknown Hibret'
    }));

    // Get FAN registration count
    const fanRegisteredCount = await prisma.member.count({
      where: { ...scopedWhere, fanId: { not: null } }
    });

    // Get age distribution (calculate age groups from birth dates)
    const membersWithBirthDate = await prisma.member.findMany({
      where: { ...scopedWhere, dateOfBirth: { not: null } },
      select: { dateOfBirth: true }
    });

    const ageGroups = [
      { ageGroup: '18-25', count: 0 },
      { ageGroup: '26-35', count: 0 },
      { ageGroup: '36-45', count: 0 },
      { ageGroup: '46-55', count: 0 },
      { ageGroup: '56-65', count: 0 },
      { ageGroup: '65+', count: 0 }
    ];

    const currentDate = new Date();
    membersWithBirthDate.forEach(member => {
      if (member.dateOfBirth) {
        const age = currentDate.getFullYear() - member.dateOfBirth.getFullYear();
        if (age >= 18 && age <= 25) ageGroups[0].count++;
        else if (age >= 26 && age <= 35) ageGroups[1].count++;
        else if (age >= 36 && age <= 45) ageGroups[2].count++;
        else if (age >= 46 && age <= 55) ageGroups[3].count++;
        else if (age >= 56 && age <= 65) ageGroups[4].count++;
        else if (age > 65) ageGroups[5].count++;
      }
    });

    // Get unique hibret count
    const hibretCount = await prisma.hibret.count({
      where: {
        members: {
          some: scopedWhere
        }
      }
    });

    // Get attendance statistics
    const attendanceStats = await Promise.all([
      // Total attendance records
      prisma.attendanceRecord.count({
        where: {
          member: scopedWhere
        }
      }),
      
      // Attendance by status
      prisma.attendanceRecord.groupBy({
        by: ['status'],
        where: {
          member: scopedWhere
        },
        _count: true
      }),
      
      // Recent attendance (last 30 days)
      prisma.attendanceRecord.count({
        where: {
          member: scopedWhere,
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          }
        }
      })
    ]);

    // Get registration type distribution
    const registrationTypeData = await prisma.member.groupBy({
      by: ['registrationType'],
      where: scopedWhere,
      _count: true
    });

    // Get health status distribution
    const healthStatusData = await prisma.member.groupBy({
      by: ['healthStatus'],
      where: scopedWhere,
      _count: true
    });

    // Get ethnicity distribution
    const ethnicityData = await prisma.member.groupBy({
      by: ['ethnicity'],
      where: scopedWhere,
      _count: true
    });

    // Get zone distribution
    const zoneData = await prisma.member.groupBy({
      by: ['zone'],
      where: scopedWhere,
      _count: true
    });

    // Get kebele distribution
    const kebeleData = await prisma.member.groupBy({
      by: ['kebele'],
      where: scopedWhere,
      _count: true
    });

    return res.json({
      total: totalCount,
      fanRegistered: fanRegisteredCount,
      hibretCount: totalHibretCount,
      gender: genderData,
      workType: workTypeData,
      educationLevel: educationLevelData,
      membershipStatus: membershipStatusData,
      registrationType: registrationTypeData,
      healthStatus: healthStatusData,
      ethnicity: ethnicityData,
      zone: zoneData,
      kebele: kebeleData,
      hibret: enrichedHibretData,
      ageGroups: ageGroups.filter(group => group.count > 0),
      attendance: {
        total: attendanceStats[0],
        byStatus: attendanceStats[1],
        recent30Days: attendanceStats[2]
      }
    });

  } catch (error) {
    console.error("Failed to fetch analytics:", error);
    return res.status(500).json({ error: "Failed to fetch analytics data" });
  }
});

router.get("/:memberId", requirePrivilege("member.read"), async (req, res) => {
  const member = await getMemberWithRelations(String(req.params.memberId));

  if (!member || !canAccessMember(req, member)) {
    return res.status(404).json({ message: "Member not found" });
  }

  return res.json({
    member: {
      ...mapMember(member),
      attendance: member.attendanceRecords.map((record) => ({
        id: record.id,
        announcementTitle: record.announcement.title,
        announcementType: record.announcement.type,
        status: record.status,
        note: record.note,
        recordedAt: record.updatedAt,
      })),
    },
  });
});

router.patch("/:memberId", requirePrivilege("member.update"), async (req, res) => {
  const memberId = String(req.params.memberId);
  const existing = await prisma.member.findUnique({
    where: { id: memberId },
  });

  if (!existing || !canAccessMember(req, existing)) {
    return res.status(404).json({ message: "Member not found" });
  }

  const data = buildMemberData(req.body, "update");

  const hibretId = data.hibretId ?? existing.hibretId;
  const familyId = data.familyId === undefined ? existing.familyId : data.familyId;

  if (familyId) {
    const family = await prisma.family.findUnique({
      where: { id: familyId },
    });

    if (!family || family.hibretId !== hibretId) {
      return res.status(400).json({
        message: "Selected family does not belong to the selected Hibret.",
      });
    }
  }

  const mergedForCompletion = {
    ...existing,
    ...data,
    hibretId,
    familyId,
  };

  data.profileCompletion = calculateProfileCompletion(mergedForCompletion);

  const member = await prisma.member.update({
    where: { id: memberId },
    data,
    include: {
      hibret: true,
      family: true,
      user: true,
    },
  });

  return res.json({ member: mapMember(member) });
});

export default router;
