/** 26 fixed avatar colors — one per letter A–Z */
export const USER_INITIAL_COLORS = [
  '#e53935', // A
  '#d81b60', // B
  '#8e24aa', // C
  '#5e35b1', // D
  '#3949ab', // E
  '#1e88e5', // F
  '#039be5', // G
  '#00acc1', // H
  '#00897b', // I
  '#43a047', // J
  '#7cb342', // K
  '#c0ca33', // L
  '#fdd835', // M
  '#ffb300', // N
  '#fb8c00', // O
  '#f4511e', // P
  '#6d4c41', // Q
  '#546e7a', // R
  '#455a64', // S
  '#5d4037', // T
  '#c62828', // U
  '#ad1457', // V
  '#6a1b9a', // W
  '#283593', // X
  '#1565c0', // Y
  '#2e7d32', // Z
];

export function getUserInitial(nameOrEmail) {
  const value = (nameOrEmail || '').trim();
  if (!value) return 'A';

  const first = value[0].toUpperCase();
  if (first >= 'A' && first <= 'Z') return first;

  return 'A';
}

export function getUserColorFromInitial(nameOrEmail) {
  const initial = getUserInitial(nameOrEmail);
  const index = initial.charCodeAt(0) - 65;
  return USER_INITIAL_COLORS[index];
}
