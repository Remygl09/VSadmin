/**
 * Formats a US phone number as the user types.
 * Output: 646-315-2195 or +1 646-315-2195
 */
export function formatPhoneNumber(value: string): string {
  const hasPlus = value.startsWith('+');
  const digits = value.replace(/\D/g, '');

  if (digits.length === 0) return '';

  if ((hasPlus || digits.length === 11) && digits.startsWith('1')) {
    const d = digits.slice(1);
    if (d.length <= 3) return `+1 ${d}`;
    if (d.length <= 6) return `+1 ${d.slice(0, 3)}-${d.slice(3)}`;
    return `+1 ${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6, 10)}`;
  }

  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  if (digits.length <= 10) return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;

  return value;
}
