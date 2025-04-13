import { useSession } from 'next-auth/react';
import Link from 'next/link';

export default function Home() {
  const { data: session } = useSession();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8">
        <h1 className="text-4xl font-bold text-center">OSCE Prep App</h1>
        
        <div className="space-y-4">
          {!session ? (
            <>
              <Link href="/auth/signin">
                <div className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 text-center">
                  Sign In
                </div>
              </Link>
              <Link href="/auth/signup">
                <div className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 text-center">
                  Sign Up
                </div>
              </Link>
            </>
          ) : (
            <div className="space-y-4">
              <p className="text-center">Welcome, {session.user.email}</p>
              <Link href="/stations/new">
                <div className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 text-center">
                  Create New Station
                </div>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 