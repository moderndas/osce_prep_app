import { useRouter } from 'next/router';
import { useClerk } from '@clerk/nextjs';
import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function AdminDashboardLayout({ children }) {
  const router = useRouter();
  const { signOut } = useClerk();
  const [pageInfo, setPageInfo] = useState({ title: 'Admin Dashboard', subtitle: 'Manage your OSCE Prep application.' });
  
  // Update page title and subtitle based on current route
  useEffect(() => {
    const path = router.pathname;
    
    if (path.includes('/admin/stations')) {
      setPageInfo({ 
        title: 'Stations Management', 
        subtitle: 'Manage all OSCE stations for users.' 
      });
    } else if (path.includes('/admin/users')) {
      setPageInfo({ 
        title: 'User Management', 
        subtitle: 'Manage user accounts and permissions.' 
      });
    } else if (path.includes('/admin/settings')) {
      setPageInfo({ 
        title: 'Admin Settings', 
        subtitle: 'Configure application settings.' 
      });
    } else {
      setPageInfo({ 
        title: 'Admin Dashboard', 
        subtitle: 'Manage your OSCE Prep application.' 
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
          <span className="text-primary">OSCE</span> Help
        </div>
        
        {/* Navigation Links */}
        <nav className="flex-1 mt-6">
          <Link href="/admin" className={`flex items-center px-6 py-3 ${router.pathname === '/admin' ? 'bg-[#2A3042] border-l-4 border-primary' : 'hover:bg-[#2A3042] hover:border-l-4 hover:border-primary/50'}`}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
            </svg>
            <span>Home</span>
          </Link>
          
          <Link href="/admin/stations" className={`flex items-center px-6 py-3 ${router.pathname.includes('/admin/stations') ? 'bg-[#2A3042] border-l-4 border-primary' : 'hover:bg-[#2A3042] hover:border-l-4 hover:border-primary/50'}`}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" viewBox="0 0 20 20" fill="currentColor">
              <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" />
            </svg>
            <span>Stations</span>
          </Link>
          
          <Link href="/admin/users" className={`flex items-center px-6 py-3 ${router.pathname.includes('/admin/users') ? 'bg-[#2A3042] border-l-4 border-primary' : 'hover:bg-[#2A3042] hover:border-l-4 hover:border-primary/50'}`}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" viewBox="0 0 20 20" fill="currentColor">
              <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
            </svg>
            <span>Users</span>
          </Link>
          
          <Link href="/admin/settings" className={`flex items-center px-6 py-3 ${router.pathname.includes('/admin/settings') ? 'bg-[#2A3042] border-l-4 border-primary' : 'hover:bg-[#2A3042] hover:border-l-4 hover:border-primary/50'}`}>
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
            <h2 className="text-3xl font-bold mb-4">{pageInfo.title}</h2>
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