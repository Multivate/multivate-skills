"use client";

import React, { useCallback, useId, useRef, useState } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type MediaFileOut = {
  id: string;
  original_filename: string;
  mime_type: string;
  extension: string;
  size_bytes: number;
  folder: string;
  public_url: string;
  uploaded_by: string | null;
  created_at: string;
};

export type UploadResult = {
  file: MediaFileOut;
  message: string;
};

export type UploadProps = {
  /** Logical folder / bucket (avatars | mentors | courses | lessons | resources | general) */
  folder?: string;
  /** Optional sub-path within the folder (e.g. a course or lesson UUID string) */
  subfolder?: string;
  /** Accepted MIME types for the native file picker (e.g. "image/*") */
  accept?: string;
  /** Label shown in the drag-drop zone */
  label?: string;
  /** Hint text shown below the label */
  hint?: string;
  /** Called on successful upload */
  onSuccess?: (result: UploadResult) => void;
  /** Called on error */
  onError?: (message: string) => void;
  /** Additional class names for the outer container */
  className?: string;
  /** If true shows a small inline variant instead of full drop zone */
  compact?: boolean;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function Upload({
  folder = "general",
  subfolder,
  accept,
  label = "Drag & drop or click to upload",
  hint,
  onSuccess,
  onError,
  className = "",
  compact = false,
}: UploadProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [uploaded, setUploaded] = useState<MediaFileOut | null>(null);
  const [error, setError] = useState<string | null>(null);

  const doUpload = useCallback(
    async (file: File) => {
      setError(null);
      setUploaded(null);
      setIsUploading(true);
      setProgress(0);

      const params = new URLSearchParams({ folder });
      if (subfolder) params.set("subfolder", subfolder);

      const formData = new FormData();
      formData.append("file", file);

      try {
        // Route through the BFF proxy at /api/media/upload which appends the
        // httpOnly access_token cookie for us.
        const result = await new Promise<UploadResult>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open("POST", `/api/media/upload?${params.toString()}`);

          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
              setProgress(Math.round((e.loaded / e.total) * 100));
            }
          };

          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              try {
                resolve(JSON.parse(xhr.responseText) as UploadResult);
              } catch {
                reject(new Error("Invalid server response."));
              }
            } else {
              try {
                const body = JSON.parse(xhr.responseText) as { detail?: string };
                reject(new Error(body.detail ?? `Upload failed (${xhr.status}).`));
              } catch {
                reject(new Error(`Upload failed (${xhr.status}).`));
              }
            }
          };

          xhr.onerror = () => reject(new Error("Network error during upload."));
          xhr.send(formData);
        });

        setUploaded(result.file);
        onSuccess?.(result);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Upload failed.";
        setError(msg);
        onError?.(msg);
      } finally {
        setIsUploading(false);
        setProgress(null);
      }
    },
    [folder, subfolder, onSuccess, onError],
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) doUpload(file);
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) doUpload(file);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => setIsDragOver(false);

  // ---- Compact inline button variant ----
  if (compact) {
    return (
      <span className={`inline-flex items-center gap-2 ${className}`}>
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept={accept}
          className="sr-only"
          onChange={handleFileChange}
          disabled={isUploading}
        />
        <label
          htmlFor={inputId}
          className={`inline-flex cursor-pointer items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium transition
            ${isUploading
              ? "cursor-not-allowed border-slate-300 bg-slate-100 text-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-500"
              : "border-violet-500 bg-violet-50 text-violet-700 hover:bg-violet-100 dark:border-violet-600 dark:bg-violet-900/20 dark:text-violet-300 dark:hover:bg-violet-900/40"
            }`}
        >
          {isUploading ? (
            <>
              <Spinner /> Uploading{progress !== null ? ` ${progress}%` : "…"}
            </>
          ) : (
            <>
              <UploadIcon /> {label}
            </>
          )}
        </label>

        {uploaded && (
          <span className="text-xs text-emerald-600 dark:text-emerald-400">
            ✓ {uploaded.original_filename}
          </span>
        )}
        {error && (
          <span className="text-xs text-red-500 dark:text-red-400">{error}</span>
        )}
      </span>
    );
  }

  // ---- Full drag-drop zone variant ----
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={accept}
        className="sr-only"
        onChange={handleFileChange}
        disabled={isUploading}
      />

      {/* Drop zone */}
      <div
        role="button"
        tabIndex={0}
        aria-label={label}
        onClick={() => !isUploading && inputRef.current?.click()}
        onKeyDown={(e) => {
          if ((e.key === "Enter" || e.key === " ") && !isUploading) {
            inputRef.current?.click();
          }
        }}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`relative flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-8 text-center transition
          ${isDragOver
            ? "border-violet-500 bg-violet-50 dark:border-violet-400 dark:bg-violet-900/20"
            : "border-slate-300 bg-slate-50 hover:border-violet-400 hover:bg-violet-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-violet-600 dark:hover:bg-violet-900/10"
          }
          ${isUploading ? "cursor-not-allowed opacity-70" : ""}
        `}
      >
        {isUploading ? (
          <>
            <Spinner className="h-8 w-8 text-violet-500" />
            <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
              Uploading{progress !== null ? ` — ${progress}%` : "…"}
            </p>
            {progress !== null && (
              <div className="h-1.5 w-48 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                <div
                  className="h-full rounded-full bg-violet-500 transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            )}
          </>
        ) : (
          <>
            <UploadIcon className="h-10 w-10 text-slate-400 dark:text-slate-500" />
            <div>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                {label}
              </p>
              {hint && (
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{hint}</p>
              )}
            </div>
          </>
        )}
      </div>

      {/* Success state */}
      {uploaded && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300">
          <CheckIcon className="h-4 w-4 shrink-0" />
          <span className="truncate font-medium">{uploaded.original_filename}</span>
          <span className="ml-auto shrink-0 text-xs text-emerald-500">
            {formatBytes(uploaded.size_bytes)}
          </span>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          <ErrorIcon className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Inline SVG icons (no external dependency)
// ---------------------------------------------------------------------------

function UploadIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
    </svg>
  );
}

function CheckIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  );
}

function ErrorIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
    </svg>
  );
}

function Spinner({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} fill="none" viewBox="0 0 24 24" aria-hidden>
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}
