const RULES = [
  { key: 'minLength', label: 'At least 8 characters', test: (p) => p.length >= 8 },
  { key: 'uppercase', label: 'One uppercase letter', test: (p) => /[A-Z]/.test(p) },
  { key: 'lowercase', label: 'One lowercase letter', test: (p) => /[a-z]/.test(p) },
  { key: 'number', label: 'One number', test: (p) => /\d/.test(p) },
  { key: 'special', label: 'One special character', test: (p) => /[^A-Za-z0-9]/.test(p) },
];

export const PASSWORD_RULE_LABELS = RULES.map((r) => r.label);

export function getPasswordChecks(password = '') {
  return RULES.reduce((acc, rule) => {
    acc[rule.key] = rule.test(password);
    return acc;
  }, {});
}

export function validateNewPassword(password = '') {
  const checks = getPasswordChecks(password);
  const allMet = RULES.every((rule) => checks[rule.key]);
  return {
    checks,
    rules: RULES.map((rule) => ({ ...rule, met: checks[rule.key] })),
    isValid: allMet,
  };
}

export function getPasswordStrength(password = '') {
  const { checks, rules, isValid } = validateNewPassword(password);
  const length = password.length;
  const metCount = Object.values(checks).filter(Boolean).length;

  let level = 'weak';
  let percent = 20;
  let label = 'Weak';

  if (isValid && length >= 12) {
    level = 'excellent';
    percent = 100;
    label = 'Excellent';
  } else if (isValid) {
    level = 'good';
    percent = 80;
    label = 'Good';
  } else if (metCount >= 3) {
    level = 'fair';
    percent = 55;
    label = 'Fair';
  }

  return { level, percent, label, checks, rules, isValid };
}

export const STRENGTH_COLORS = {
  weak: '#ff4d4f',
  fair: '#faad14',
  good: '#52c41a',
  excellent: '#1677ff',
};
