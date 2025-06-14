import { SignIn } from '@clerk/nextjs';
import Head from 'next/head';

export default function SignInPage() {
  return (
    <>
      <Head>
        <title>Sign In - OSCE Help</title>
      </Head>
      <div className="min-h-screen flex items-center justify-center bg-background py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-6">
              Welcome Back
            </h1>
            <p className="text-muted-foreground">
              Sign in to your OSCE Help account
            </p>
          </div>
          
          <SignIn 
            routing="hash"
            signUpUrl="/auth/signup"
            redirectUrl="/dashboard"
            appearance={{
              elements: {
                rootBox: "mx-auto",
                card: "bg-card shadow-lg rounded-lg",
              }
            }}
          />
        </div>
      </div>
    </>
  );
} 