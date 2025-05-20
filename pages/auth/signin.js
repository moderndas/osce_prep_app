import { useState } from 'react';
import { signIn, getSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Head from 'next/head';

export default function SignIn() {
  const router = useRouter();
  const [credentials, setCredentials] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const result = await signIn('credentials', {
      redirect: false,
      email: credentials.email,
      password: credentials.password
    });

    if (result.error) {
      setError(result.error);
    } else {
      // Get the session to check the user role
      const session = await getSession();
      
      // Redirect based on role
      if (session?.user?.role === 'admin') {
        router.push('/admin');
    } else {
      router.push('/dashboard');
      }
    }
  };

  return (
    <>
      <Head>
        <title>Sign In - OSCE Prep</title>
      </Head>
      <div className="min-h-screen flex items-center justify-center bg-background py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Welcome back
            </h1>
            <p className="text-muted-foreground">
              Sign in to your OSCE Prep account
            </p>
          </div>
          
          <div className="bg-card shadow-lg rounded-lg p-8">
            <form className="space-y-6" onSubmit={handleSubmit}>
              {error && (
                <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded-md">
                  {error}
                </div>
              )}
              
              <div className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-foreground mb-1">
                    Email address
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    className="appearance-none block w-full px-3 py-2 border border-input rounded-md shadow-sm placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary bg-card"
                    placeholder="you@example.com"
                    value={credentials.email}
                    onChange={(e) => setCredentials({...credentials, email: e.target.value})}
                  />
                </div>
                
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-foreground mb-1">
                    Password
                  </label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    className="appearance-none block w-full px-3 py-2 border border-input rounded-md shadow-sm placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary bg-card"
                    placeholder="••••••••"
                    value={credentials.password}
                    onChange={(e) => setCredentials({...credentials, password: e.target.value})}
                  />
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  className="btn btn-primary w-full"
                >
                  Sign in
                </button>
              </div>
            </form>
          </div>
          
          <div className="text-center mt-6">
            <Link href="/auth/signup" className="text-primary hover:text-primary/80 font-medium">
              Don't have an account? Sign up
            </Link>
          </div>
        </div>
      </div>
    </>
  );
} 