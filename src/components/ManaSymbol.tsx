
import React from "react";

const manaSVGs: Record<string, React.ReactNode> = {
  W: (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none">
      <circle cx="12" cy="12" r="11" fill="#fffbe6" stroke="#c2b280" strokeWidth="2" />
      <path d="M12 7l2 4h-4l2-4zm0 10v-3" stroke="#c2b280" strokeWidth="2" />
    </svg>
  ),
  U: (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none">
      <circle cx="12" cy="12" r="11" fill="#b3d8ff" stroke="#2a5caa" strokeWidth="2" />
      <path d="M12 7c3 0 3 6 0 6s-3 6 0 6" stroke="#2a5caa" strokeWidth="2" />
    </svg>
  ),
  B: (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none">
      <circle cx="12" cy="12" r="11" fill="#d1d1d1" stroke="#222" strokeWidth="2" />
      <path d="M12 7c-2 0-2 6 0 6s2 6 0 6" stroke="#222" strokeWidth="2" />
    </svg>
  ),
  R: (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none">
      <circle cx="12" cy="12" r="11" fill="#ffe5e5" stroke="#b22222" strokeWidth="2" />
      <path d="M12 7l2 4-2 4-2-4 2-4z" stroke="#b22222" strokeWidth="2" />
    </svg>
  ),
  G: (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none">
      <circle cx="12" cy="12" r="11" fill="#e5ffe5" stroke="#228b22" strokeWidth="2" />
      <path d="M12 7l3 6-3 4-3-4 3-6z" stroke="#228b22" strokeWidth="2" />
    </svg>
  ),
  C: (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none">
      <circle cx="12" cy="12" r="11" fill="#e0e0e0" stroke="#888" strokeWidth="2" />
      <text x="12" y="16" textAnchor="middle" fontSize="10" fill="#888">C</text>
    </svg>
  ),
};

export default function ManaSymbol({ symbol }: { symbol: string }) {
  const code = symbol.replace(/[{}]/g, "");
  const isNumeric = /^\d+$/.test(code);
  const baseClasses = "inline-flex items-center justify-center h-6 w-6 mx-0.5";

  if (isNumeric || code === "X") {
    return (
      <span className={`${baseClasses} bg-gray-400 text-gray-900 rounded-full font-bold text-xs`}>{code}</span>
    );
  }
  if (code.includes("/")) {
    return (
      <span className={`${baseClasses} bg-gradient-to-br from-amber-200 to-blue-300 text-gray-900 rounded-full font-bold text-xs`}>{code}</span>
    );
  }
  return (
    <span className={baseClasses}>{manaSVGs[code] || code}</span>
  );
}
