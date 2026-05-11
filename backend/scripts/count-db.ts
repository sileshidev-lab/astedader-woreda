import { prisma } from "../src/prisma/client";

async function countModel(label: string, modelName: string) {
  const model = (prisma as any)[modelName];

  if (!model || typeof model.count !== "function") {
    return {
      label,
      modelName,
      status: "MODEL_NOT_FOUND",
      count: null,
    };
  }

  return {
    label,
    modelName,
    status: "OK",
    count: await model.count(),
  };
}

async function main() {
  console.log("===== AVAILABLE PRISMA MODEL KEYS =====");

  const keys = Object.keys(prisma as any)
    .filter((key) => !key.startsWith("_") && !key.startsWith("$"))
    .sort();

  console.log(keys.join("\n"));

  console.log("\n===== DATABASE COUNTS =====");

  const checks: Array<[string, string]> = [
    ["users", "user"],
    ["hibrets", "hibret"],
    ["members", "member"],
    ["announcements", "announcement"],
    ["reports", "report"],
    ["files_file", "file"],
    ["files_fileRecord", "fileRecord"],
    ["notifications", "notification"],
    ["broadcasts", "broadcast"],
    ["resources", "resource"],
    ["attendance", "attendanceRecord"],
    ["chatConversations", "chatConversation"],
    ["chatMessages", "chatMessage"],
  ];

  const results = [];

  for (const [label, modelName] of checks) {
    results.push(await countModel(label, modelName));
  }

  console.log(JSON.stringify(results, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
