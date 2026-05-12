import { useMemo, useState } from "react";
import { Download, Upload, X } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/shadcn/button";
import { Badge } from "@/components/ui/shadcn/badge";
import {
  commitMemberImport,
  previewMemberImport,
} from "../../../services/woredaMemberService";
import type { MemberImportPreviewRow } from "../../../services/woredaMemberService";

type MemberImportDrawerProps = {
  isOpen: boolean;
  onClose: () => void;
  onImported: () => Promise<void>;
};

const templateColumns = [
  "memberCode",
  "fanId",
  "ppId",
  "firstName",
  "fatherName",
  "grandfatherName",
  "gender",
  "phone",
  "email",
  "hibretName",
  "familyName",
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
];

const editableFields = [
  { key: "memberCode", label: "Member code" },
  { key: "fanId", label: "FAN ID" },
  { key: "ppId", label: "PP ID" },
  { key: "firstName", label: "First name" },
  { key: "fatherName", label: "Father name" },
  { key: "grandfatherName", label: "Grandfather name" },
  { key: "gender", label: "Gender" },
  { key: "phone", label: "Phone" },
  { key: "email", label: "Email" },
  { key: "hibretName", label: "Hibret" },
  { key: "familyName", label: "Family" },
  { key: "membershipStatus", label: "Membership" },
  { key: "registrationType", label: "Registration" },
  { key: "membershipYear", label: "Year" },
  { key: "partyRole", label: "Party role" },
  { key: "educationLevel", label: "Education" },
  { key: "fieldOfStudy", label: "Field of study" },
  { key: "workplace", label: "Workplace" },
  { key: "workType", label: "Work type" },
  { key: "workExperienceYears", label: "Experience" },
  { key: "zone", label: "Zone" },
  { key: "kebele", label: "Kebele" },
  { key: "ethnicity", label: "Ethnicity" },
  { key: "healthStatus", label: "Health status" },
] as const;

function escapeCsv(value: string) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

function rowsToCsv(rows: Array<Record<string, string>>) {
  return [
    templateColumns.join(","),
    ...rows.map((row) => templateColumns.map((column) => escapeCsv(row[column] || "")).join(",")),
  ].join("\n");
}

