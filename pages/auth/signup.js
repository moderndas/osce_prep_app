import { SignUp } from '@clerk/nextjs';
import Head from 'next/head';

export default function SignUpPage() {
  return (
    <>
      <Head>
        <title>Create Account - OSCE Prep</title>
      </Head>
      <div className="min-h-screen flex items-center justify-center bg-background py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Create your account
            </h1>
            <p className="text-muted-foreground">
              Join OSCE Prep to improve your clinical skills
            </p>
          </div>
          
          <SignUp 
            routing="hash"
            signInUrl="/auth/signin"
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