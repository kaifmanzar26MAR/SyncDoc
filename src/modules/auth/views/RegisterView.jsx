'use client';

import { useState } from 'react';
import { Form, Input, Button, Card, Typography, Steps, message, Alert, Result } from 'antd';
import { MailOutlined } from '@ant-design/icons';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { registerUser, verifyOtp } from '@auth-module/data/service/AuthApis';

export default function RegisterView() {
  const router = useRouter();
  const { callbackUrl } = router.query;
  const loginHref =
    typeof callbackUrl === 'string'
      ? `/login?callbackUrl=${encodeURIComponent(callbackUrl)}`
      : '/login';
  const [step, setStep] = useState(0);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const register = async (values) => {
    setLoading(true);
    try {
      await registerUser(values);
      setEmail(values.email);
      setStep(1);
      message.success('OTP sent to your email');
    } catch (err) {
      message.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const verifyOtpHandler = async (values) => {
    setLoading(true);
    try {
      await verifyOtp({ email, otp: values.otp });
      setStep(2);
      message.success('Registration complete');
    } catch (err) {
      message.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-white p-4">
      <Card className="w-full max-w-md shadow-lg">
        <Typography.Title level={2} className="!mb-1 text-center">Create Account</Typography.Title>
        <Steps current={step} size="small" className="mb-6" items={[{ title: 'Register' }, { title: 'Verify' }, { title: 'Done' }]} />

        {step === 0 && (
          <Form layout="vertical" onFinish={register}>
            <Form.Item name="name" label="Full Name" rules={[{ required: true, min: 2 }]}>
              <Input size="large" />
            </Form.Item>
            <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}>
              <Input size="large" />
            </Form.Item>
            <Button type="primary" htmlType="submit" size="large" block loading={loading}>
              Send OTP
            </Button>
          </Form>
        )}

        {step === 1 && (
          <Form layout="vertical" onFinish={verifyOtpHandler}>
            <Typography.Paragraph type="secondary">
              Enter the 6-digit code sent to {email}
            </Typography.Paragraph>
            <Form.Item name="otp" label="OTP" rules={[{ required: true, len: 6 }]}>
              <Input size="large" maxLength={6} />
            </Form.Item>
            <Button type="primary" htmlType="submit" size="large" block loading={loading}>
              Verify
            </Button>
          </Form>
        )}

        {step === 2 && (
          <div className="py-2">
            <Result
              status="success"
              title="Registration successful"
              subTitle="Your login credentials have been sent to your email."
            />
            <Alert
              type="success"
              showIcon
              icon={<MailOutlined />}
              message="Check your inbox"
              description={
                <>
                  We sent your default password and account details to{' '}
                  <Typography.Text strong>{email}</Typography.Text>. Sign in with that password, then you will be
                  prompted to set a new secure password.
                </>
              }
              className="mb-6"
            />
            <Link href={loginHref}>
              <Button type="primary" size="large" block>
                Go to Login
              </Button>
            </Link>
          </div>
        )}

        {step < 2 && (
          <div className="text-center mt-4 text-sm">
            Have an account? <Link href={loginHref} className="text-indigo-600">Sign in</Link>
          </div>
        )}
      </Card>
    </div>
  );
}