function downloadCsv(filename: string, csvText: string) {
  const blob = new Blob([csvText], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function downloadTemplate() {
  const sampleRow: Record<string, string> = {
    memberCode: "CSC-100",
    fanId: "FAN-CSC-100",
    ppId: "PP-CSC-100",
    firstName: "Example",
    fatherName: "Father",
    grandfatherName: "Grandfather",
    gender: "male",
    phone: "0911000100",
    email: "example.member@astedader.local",
    hibretName: "ሲቪል ሰርቪስ ኮሚሽን",
    familyName: "",
    membershipStatus: "active",
    registrationType: "new",
    membershipYear: "2026",
    partyRole: "member",
    educationLevel: "Degree",
    fieldOfStudy: "Public Administration",
    workplace: "Civil Service Commission",
    workType: "government",
    workExperienceYears: "3",
    zone: "Addis Ababa",
    kebele: "Kebele 01",
    ethnicity: "",
    healthStatus: "",
  };

  downloadCsv("member-import-template.csv", rowsToCsv([sampleRow]));
}

function editableRowsToCsv(rows: MemberImportPreviewRow[]) {
  return rowsToCsv(
    rows.map((row) => {
      const output: Record<string, string> = {};

      templateColumns.forEach((column) => {
        const value = (row.normalized as any)[column] ?? (row.raw as any)[column] ?? "";
        output[column] = String(value ?? "");
      });

      return output;
    })
  );
}

function downloadErrorReport(rows: MemberImportPreviewRow[]) {
  const invalidRows = rows.filter((row) => !row.isValid);
  const csv = [
    "rowNumber,errors," + templateColumns.join(","),
    ...invalidRows.map((row) => {
      const values = templateColumns.map((column) =>
        escapeCsv(String((row.normalized as any)[column] ?? (row.raw as any)[column] ?? ""))
      );

      return [
        row.rowNumber,
        escapeCsv(row.errors.join(" | ")),
        ...values,
      ].join(",");
    }),
  ].join("\n");

  downloadCsv("member-import-errors.csv", csv);
}

async function readImportFile(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase();

  if (extension === "xlsx" || extension === "xls") {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array" });
    const firstSheetName = workbook.SheetNames[0];

    if (!firstSheetName) {
      throw new Error("Excel file has no sheets.");
    }

    const worksheet = workbook.Sheets[firstSheetName];
    return XLSX.utils.sheet_to_csv(worksheet);
  }

  return file.text();
}

export function MemberImportDrawer({
  isOpen,
  onClose,
  onImported,
}: MemberImportDrawerProps) {
  const [rows, setRows] = useState<MemberImportPreviewRow[]>([]);
  const [summary, setSummary] = useState({ total: 0, valid: 0, invalid: 0 });
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [showInvalidOnly, setShowInvalidOnly] = useState(false);

  const validRows = useMemo(() => rows.filter((row) => row.isValid), [rows]);

  const visibleRows = useMemo(() => {
    if (showInvalidOnly) return rows.filter((row) => !row.isValid);
    return rows;
  }, [rows, showInvalidOnly]);

  if (!isOpen) return null;

  async function previewCsv(csvText: string) {
    const preview = await previewMemberImport(csvText);
    setRows(preview.rows);
    setSummary(preview.summary);
  }

  async function handleFileUpload(file?: File | null) {
    if (!file) return;

    setIsPreviewing(true);

    try {
      const csvText = await readImportFile(file);
      await previewCsv(csvText);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Unable to preview import file.");
    } finally {
      setIsPreviewing(false);
    }
  }

  async function handleRevalidateRows(nextRows = rows) {
    setIsPreviewing(true);

    try {
      await previewCsv(editableRowsToCsv(nextRows));
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Unable to revalidate edited rows.");
    } finally {
      setIsPreviewing(false);
    }
  }

  function updateRowField(rowNumber: number, field: string, value: string) {
    setRows((currentRows) =>
      currentRows.map((row) => {
        if (row.rowNumber !== rowNumber) return row;

        return {
          ...row,
          normalized: {
            ...row.normalized,
            [field]: value,
          },
          raw: {
            ...row.raw,
            [field]: value,
          },
          isValid: false,
          errors: ["Row changed. Click Revalidate Preview before importing."],
        };
      })
    );
  }

  function removeRow(rowNumber: number) {
    const nextRows = rows.filter((row) => row.rowNumber !== rowNumber);
    setRows(nextRows);
    setSummary({
      total: nextRows.length,
      valid: nextRows.filter((row) => row.isValid).length,
      invalid: nextRows.filter((row) => !row.isValid).length,
    });
  }

  async function handleImport() {
    if (validRows.length === 0) {
      toast.error("No valid rows to import.");
      return;
    }

    setIsImporting(true);

    try {
      const result = await commitMemberImport(validRows);
      toast.success(
        `${result.message} Created: ${result.createdCount}. Failed: ${result.failedCount}.`,
      );
      await onImported();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Unable to import members.");
    } finally {
      setIsImporting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-[var(--overlay-scrim)]">
      <div className="flex min-h-0 h-full w-full max-w-[var(--aw-drawer-max-inline)] flex-col bg-woreda-surface text-woreda-text shadow-none">
        <div className="flex items-start justify-between gap-4 border-b border-woreda-border bg-woreda-surfaceLow px-6 py-5">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-woreda-textMuted">
              Member import
            </p>
            <h2 className="mt-1 text-xl font-bold text-woreda-text">
              Bulk import members
            </h2>
            <p className="mt-1 text-sm text-woreda-textMuted">
              Upload CSV, edit preview rows if needed, revalidate, then import valid members.
            </p>
          </div>

          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={onClose}
            aria-label="Close"
          >
            <X aria-hidden />
          </Button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-6">
          <div className="form-grid">
            <div className="border border-woreda-border/70 bg-woreda-surfaceLow p-4">
              <h3 className="font-bold text-woreda-text">Upload CSV or Excel</h3>
              <p className="mt-1 text-sm text-woreda-textMuted">
                Required columns: firstName, fatherName, gender, hibretName.
              </p>

              <label className="mt-4 flex cursor-pointer items-center justify-center gap-2 border border-dashed border-woreda-border bg-woreda-surface px-4 py-8 text-sm font-bold text-woreda-text hover:border-woreda-primary hover:text-woreda-primary">
                <Upload size={18} />
                {isPreviewing ? "Reading file..." : "Choose CSV or Excel file"}
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                  className="hidden"
                  onChange={(event) => handleFileUpload(event.target.files?.[0])}
                />
              </label>
            </div>

            <div className="border border-woreda-border/70 bg-woreda-surfaceLow p-4">
              <h3 className="font-bold text-woreda-text">CSV tools</h3>
              <p className="mt-1 text-sm text-woreda-textMuted">
                Download a template or export edited preview rows.
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="default"
                  onClick={downloadTemplate}
                >
                  <Download aria-hidden />
                  Download Template
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="default"
                  disabled={rows.length === 0}
                  onClick={() =>
                    downloadCsv("member-import-edited-preview.csv", editableRowsToCsv(rows))
                  }
                >
                  Export Edited Preview
                </Button>

                <Button
                  type="button"
                  variant="destructive"
                  size="default"
                  disabled={summary.invalid === 0}
                  onClick={() => downloadErrorReport(rows)}
                >
                  Download Errors
                </Button>
              </div>
            </div>
          </div>

          <div className="stat-grid mt-5">
            <SummaryCard label="Rows" value={summary.total} />
            <SummaryCard label="Valid" value={summary.valid} tone="success" />
            <SummaryCard label="Invalid" value={summary.invalid} tone="danger" />
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border border-woreda-border/70 bg-woreda-surfaceLow px-4 py-3">
            <div>
              <p className="text-sm font-bold text-woreda-text">Editable preview</p>
              <p className="text-xs font-semibold text-woreda-textMuted">
                Edit cells directly, then click Revalidate Preview before importing.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowInvalidOnly((value) => !value)}
              >
                {showInvalidOnly ? "Show All Rows" : "Show Invalid Only"}
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={rows.length === 0 || isPreviewing}
                onClick={() => handleRevalidateRows()}
              >
                {isPreviewing ? "Validating..." : "Revalidate Preview"}
              </Button>
            </div>
          </div>

          <div className="aw-fluid-table-scroll aw-fluid-table-scroll--import mt-4 max-h-[min(35rem,calc(var(--aw-viewport-block)-18rem))] rounded border border-woreda-border/70 bg-woreda-surface">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 z-10 bg-woreda-surfaceLow text-[10px] uppercase tracking-[0.12em] text-woreda-textMuted">
                <tr>
                  <th className="sticky left-0 z-20 border-b border-r border-woreda-border/60 bg-woreda-surfaceLow px-3 py-3">
                    Row
                  </th>
                  <th className="border-b border-woreda-border/60 px-3 py-3">Status</th>
                  {editableFields.map((field) => (
                    <th key={field.key} className="border-b border-woreda-border/60 px-3 py-3">
                      {field.label}
                    </th>
                  ))}
                  <th className="border-b border-woreda-border/60 px-3 py-3">Errors</th>
                  <th className="border-b border-woreda-border/60 px-3 py-3">Action</th>
                </tr>
              </thead>

              <tbody>
                {visibleRows.length === 0 ? (
                  <tr>
                    <td colSpan={editableFields.length + 4} className="px-4 py-10 text-center text-sm font-semibold text-woreda-textMuted">
                      No preview rows.
                    </td>
                  </tr>
                ) : (
                  visibleRows.map((row) => (
                    <tr key={row.rowNumber} className="hover:bg-woreda-primarySoft/40">
                      <td className="sticky left-0 z-10 border-b border-r border-woreda-borderLight/40 bg-woreda-surface px-3 py-2 font-bold">
                        {row.rowNumber}
                      </td>

                      <td className="border-b border-woreda-borderLight/40 px-3 py-2">
                        <Badge variant={row.isValid ? "success" : "destructive"}>
                          {row.isValid ? "Valid" : "Invalid"}
                        </Badge>
                      </td>

                      {editableFields.map((field) => (
                        <td key={`${row.rowNumber}-${field.key}`} className="border-b border-woreda-borderLight/40 px-2 py-2">
                          <input
                            value={String((row.normalized as any)[field.key] ?? "")}
                            onChange={(event) => updateRowField(row.rowNumber, field.key, event.target.value)}
                            className="min-h-9 w-full min-w-[var(--aw-import-field-min-inline)] rounded-sm border border-woreda-border bg-woreda-bg px-2 py-1 text-xs font-semibold text-woreda-text outline-none focus:border-woreda-primary"
                          />
                        </td>
                      ))}

                      <td className="border-b border-woreda-borderLight/40 px-3 py-2 text-[11px] font-semibold text-woreda-danger">
                        <div className="max-w-[var(--aw-import-error-max-inline)] break-words rounded bg-woreda-dangerBg px-2 py-1">
                          {row.errors.length ? row.errors.join(" ") : "-"}
                        </div>
                      </td>

                      <td className="border-b border-woreda-borderLight/40 px-3 py-2">
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => removeRow(row.rowNumber)}
                        >
                          Remove
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-border bg-muted/30 px-6 py-4">
          <Button type="button" variant="outline" size="default" onClick={onClose}>
            Close
          </Button>

          <Button
            type="button"
            variant="outline"
            size="default"
            disabled={rows.length === 0 || isPreviewing}
            onClick={() => handleRevalidateRows()}
          >
            Revalidate
          </Button>

          <Button
            type="button"
            variant="default"
            size="default"
            disabled={isImporting || validRows.length === 0}
            onClick={handleImport}
          >
            {isImporting ? "Importing..." : `Import ${validRows.length} Valid Rows`}
          </Button>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "success" | "danger";
}) {
  const valueClass =
    tone === "success"
      ? "text-woreda-success"
      : tone === "danger"
        ? "text-woreda-danger"
        : "text-woreda-text";

  return (
    <div className="border border-woreda-border/70 bg-woreda-surfaceLow p-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-woreda-textMuted">
        {label}
      </p>
      <p className={`mt-1 text-2xl font-bold ${valueClass}`}>{value}</p>
    </div>
  );
}
