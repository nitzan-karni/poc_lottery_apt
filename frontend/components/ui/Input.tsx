"use client";
import React from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export function Input({ label, error, hint, className = "", id, ...props }: InputProps) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-[#212121]">
          {label}
          {props.required && <span className="text-[#C62828] ml-1">*</span>}
        </label>
      )}
      <input
        id={inputId}
        className={`border rounded-lg px-3 py-2 text-sm text-[#212121] bg-white outline-none transition-colors
          border-[#CFD8DC] focus:border-[#00838F] focus:ring-2 focus:ring-[#00838F]/20
          disabled:bg-[#F5F7FA] disabled:cursor-not-allowed
          ${error ? "border-[#C62828]" : ""}
          ${className}`}
        {...props}
      />
      {error && <p className="text-xs text-[#C62828]">{error}</p>}
      {hint && !error && <p className="text-xs text-[#546E7A]">{hint}</p>}
    </div>
  );
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
  placeholder?: string;
}

export function Select({ label, error, options, placeholder, className = "", id, ...props }: SelectProps) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-[#212121]">
          {label}
          {props.required && <span className="text-[#C62828] ml-1">*</span>}
        </label>
      )}
      <select
        id={inputId}
        className={`border rounded-lg px-3 py-2 text-sm text-[#212121] bg-white outline-none transition-colors
          border-[#CFD8DC] focus:border-[#00838F] focus:ring-2 focus:ring-[#00838F]/20
          ${error ? "border-[#C62828]" : ""}
          ${className}`}
        {...props}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      {error && <p className="text-xs text-[#C62828]">{error}</p>}
    </div>
  );
}
