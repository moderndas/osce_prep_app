import { useRouter } from 'next/router';
import { useClerk } from '@clerk/nextjs';
import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function UserDashboardLayout({ children }) {
  const router = useRouter();
  const { signOut } = useClerk();
  const [pageInfo, setPageInfo] = useState({ title: 'Dashboard', subtitle: 'Welcome to your OSCE prep dashboard.' });
  
  // Update page title and subtitle based on current route
  useEffect(() => {
    const path = router.pathname;
    
    if (path.includes('/dashboard/stations')) {
      setPageInfo({ 
        title: 'OSCE Stations', 
        subtitle: 'Practice with our collection of OSCE stations.' 
      });
    } else if (path.includes('/dashboard/faq')) {
      setPageInfo({ 
        title: 'FAQ', 
        subtitle: 'Frequently asked questions about OSCE preparation.' 
      });
    } else if (path.includes('/dashboard/settings')) {
      setPageInfo({ 
        title: 'Settings', 
        subtitle: 'Configure your account settings.' 
      });
    } else if (path.includes('/dashboard/subscription')) {
      setPageInfo({ 
        title: 'Subscription', 
        subtitle: 'Manage your subscription plan.' 
      });
    } else {
      setPageInfo({ 
        title: 'Dashboard', 
        subtitle: 'Welcome to your OSCE prep dashboard.' 
      });
    }
  }, [router.pathname]);
  
  const handleSignOut = () => {
    signOut(() => {
      router.push('/');
    });
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <div className="w-64 bg-[#1A1F2C] text-white flex flex-col">
        {/* Logo */}
        <div className="p-6 text-xl font-bold">
          <span className="text-primary">OSCE</span> Prep
        </div>
        
        {/* Navigation Links */}
        <nav className="flex-1 mt-6">
          <Link href="/dashboard" className={`flex items-center px-6 py-3 ${router.pathname === '/dashboard' ? 'bg-[#2A3042] border-l-4 border-primary' : 'hover:bg-[#2A3042] hover:border-l-4 hover:border-primary/50'}`}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
            </svg>
            <span>Home</span>
          </Link>
          
          <Link href="/dashboard/stations" className={`flex items-center px-6 py-3 ${router.pathname.includes('/dashboard/stations') ? 'bg-[#2A3042] border-l-4 border-primary' : 'hover:bg-[#2A3042] hover:border-l-4 hover:border-primary/50'}`}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" viewBox="0 0 20 20" fill="currentColor">
              <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" />
            </svg>
            <span>OSCE Stations</span>
          </Link>
          
          <Link href="/dashboard/faq" className={`flex items-center px-6 py-3 ${router.pathname.includes('/dashboard/faq') ? 'bg-[#2A3042] border-l-4 border-primary' : 'hover:bg-[#2A3042] hover:border-l-4 hover:border-primary/50'}`}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
            </svg>
            <span>FAQ</span>
          </Link>
          
          <Link href="/dashboard/subscription" className={`flex items-center px-6 py-3 ${router.pathname.includes('/dashboard/subscription') ? 'bg-[#2A3042] border-l-4 border-primary' : 'hover:bg-[#2A3042] hover:border-l-4 hover:border-primary/50'}`}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5 2a2 2 0 00-2 2v14l3.5-2 3.5 2 3.5-2 3.5 2V4a2 2 0 00-2-2H5zm4.707 3.707a1 1 0 00-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L8.414 9H10a3 3 0 013 3v1a1 1 0 102 0v-1a5 5 0 00-5-5H8.414l1.293-1.293z" clipRule="evenodd" />
            </svg>
            <span>Subscription</span>
          </Link>
          
          <Link href="/dashboard/settings" className={`flex items-center px-6 py-3 ${router.pathname.includes('/dashboard/settings') ? 'bg-[#2A3042] border-l-4 border-primary' : 'hover:bg-[#2A3042] hover:border-l-4 hover:border-primary/50'}`}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
            </svg>
            <span>Settings</span>
          </Link>
        </nav>
      </div>
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-secondary/50 border-b border-border flex justify-between items-center p-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">{pageInfo.title}</h1>
            <p className="text-muted-foreground">{pageInfo.subtitle}</p>
          </div>
          <button 
            onClick={handleSignOut}
            className="btn btn-outline"
          >
            Logout
          </button>
        </header>
        
        {/* Main content */}
        <main className="flex-1 overflow-y-auto p-6 bg-background">
          {children}
        </main>
      </div>
    </div>
  );
} 