"use client";

import {
  EXPORT_FILES,
  downloadTextFile,
  getExportContent,
  getExportFilename,
  type ExportFileId,
} from "@/lib/export-reports";
import type { QAAnalysis } from "@/types/qa-analysis";

interface ExportDownloadsProps {
  analysis: QAAnalysis;
}

export default function ExportDownloads({ analysis }: ExportDownloadsProps) {
  function handleDownload(id: ExportFileId) {
    const content = getExportContent(id, analysis);
    downloadTextFile(getExportFilename(id, analysis), content);
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <h3 className="text-sm font-semibold text-slate-900">Download files</h3>
      <p className="mt-1 text-xs text-slate-500">
        Export agent output for tickets, test management, or automation setup.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {EXPORT_FILES.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => handleDownload(id)}
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-100"
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
