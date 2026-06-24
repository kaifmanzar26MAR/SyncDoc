import bcrypt from 'bcryptjs';
import crypto from 'crypto';

export async function hashPassword(password) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

export function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function generatePassword() {
  return crypto.randomBytes(8).toString('base64url').slice(0, 12);
}
