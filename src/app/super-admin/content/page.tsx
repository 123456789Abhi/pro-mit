"use client";

import { useState } from "react";
import {
  BookOpen,
  Upload,
  Loader2,
  FileText,
  BarChart3,
  Archive,
  Play,
  RotateCw,
  Eye,
  ToggleLeft,
  ToggleRight,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  TrendingUp,
  Zap,
  FileBox,
  Database,
} from "lucide-react";
import { formatDateIST, formatRelativeTime } from "@/lib/utils";

type Tab = "library" | "upload" | "processing" | "pregen" | "coverage" | "analytics" | "archived";

interface TabConfig {
  id: Tab;
  label: string;
  icon: React.ReactNode;
}

const TABS: TabConfig[] = [
  { id: "library", label: "Library", icon: <BookOpen className="h-4 w-4" /> },
  { id: "upload", label: "Upload", icon: <Upload className="h-4 w-4" /> },
  { id: "processing", label: "Processing Queue", icon: <Loader2 className="h-4 w-4" /> },
  { id: "pregen", label: "Pre-gen Content", icon: <FileText className="h-4 w-4" /> },
  { id: "coverage", label: "Coverage", icon: <BarChart3 className="h-4 w-4" /> },
  { id: "analytics", label: "Usage Analytics", icon: <TrendingUp className="h-4 w-4" /> },
  { id: "archived", label: "Archived", icon: <Archive className="h-4 w-4" /> },
];

// ─────────────────────────────────────────────
// Status Badge Component
// ─────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
    pending: {
      label: "Pending",
      className: "bg-warning-bg text-warning border-warning/30",
      icon: <Clock className="h-3 w-3" />,
    },
    processing: {
      label: "Processing",
      className: "bg-info-bg text-info border-info/30",
      icon: <Loader2 className="h-3 w-3 animate-spin" />,
    },
    ready: {
      label: "Ready",
      className: "bg-success-bg text-success border-success/30",
      icon: <CheckCircle2 className="h-3 w-3" />,
    },
    failed: {
      label: "Failed",
      className: "bg-danger-bg text-danger border-danger/30",
      icon: <XCircle className="h-3 w-3" />,
    },
  };

  const c: { label: string; className: string; icon: React.ReactNode } = config[status] ?? { label: "Pending", className: "bg-warning-bg text-warning border-warning/30", icon: <Clock className="h-3 w-3" /> };

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${c.className}`}>
      {c.icon}
      {c.label}
    </span>
  );
}

// ─────────────────────────────────────────────
// Coverage Badge Component
// ─────────────────────────────────────────────

function CoverageBadge({ percentage }: { percentage: number }) {
  const config = percentage >= 80
    ? { label: "Good", className: "bg-success-bg text-success" }
    : percentage >= 50
    ? { label: "Moderate", className: "bg-warning-bg text-warning" }
    : { label: "Low", className: "bg-danger-bg text-danger" };

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${config.className}`}>
      {percentage}%
    </span>
  );
}

// ─────────────────────────────────────────────
// Library Tab
// ─────────────────────────────────────────────

