"use client";
import { useRef, useState, useCallback } from "react";

interface FileDropzoneProps {
  label: string;
  accept?: string;
  required?: boolean;
  onFile: (file: File) => void;
  error?: string;
  value?: File | null;
}

export function FileDropzone({ label, accept = "image/*,application/pdf", required, onFile, error, value }: FileDropzoneProps) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) onFile(file);
  }, [onFile]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onFile(file);
  };

  const borderColor = error ? "#C62828" : value ? "#2E7D32" : dragging ? "#00838F" : "#CFD8DC";
  const bgColor = dragging ? "#E0F2F1" : value ? "#F1F8F1" : "#FAFAFA";

  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-[#212121]">
        {label}
        {required && <span className="text-[#C62828] ml-1">*</span>}
      </label>
      <div
        className="border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all duration-150"
        style={{ borderColor, background: bgColor }}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={handleChange}
        />
        {value ? (
          <div className="flex flex-col items-center gap-1">
            <span className="text-2xl">✅</span>
            <span className="text-sm font-medium text-[#2E7D32]">{value.name}</span>
            <span className="text-xs text-[#546E7A]">{(value.size / 1024).toFixed(0)} KB — click to replace</span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <span className="text-3xl text-[#CFD8DC]">📎</span>
            <p className="text-sm text-[#546E7A]">
              <span className="font-medium text-[#00838F]">Click to upload</span> or drag & drop
            </p>
            <p className="text-xs text-[#546E7A]">PDF, JPG, PNG up to 10MB</p>
          </div>
        )}
      </div>
      {error && <p className="text-xs text-[#C62828]">{error}</p>}
    </div>
  );
}
