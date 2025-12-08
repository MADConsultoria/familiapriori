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

const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
export function formatBRL(value) {
  const num = Number(value);
  return currency.format(Number.isFinite(num) ? num : 0);
}

export function normalizeCPF(value) {
  return String(value || '').replace(/\D+/g, '').slice(0, 11);
}
