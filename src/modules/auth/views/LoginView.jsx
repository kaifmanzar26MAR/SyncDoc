'use client';

import { useState } from 'react';
import { Form, Input, Button, Card, Typography, Steps, message, Alert } from 'antd';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/router';
import Link from 'next/link';

export default function LoginView() {
  const router = useRouter();
  const { callbackUrl } = router.query;
  const [loading, setLoading] = useState(false);
  const [mustReset, setMustReset] = useState(false);
  const [form] = Form.useForm();

  const redirectTo = typeof callbackUrl === 'string' ? callbackUrl : '/dashboard';

  const onFinish = async (values) => {
    setLoading(true);
    try {
      const result = await signIn('credentials', {
        email: values.email,
        password: values.password,
        newPassword: values.newPassword,
        redirect: false,
      });

      if (result?.error) {
        message.error('Invalid credentials');
        return;
      }

      router.push(redirectTo);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-white p-4">
      <Card className="w-full max-w-md shadow-lg">
        <Typography.Title level={2} className="!mb-1 text-center">SyncDoc</Typography.Title>
        <Typography.Paragraph type="secondary" className="text-center mb-6">
          Local-first collaborative documents
        </Typography.Paragraph>

        {mustReset && (
          <Alert
            type="info"
            message="Please set a new password on first login"
            className="mb-4"
            showIcon
          />
        )}

        <Form form={form} layout="vertical" onFinish={onFinish} onValuesChange={(_, all) => setMustReset(!!all.newPassword)}>
          <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}>
            <Input size="large" placeholder="you@company.com" />
          </Form.Item>
          <Form.Item name="password" label="Password" rules={[{ required: true }]}>
            <Input.Password size="large" />
          </Form.Item>
          <Form.Item name="newPassword" label="New Password (first login)" rules={[{ min: 8 }]}>
            <Input.Password size="large" placeholder="Min 8 characters" />
          </Form.Item>
          <Button type="primary" htmlType="submit" size="large" block loading={loading}>
            Sign in
          </Button>
        </Form>

        <div className="text-center mt-4 text-sm">
          No account? <Link href={typeof callbackUrl === 'string' ? `/register?callbackUrl=${encodeURIComponent(callbackUrl)}` : '/register'} className="text-indigo-600">Register</Link>
        </div>
      </Card>
    </div>
  );
}
