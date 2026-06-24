'use client';

import { useState } from 'react';
import { Form, Input, Button, Card, Typography, message, Alert } from 'antd';
import { signIn, getSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import PasswordStrengthField, { passwordStrengthValidator } from '@auth-module/components/PasswordStrengthField';

export default function LoginView() {
  const router = useRouter();
  const { callbackUrl } = router.query;
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState('login');
  const [savedCredentials, setSavedCredentials] = useState({ email: '', password: '' });
  const [loginForm] = Form.useForm();
  const [resetForm] = Form.useForm();

  const redirectTo = typeof callbackUrl === 'string' ? callbackUrl : '/dashboard';

  const onLogin = async (values) => {
    setLoading(true);
    try {
      const result = await signIn('credentials', {
        email: values.email,
        password: values.password,
        redirect: false,
      });

      if (result?.error) {
        message.error('Invalid email or password');
        return;
      }

      const session = await getSession();
      if (session?.user?.mustResetPassword) {
        setSavedCredentials({ email: values.email, password: values.password });
        resetForm.resetFields();
        setStep('reset');
        return;
      }

      message.success('Signed in successfully');
      router.push(redirectTo);
    } finally {
      setLoading(false);
    }
  };

  const onResetPassword = async (values) => {
    setLoading(true);
    try {
      const result = await signIn('credentials', {
        email: savedCredentials.email,
        password: savedCredentials.password,
        newPassword: values.newPassword,
        redirect: false,
      });

      if (result?.error) {
        message.error('Could not update password. Check requirements and try again.');
        return;
      }

      message.success('Password updated successfully');
      router.push(redirectTo);
    } finally {
      setLoading(false);
    }
  };

  const backToLogin = () => {
    setStep('login');
    setSavedCredentials({ email: '', password: '' });
    resetForm.resetFields();
  };

  return (
    <div
      className={` h-screen overflow-y-auto bg-gradient-to-br from-indigo-50 to-white p-4 py-8 ${
        step === 'login' ? 'flex items-center justify-center' : 'flex items-start justify-center'
      }`}
    >
      <Card className="mx-auto w-full max-w-md shadow-lg">
        <Typography.Title level={2} className="!mb-1 text-center">SyncDoc</Typography.Title>
        <Typography.Paragraph type="secondary" className="text-center mb-6">
          Local-first collaborative documents
        </Typography.Paragraph>

        {step === 'login' ? (
          <>
            <Form form={loginForm} layout="vertical" onFinish={onLogin}>
              <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}>
                <Input size="large" placeholder="you@company.com" autoComplete="email" />
              </Form.Item>
              <Form.Item name="password" label="Password" rules={[{ required: true }]}>
                <Input.Password size="large" autoComplete="current-password" />
              </Form.Item>
              <Button type="primary" htmlType="submit" size="large" block loading={loading}>
                Sign in
              </Button>
            </Form>

            <div className="text-center mt-4 text-sm">
              No account?{' '}
              <Link
                href={typeof callbackUrl === 'string' ? `/register?callbackUrl=${encodeURIComponent(callbackUrl)}` : '/register'}
                className="text-indigo-600"
              >
                Register
              </Link>
            </div>
          </>
        ) : (
          <>
            <Alert
              type="info"
              message="Set a new password"
              description="Your account requires a password change before you can continue."
              className="!mb-3"
              showIcon
              styles={{
                root: {
                  backgroundColor: 'var(--color-info-50)',
                  borderColor: '#bfdbfe',
                },
                icon: {
                  color: 'var(--color-info-600)',
                },
                title: {
                  color: 'var(--preset-text-primary)',
                },
                description: {
                  color: 'var(--preset-text-secondary)',
                },
              }}
            />

            <Form form={resetForm} layout="vertical" onFinish={onResetPassword}>
              <Form.Item
                name="newPassword"
                label="New password"
                rules={[{ required: true, message: 'Enter a new password' }, { validator: passwordStrengthValidator }]}
              >
                <PasswordStrengthField /> 
              </Form.Item>

              <Form.Item
                name="confirmPassword"
                label="Confirm password"
                dependencies={['newPassword']}
                className="!mt-3"
                rules={[
                  { required: true, message: 'Confirm your password' },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || getFieldValue('newPassword') === value) {
                        return Promise.resolve();
                      }
                      return Promise.reject(new Error('Passwords do not match'));
                    },
                  }),
                ]}
              >
                <Input.Password size="large" placeholder="Re-enter new password" autoComplete="new-password" />
              </Form.Item>

              <Button type="primary" htmlType="submit" size="large" block loading={loading}>
                Update password
              </Button>
              <Button type="link" block className="!mt-2" onClick={backToLogin} disabled={loading}>
                Back to sign in
              </Button>
            </Form>
          </>
        )}
      </Card>
    </div>
  );
}
