// Accepts a raw token or a full ticket URL (what the QR code contains) and returns the token.
export function extractToken(input: string) {
  const s = input.trim();
  const m = s.match(/\/ticket\/([a-f0-9]{20,64})/i);
  const token = (m ? m[1] : s).toLowerCase();
  return /^[a-f0-9]{20,64}$/.test(token) ? token : null;
}