function LibraryTab() {
  const [books] = useState<Array<{
    id: string;
    title: string;
    grade: number;
    subject: string;
    type: string;
    processing_status: string;
    chunks_count: number;
    chapters_count: number;
    topics_count: number;
    is_active: boolean;
  }>>([]);
  const [loading] = useState(false);
  const [filters, setFilters] = useState({ grade: "", subject: "", status: "" });

  const grades = [6, 7, 8, 9, 10, 11, 12];
  const subjects = ["Mathematics", "Science", "English", "Hindi", "Social Science", "Sanskrit", "Computer Science"];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">Content Library</h2>
          <p className="text-sm text-text-secondary">Manage all master books shared across schools</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-text-secondary">
          <Database className="h-4 w-4" />
          <span>{books.length} books</span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 rounded-lg border border-border bg-surface-1 p-4">
        <select
          className="h-10 rounded-md border border-border bg-surface-2 px-3 text-sm text-text-primary"
          value={filters.grade}
          onChange={(e) => setFilters({ ...filters, grade: e.target.value })}
        >
          <option value="">All Grades</option>
          {grades.map((g) => (
            <option key={g} value={g}>Class {g}</option>
          ))}
        </select>
        <select
          className="h-10 rounded-md border border-border bg-surface-2 px-3 text-sm text-text-primary"
          value={filters.subject}
          onChange={(e) => setFilters({ ...filters, subject: e.target.value })}
        >
          <option value="">All Subjects</option>
          {subjects.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select
          className="h-10 rounded-md border border-border bg-surface-2 px-3 text-sm text-text-primary"
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
        >
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="processing">Processing</option>
          <option value="ready">Ready</option>
          <option value="failed">Failed</option>
        </select>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-border bg-surface-1">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary">Title</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary">Grade</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary">Subject</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary">Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary">Chunks</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary">Chapters</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary">Topics</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-text-secondary">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-text-secondary">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                  </td>
                </tr>
              ) : books.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-text-secondary">
                    <BookOpen className="mx-auto h-12 w-12 text-text-muted" />
                    <p className="mt-2">No books in library</p>
                    <p className="text-sm">Upload a new book to get started</p>
                  </td>
                </tr>
              ) : (
                books.map((book) => (
                  <tr key={book.id} className="hover:bg-surface-1">
                    <td className="px-4 py-3">
                      <span className="font-medium text-text-primary">{book.title}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-text-secondary">Class {book.grade}</td>
                    <td className="px-4 py-3 text-sm text-text-secondary">{book.subject}</td>
                    <td className="px-4 py-3 text-sm text-text-secondary">{book.type}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={book.processing_status} />
                    </td>
                    <td className="px-4 py-3 text-sm text-text-secondary">{book.chunks_count}</td>
                    <td className="px-4 py-3 text-sm text-text-secondary">{book.chapters_count}</td>
                    <td className="px-4 py-3 text-sm text-text-secondary">{book.topics_count}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          className="rounded-md p-1.5 text-text-secondary hover:bg-surface-2 hover:text-text-primary"
                          title="View details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          className="rounded-md p-1.5 text-text-secondary hover:bg-surface-2 hover:text-text-primary"
                          title={book.is_active ? "Disable for schools" : "Enable for schools"}
                        >
                          {book.is_active ? (
                            <ToggleRight className="h-4 w-4 text-success" />
                          ) : (
                            <ToggleLeft className="h-4 w-4" />
                          )}
                        </button>
                        <button
                          className="rounded-md p-1.5 text-text-secondary hover:bg-surface-2 hover:text-text-primary"
                          title="Reprocess"
                        >
                          <RefreshCw className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Upload Tab
// ─────────────────────────────────────────────

function UploadTab() {
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    grade: "9",
    subject: "Mathematics",
    type: "Textbook",
    author: "NCERT",
  });

  const subjects = ["Mathematics", "Science", "English", "Hindi", "Social Science", "Sanskrit", "Computer Science"];
  const types = ["Textbook", "Reference", "Previous Paper", "Q&A"];

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile?.type === "application/pdf") {
      setFile(droppedFile);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile?.type === "application/pdf") {
      setFile(selectedFile);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !formData.title) { return; }

    setUploading(true);
    try {
      const data = new FormData();
      data.append("title", formData.title);
      data.append("grade", formData.grade);
      data.append("subject", formData.subject);
      data.append("type", formData.type);
      data.append("author", formData.author);
      data.append("file", file);

      // Server action would be called here
      // await uploadBook(data);

      setFile(null);
      setFormData({ ...formData, title: "" });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-text-primary">Upload New Book</h2>
        <p className="text-sm text-text-secondary">Upload a PDF book to add to the content library</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium text-text-primary">Title</label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="h-10 w-full rounded-md border border-border bg-surface-2 px-3 text-sm text-text-primary"
              placeholder="e.g., Mathematics Class 9"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-text-primary">Grade</label>
            <select
              value={formData.grade}
              onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
              className="h-10 w-full rounded-md border border-border bg-surface-2 px-3 text-sm text-text-primary"
            >
              {[6, 7, 8, 9, 10, 11, 12].map((g) => (
                <option key={g} value={g}>Class {g}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-text-primary">Subject</label>
            <select
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              className="h-10 w-full rounded-md border border-border bg-surface-2 px-3 text-sm text-text-primary"
            >
              {subjects.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-text-primary">Type</label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              className="h-10 w-full rounded-md border border-border bg-surface-2 px-3 text-sm text-text-primary"
            >
              {types.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-text-primary">Author</label>
            <input
              type="text"
              value={formData.author}
              onChange={(e) => setFormData({ ...formData, author: e.target.value })}
              className="h-10 w-full rounded-md border border-border bg-surface-2 px-3 text-sm text-text-primary"
              placeholder="e.g., NCERT"
            />
          </div>
        </div>

        {/* Dropzone */}
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`relative rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
            dragActive
              ? "border-info bg-info-bg"
              : file
              ? "border-success bg-success-bg"
              : "border-border hover:border-border-hover"
          }`}
        >
          <input
            type="file"
            accept="application/pdf"
            onChange={handleFileChange}
            className="absolute inset-0 w-full cursor-pointer opacity-0"
          />
          {file ? (
            <div className="flex items-center justify-center gap-3">
              <FileBox className="h-8 w-8 text-success" />
              <div className="text-left">
                <p className="font-medium text-text-primary">{file.name}</p>
                <p className="text-sm text-text-secondary">
                  {(file.size / (1024 * 1024)).toFixed(2)} MB
                </p>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setFile(null);
                }}
                className="ml-4 rounded-md p-1.5 text-text-secondary hover:bg-surface-2"
              >
                <XCircle className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <>
              <Upload className="mx-auto h-8 w-8 text-text-muted" />
              <p className="mt-2 text-sm text-text-secondary">
                <span className="font-medium text-info">Click to upload</span> or drag and drop
              </p>
              <p className="mt-1 text-xs text-text-muted">PDF files only, max 100MB</p>
            </>
          )}
        </div>

        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={!file || !formData.title || uploading}
            className="inline-flex h-10 items-center gap-2 rounded-md bg-brand px-4 text-sm font-medium text-white hover:bg-brand/90 disabled:opacity-50"
          >
            {uploading && <Loader2 className="h-4 w-4 animate-spin" />}
            {uploading ? "Uploading..." : "Upload Book"}
          </button>
          <p className="text-sm text-text-muted">
            {file && `Queue position: #${Math.floor(Math.random() * 10) + 1}`}
          </p>
        </div>
      </form>

      {/* Processing Info */}
      <div className="rounded-lg border border-border bg-surface-1 p-4">
        <h3 className="font-medium text-text-primary">Processing Pipeline</h3>
        <div className="mt-4 space-y-3">
          {[
            { step: 1, name: "Extract Text", desc: "Extract text from PDF using pdf-parse" },
            { step: 2, name: "Create Chunks", desc: "Split by chapter into ~500 token chunks" },
            { step: 3, name: "Generate Embeddings", desc: "Create 1536-dim embeddings via OpenAI" },
            { step: 4, name: "Store in pgvector", desc: "Index embeddings for similarity search" },
          ].map((s, i) => (
            <div key={s.step} className="flex items-start gap-3">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-medium text-white">
                {s.step}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-text-primary">{s.name}</p>
                <p className="text-xs text-text-secondary">{s.desc}</p>
              </div>
              {i < 3 && <div className="absolute left-[27px] top-10 h-6 w-px bg-border" style={{ position: "relative" }} />}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Processing Queue Tab
// ─────────────────────────────────────────────

function ProcessingTab() {
  const [jobs] = useState<Array<{
    id: string;
    book_title: string;
    status: string;
    stage: string;
    stage_progress: number;
    queue_position: number | null;
    error_message: string | null;
    started_at: string | null;
  }>>([]);
  const [loading] = useState(false);

  const pendingCount = jobs.filter((j) => j.status === "pending").length;
  const processingCount = jobs.filter((j) => j.status === "processing").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">Processing Queue</h2>
          <p className="text-sm text-text-secondary">Monitor books currently being processed</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 rounded-full bg-warning-bg px-3 py-1 text-sm text-warning">
            <Clock className="h-4 w-4" />
            {pendingCount} pending
          </div>
          <div className="flex items-center gap-2 rounded-full bg-info-bg px-3 py-1 text-sm text-info">
            <Loader2 className="h-4 w-4 animate-spin" />
            {processingCount} processing
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-text-muted" />
          </div>
        ) : jobs.length === 0 ? (
          <div className="rounded-lg border border-border bg-surface-1 p-12 text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-success" />
            <p className="mt-2 font-medium text-text-primary">All caught up!</p>
            <p className="text-sm text-text-secondary">No books are currently processing</p>
          </div>
        ) : (
          jobs.map((job) => (
            <div key={job.id} className="rounded-lg border border-border bg-surface-1 p-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex-1">
                  <p className="font-medium text-text-primary">{job.book_title}</p>
                  <div className="mt-1 flex items-center gap-3 text-sm text-text-secondary">
                    <StatusBadge status={job.status} />
                    <span>Stage: {job.stage}</span>
                    {job.queue_position && <span>Queue: #{job.queue_position}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {job.status === "failed" ? (
                    <button className="inline-flex h-9 items-center gap-2 rounded-md bg-brand px-3 text-sm font-medium text-white hover:bg-brand/90">
                      <RotateCw className="h-4 w-4" />
                      Retry
                    </button>
                  ) : job.status === "ready" ? (
                    <button className="inline-flex h-9 items-center gap-2 rounded-md bg-success px-3 text-sm font-medium text-white hover:bg-success/90">
                      <Play className="h-4 w-4" />
                      Trigger Pre-gen
                    </button>
                  ) : null}
                </div>
              </div>

              {job.status === "processing" && (
                <div className="mt-4">
                  <div className="flex items-center justify-between text-xs text-text-secondary">
                    <span>Progress</span>
                    <span>{job.stage_progress}%</span>
                  </div>
                  <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-surface-2">
                    <div
                      className="h-full rounded-full bg-info transition-all"
                      style={{ width: `${job.stage_progress}%` }}
                    />
                  </div>
                </div>
              )}

              {job.error_message && (
                <div className="mt-4 rounded-md bg-danger-bg p-3 text-sm text-danger">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <p>{job.error_message}</p>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Pre-gen Content Tab
// ─────────────────────────────────────────────

function PregenTab() {
  const [items] = useState<Array<{
    id: string;
    book_title: string;
    chapter_number: number;
    chapter_title: string;
    grade: number;
    subject: string;
    type: string;
    hit_count: number;
    created_at: string;
  }>>([]);
  const [loading] = useState(false);
  const [filters, setFilters] = useState({ type: "" });

  const pregenTypes = ["Notes", "Summaries", "FAQ", "Quizzes", "Drills", "Study Plans"];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">Pre-generated Content</h2>
          <p className="text-sm text-text-secondary">Manage notes, summaries, FAQ, quizzes, and drills</p>
        </div>
        <div className="text-sm text-text-secondary">
          {items.length} items generated
        </div>
      </div>

      <div className="flex flex-wrap gap-3 rounded-lg border border-border bg-surface-1 p-4">
        <select
          className="h-10 rounded-md border border-border bg-surface-2 px-3 text-sm text-text-primary"
          value={filters.type}
          onChange={(e) => setFilters({ ...filters, type: e.target.value })}
        >
          <option value="">All Types</option>
          {pregenTypes.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      <div className="rounded-lg border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-border bg-surface-1">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary">Book</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary">Chapter</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary">Grade</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary">Subject</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary">Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary">Created</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary">Hits</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-text-secondary">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-text-secondary">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-text-secondary">
                    <FileText className="mx-auto h-12 w-12 text-text-muted" />
                    <p className="mt-2">No pre-generated content yet</p>
                    <p className="text-sm">Process a book first to generate content</p>
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className="hover:bg-surface-1">
                    <td className="px-4 py-3">
                      <span className="font-medium text-text-primary">{item.book_title}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-text-secondary">
                      Ch.{item.chapter_number} {item.chapter_title}
                    </td>
                    <td className="px-4 py-3 text-sm text-text-secondary">Class {item.grade}</td>
                    <td className="px-4 py-3 text-sm text-text-secondary">{item.subject}</td>
                    <td className="px-4 py-3 text-sm text-text-secondary">{item.type}</td>
                    <td className="px-4 py-3 text-sm text-text-secondary">
                      {formatRelativeTime(item.created_at)}
                    </td>
                    <td className="px-4 py-3 text-sm text-text-secondary">{item.hit_count}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          className="rounded-md p-1.5 text-text-secondary hover:bg-surface-2 hover:text-text-primary"
                          title="View content"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          className="rounded-md p-1.5 text-text-secondary hover:bg-surface-2 hover:text-text-primary"
                          title="Regenerate"
                        >
                          <RefreshCw className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Coverage Tab
// ─────────────────────────────────────────────

function CoverageTab() {
  const GRADES = [6, 7, 8, 9, 10, 11, 12];
  const SUBJECTS = ["Mathematics", "Science", "English", "Hindi", "Social Science", "Sanskrit"];

  const [coverage] = useState<Array<{
    grade: number;
    subject: string;
    coverage_percentage: number;
    coverage_notes: number;
    coverage_summaries: number;
    coverage_faq: number;
    coverage_quizzes: number;
    coverage_drills: number;
  }>>([]);
  const [overallCoverage] = useState(0);

  const getCoverageColor = (percentage: number) => {
    if (percentage >= 80) { return "bg-success"; }
    if (percentage >= 50) { return "bg-warning"; }
    return "bg-danger";
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">Content Coverage</h2>
          <p className="text-sm text-text-secondary">CBSE 2026-27 catalog coverage by grade and subject</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-2xl font-bold text-text-primary">{overallCoverage}%</p>
            <p className="text-sm text-text-secondary">Overall Coverage</p>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded bg-success" />
          <span className="text-text-secondary">&gt;80% (Good)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded bg-warning" />
          <span className="text-text-secondary">50-80% (Moderate)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded bg-danger" />
          <span className="text-text-secondary">&lt;50% (Low)</span>
        </div>
      </div>

      {/* Coverage Matrix */}
      <div className="rounded-lg border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-border bg-surface-1">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary sticky left-0 bg-surface-1">Grade</th>
                {SUBJECTS.map((s) => (
                  <th key={s} className="px-4 py-3 text-center text-xs font-medium text-text-secondary">{s}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {GRADES.map((grade) => (
                <tr key={grade} className="hover:bg-surface-1">
                  <td className="px-4 py-3 font-medium text-text-primary sticky left-0 bg-surface-1">
                    Class {grade}
                  </td>
                  {SUBJECTS.map((subject) => {
                    const item = coverage.find((c) => c.grade === grade && c.subject === subject);
                    const percentage = item?.coverage_percentage ?? 0;
                    return (
                      <td key={`${grade}-${subject}`} className="px-4 py-3 text-center">
                        <div className="mx-auto w-16">
                          <div className="mb-1 text-sm font-medium">{percentage}%</div>
                          <div className="h-2 w-full overflow-hidden rounded-full bg-surface-2">
                            <div
                              className={`h-full ${getCoverageColor(percentage)}`}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Coverage Breakdown */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {coverage.slice(0, 6).map((item, i) => (
          <div key={i} className="rounded-lg border border-border bg-surface-1 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-text-primary">Class {item.grade} - {item.subject}</p>
                <p className="text-sm text-text-secondary">{item.coverage_percentage}% covered</p>
              </div>
              <CoverageBadge percentage={item.coverage_percentage} />
            </div>
            <div className="mt-3 grid grid-cols-5 gap-2 text-center text-xs">
              <div>
                <div className="font-medium text-text-primary">{item.coverage_notes}</div>
                <div className="text-text-muted">Notes</div>
              </div>
              <div>
                <div className="font-medium text-text-primary">{item.coverage_summaries}</div>
                <div className="text-text-muted">Summ</div>
              </div>
              <div>
                <div className="font-medium text-text-primary">{item.coverage_faq}</div>
                <div className="text-text-muted">FAQ</div>
              </div>
              <div>
                <div className="font-medium text-text-primary">{item.coverage_quizzes}</div>
                <div className="text-text-muted">Quiz</div>
              </div>
              <div>
                <div className="font-medium text-text-primary">{item.coverage_drills}</div>
                <div className="text-text-muted">Drill</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Usage Analytics Tab
// ─────────────────────────────────────────────

function AnalyticsTab() {
  const [stats] = useState<{
    total_requests: number;
    pregen_hit_rate: number;
    cache_hit_rate: number;
    cost_savings_inr: number;
    subject_breakdown: Array<{ subject: string; requests: number; percentage: number }>;
  }>({
    total_requests: 0,
    pregen_hit_rate: 0,
    cache_hit_rate: 0,
    cost_savings_inr: 0,
    subject_breakdown: [],
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-text-primary">Usage Analytics</h2>
        <p className="text-sm text-text-secondary">Pre-generated content usage statistics</p>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-border bg-surface-1 p-4">
          <p className="text-sm text-text-secondary">Total Requests</p>
          <p className="mt-1 text-2xl font-bold text-text-primary">
            {stats.total_requests.toLocaleString()}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-surface-1 p-4">
          <p className="text-sm text-text-secondary">Pre-gen Hit Rate</p>
          <p className="mt-1 text-2xl font-bold text-success">{stats.pregen_hit_rate}%</p>
        </div>
        <div className="rounded-lg border border-border bg-surface-1 p-4">
          <p className="text-sm text-text-secondary">Cache Hit Rate</p>
          <p className="mt-1 text-2xl font-bold text-info">{stats.cache_hit_rate}%</p>
        </div>
        <div className="rounded-lg border border-border bg-surface-1 p-4">
          <p className="text-sm text-text-secondary">Cost Savings</p>
          <p className="mt-1 text-2xl font-bold text-warning">
            {new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(stats.cost_savings_inr)}
          </p>
        </div>
      </div>

      {/* Subject Breakdown */}
      <div className="rounded-lg border border-border bg-surface-1 p-4">
        <h3 className="font-medium text-text-primary">Subject-wise Usage</h3>
        <div className="mt-4 space-y-3">
          {stats.subject_breakdown.length === 0 ? (
            <p className="text-sm text-text-muted">No usage data yet</p>
          ) : (
            stats.subject_breakdown.slice(0, 6).map((item) => (
              <div key={item.subject} className="flex items-center gap-4">
                <div className="w-32 text-sm text-text-secondary">{item.subject}</div>
                <div className="flex-1">
                  <div className="h-2 w-full overflow-hidden rounded-full bg-surface-2">
                    <div
                      className="h-full rounded-full bg-brand transition-all"
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                </div>
                <div className="w-16 text-right text-sm font-medium text-text-primary">
                  {item.percentage}%
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Cost Savings Info */}
      <div className="rounded-lg border border-success/30 bg-success-bg p-4">
        <div className="flex items-start gap-3">
          <Zap className="h-5 w-5 text-success" />
          <div>
            <p className="font-medium text-text-primary">Pre-generation Impact</p>
            <p className="mt-1 text-sm text-text-secondary">
              By pre-generating FAQ content, we avoid live API calls for ~85% of queries,
              resulting in significant cost savings while maintaining fast response times.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Archived Tab
// ─────────────────────────────────────────────

function ArchivedTab() {
  const [books] = useState<Array<{
    id: string;
    title: string;
    grade: number;
    subject: string;
    type: string;
    deleted_at: string;
    version_history: Array<{ version: number; uploaded_at: string; replaced_by: string | null }>;
  }>>([]);
  const [loading] = useState(false);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-text-primary">Archived Books</h2>
        <p className="text-sm text-text-secondary">Replaced and removed book editions</p>
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-text-muted" />
          </div>
        ) : books.length === 0 ? (
          <div className="rounded-lg border border-border bg-surface-1 p-12 text-center">
            <Archive className="mx-auto h-12 w-12 text-text-muted" />
            <p className="mt-2 font-medium text-text-primary">No archived books</p>
            <p className="text-sm text-text-secondary">Archived books will appear here</p>
          </div>
        ) : (
          books.map((book) => (
            <div key={book.id} className="rounded-lg border border-border bg-surface-1 p-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex-1">
                  <p className="font-medium text-text-primary">{book.title}</p>
                  <div className="mt-1 flex items-center gap-3 text-sm text-text-secondary">
                    <span>Class {book.grade}</span>
                    <span>{book.subject}</span>
                    <span>{book.type}</span>
                  </div>
                  <p className="mt-1 text-xs text-text-muted">
                    Archived on {formatDateIST(book.deleted_at)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button className="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-surface-2 px-3 text-sm font-medium text-text-primary hover:bg-surface-3">
                    <RefreshCw className="h-4 w-4" />
                    Restore
                  </button>
                </div>
              </div>
              {book.version_history.length > 1 && (
                <div className="mt-3 rounded-md bg-surface-2 p-3">
                  <p className="text-xs font-medium text-text-secondary">Version History</p>
                  <div className="mt-2 space-y-1">
                    {book.version_history.map((v, i) => (
                      <div key={i} className="flex items-center justify-between text-xs text-text-muted">
                        <span>v{v.version}</span>
                        <span>{formatDateIST(v.uploaded_at)}</span>
                        {v.replaced_by && <span className="text-success">Replaced</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Main Page Component
// ─────────────────────────────────────────────

export default function ContentPage() {
  const [activeTab, setActiveTab] = useState<Tab>("library");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-text-primary">Content Pipeline</h1>
        <p className="text-sm text-text-secondary">
          Manage master books, processing, pre-generation, and content coverage
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 overflow-x-auto border-b border-border pb-1">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`inline-flex items-center gap-2 whitespace-nowrap rounded-t-md px-4 py-2.5 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? "border-b-2 border-brand bg-surface-1 text-brand"
                : "text-text-secondary hover:text-text-primary hover:bg-surface-1"
            }`}
          >
            {tab.icon}
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {activeTab === "library" && <LibraryTab />}
        {activeTab === "upload" && <UploadTab />}
        {activeTab === "processing" && <ProcessingTab />}
        {activeTab === "pregen" && <PregenTab />}
        {activeTab === "coverage" && <CoverageTab />}
        {activeTab === "analytics" && <AnalyticsTab />}
        {activeTab === "archived" && <ArchivedTab />}
      </div>
    </div>
  );
}
