import { connectDB } from '@shared/lib/db/mongoose';
import User from '@shared/data/models/User';
import { hashPassword, verifyPassword, generateOtp, generatePassword } from '@shared/lib/auth/password';
import mailService from '@shared/mail/mail.service';

export async function registerUser({ name, email }) {
  await connectDB();
  const existing = await User.findOne({ email });
  if (existing?.emailVerified) {
    throw new Error('Email already registered');
  }

  const otp = generateOtp();
  const otpHash = await hashPassword(otp);
  const otpExpiresAt = new Date(Date.now() + 15 * 60 * 1000);

  if (existing) {
    existing.name = name;
    existing.otpHash = otpHash;
    existing.otpExpiresAt = otpExpiresAt;
    await existing.save();
  } else {
    const crypto = await import('crypto');
    await User.create({
      name,
      email,
      passwordHash: await hashPassword(crypto.randomBytes(32).toString('hex')),
      otpHash,
      otpExpiresAt,
      emailVerified: false,
    });
  }

  await mailService.sendOtpVerification({ to: email, name, otp, expiresInMinutes: 15 });

  return { message: 'OTP sent to email' };
}

export async function verifyOtpAndSendPassword({ email, otp }) {
  await connectDB();
  const user = await User.findOne({ email });
  if (!user || !user.otpHash) throw new Error('Invalid verification request');
  if (user.otpExpiresAt < new Date()) throw new Error('OTP expired');

  const valid = await verifyPassword(otp, user.otpHash);
  if (!valid) throw new Error('Invalid OTP');

  const defaultPassword = generatePassword();
  user.passwordHash = await hashPassword(defaultPassword);
  user.emailVerified = true;
  user.mustResetPassword = true;
  user.otpHash = null;
  user.otpExpiresAt = null;
  await user.save();

  await mailService.sendDefaultPassword({
    to: email,
    name: user.name,
    password: defaultPassword,
  });

  await mailService.sendAccountCreated({
    to: email,
    name: user.name,
    email,
  });

  return { message: 'Account verified. Password sent to email.' };
}
