'use client';

import { Input, Progress, Typography } from 'antd';
import { CheckCircleFilled, CloseCircleFilled } from '@ant-design/icons';
import {
  getPasswordStrength,
  STRENGTH_COLORS,
} from '@shared/utils/password-strength';

export default function PasswordStrengthField({ value = '', onChange, placeholder = 'Enter new password' }) {
  const strength = getPasswordStrength(value);

  return (
    <div className="space-y-3">
      <Input.Password
        size="large"
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
      />

      {value ? (
        <>
          <div className="flex items-center gap-3">
            <Progress
              percent={strength.percent}
              showInfo={false}
              strokeColor={STRENGTH_COLORS[strength.level]}
              className="!mb-0 flex-1"
            />
            <Typography.Text
              strong
              style={{ color: STRENGTH_COLORS[strength.level], minWidth: 72, textAlign: 'right' }}
            >
              {strength.label}
            </Typography.Text>
          </div>

          <ul className="m-0 list-none space-y-1 p-0">
            {strength.rules.map((rule) => (
              <li key={rule.key} className="flex items-center gap-2 text-sm">
                {rule.met ? (
                  <CheckCircleFilled className="text-[#52c41a]" />
                ) : (
                  <CloseCircleFilled className="text-[#ff4d4f]" />
                )}
                <span className={rule.met ? 'text-[#52c41a]' : 'text-gray-500'}>{rule.label}</span>
              </li>
            ))}
            <li className="flex items-center gap-2 text-sm">
              {value.length >= 12 && strength.isValid ? (
                <CheckCircleFilled className="text-[#1677ff]" />
              ) : (
                <CloseCircleFilled className="text-gray-400" />
              )}
              <span className={value.length >= 12 && strength.isValid ? 'text-[#1677ff]' : 'text-gray-500'}>
                12+ characters for excellent strength
              </span>
            </li>
          </ul>
        </>
      ) : null}
    </div>
  );
}

export function passwordStrengthValidator(_, value) {
  if (!value) return Promise.resolve();
  const { isValid } = getPasswordStrength(value);
  if (isValid) return Promise.resolve();
  return Promise.reject(new Error('Password does not meet all requirements'));
}
