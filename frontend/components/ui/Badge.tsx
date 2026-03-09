"use client";
import { STATUS_COLORS, STATUS_LABELS, PRIORITY_LABELS, DOCUMENT_TYPE_LABELS } from "@/lib/constants";

interface BadgeProps {
  type?: string;
  children?: React.ReactNode;
  className?: string;
}

export function Badge({ type = "info", children, className = "" }: BadgeProps) {
  const colors: Record<string, { bg: string; color: string }> = {
    ...STATUS_COLORS,
    verified: { bg: "#E8F5E9", color: "#2E7D32" },
    unverified: { bg: "#FFEBEE", color: "#C62828" },
    priority: { bg: "#FCE4EC", color: "#AD1457" },
    info: { bg: "#E3F2FD", color: "#1565C0" },
    success: { bg: "#E8F5E9", color: "#2E7D32" },
    error: { bg: "#FFEBEE", color: "#C62828" },
    warning: { bg: "#FFF8E1", color: "#F57F17" },
  };
  const c = colors[type] || colors.info;
  return (
    <span
      style={{ background: c.bg, color: c.color }}
      className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap ${className}`}
    >
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  return <Badge type={status}>{STATUS_LABELS[status] || status}</Badge>;
}

export function PriorityBadge({ priority }: { priority: string }) {
  return <Badge type="priority">{PRIORITY_LABELS[priority] || priority}</Badge>;
}
