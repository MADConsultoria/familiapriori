export function formatCPF(value) {
  const digits = String(value || '').replace(/\D+/g, '');
  return digits.length === 11
    ? digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
    : digits;
}

export function formatPhone(value) {
  const digits = String(value || '').replace(/\D+/g, '');
  if (digits.length === 11) return digits.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  if (digits.length === 10) return digits.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  return digits || '-';
}

export function formatBirthDateInput(value) {
  const digits = String(value || '').replace(/\D+/g, '').slice(0, 8);
  const len = digits.length;
  if (len <= 2) return digits;
  if (len <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

export function isValidBirthDate(value) {
  const digits = String(value || '').replace(/\D+/g, '');
  if (digits.length !== 8) return false;
  const day = Number(digits.slice(0, 2));
  const month = Number(digits.slice(2, 4));
  const year = Number(digits.slice(4));
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  const parsed = new Date(year, month - 1, day);
  if (Number.isNaN(parsed.getTime())) return false;
  if (
    parsed.getDate() !== day ||
    parsed.getMonth() !== month - 1 ||
    parsed.getFullYear() !== year
  ) {
    return false;
  }
  const today = new Date();
  if (parsed > today) return false;
  return true;
}

const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
export function formatBRL(value) {
  const num = Number(value);
  return currency.format(Number.isFinite(num) ? num : 0);
}

export function normalizeCPF(value) {
  return String(value || '').replace(/\D+/g, '').slice(0, 11);
}
