export function fmtINR(n: number): string {
  if (n >= 1_00_00_000) return `₹${(n / 1_00_00_000).toFixed(2)} Cr`;
  if (n >= 1_00_000)    return `₹${(n / 1_00_000).toFixed(2)} L`;
  return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

// For Commercials section: always show the full rupee amount (no Lacs/Cr, no decimals)
export function fmtINRFull(n: number): string {
  const rounded = Math.round(n);
  return `₹${rounded.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}
