import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import UserDashboardLayout from '../../components/UserDashboardLayout';

export default function SettingsPage() {
  const { user, isLoaded, isSignedIn } = useUser();
  const router = useRouter();
  
  const [formData, setFormData] = useState({
    name: '',
    email: ''
  });

  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Update formData when user is loaded
  useEffect(() => {
    if (user) {
      setFormData(prevData => ({
        ...prevData,
        name: user.fullName || user.firstName || '',
        email: user.primaryEmailAddress?.emailAddress || ''
      }));
    }
  }, [user]);

  // Protect the route
  if (isLoaded && !isSignedIn) {
    router.push('/auth/signin');
    return null;
  }

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <span className="loading loading-spinner loading-lg text-primary"></span>
          <div className="text-xl text-foreground">Loading...</div>
        </div>
      </div>
    );
  }

  // Handle input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  // Toggle editing mode
  const toggleEditing = () => {
    setIsEditing(!isEditing);
    if (isEditing) {
      // Reset form data to original values if canceling edit
      setFormData(prevData => ({
        ...prevData,
        name: user?.fullName || user?.firstName || '',
        email: user?.primaryEmailAddress?.emailAddress || ''
      }));
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage({ type: '', text: '' });

    try {
      // Make a real API call to update user information
      const response = await fetch('/api/user/update', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Ensure Clerk cookies are sent
        body: JSON.stringify({
          name: formData.name,
          email: formData.email
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to update settings');
      }
      
      setMessage({ 
        type: 'success', 
        text: 'Settings updated successfully!'
      });
      
      // Disable editing mode after successful save
      setIsEditing(false);
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error.message || 'Failed to update settings'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <UserDashboardLayout>
      <div className="mb-6">
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-semibold tracking-tight text-foreground mb-4">Settings</h2>
        <p className="text-muted-foreground">Configure your account settings.</p>
      </div>
      
      {message.text && (
        <div className={`alert ${message.type === 'success' ? 'alert-success' : 'alert-error'} mb-6`}>
          <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
            {message.type === 'success' ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            )}
          </svg>
          <span>{message.text}</span>
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 gap-8">
          {/* Profile Settings Section */}
          <div className="bg-white border border-border rounded-lg shadow-sm">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl sm:text-2xl font-semibold leading-none tracking-tight text-foreground mb-4">Profile Settings</h3>
                <button 
                  type="button"
                  onClick={toggleEditing}
                  className={`btn ${isEditing ? 'btn-outline btn-error' : 'btn-outline'}`}
                >
                  {isEditing ? 'Cancel' : 'Edit Profile'}
                </button>
              </div>
              
              <div className="form-control w-full mb-4">
                <label className="label">
                  <span className="label-text text-foreground">Full Name</span>
                </label>
                <input 
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="input input-bordered w-full bg-card"
                  placeholder="Full Name"
                  disabled={!isEditing}
                />
              </div>
              
              <div className="form-control w-full mb-4">
                <label className="label">
                  <span className="label-text text-foreground">Email</span>
                </label>
                <input 
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="input input-bordered w-full bg-card"
                  placeholder="Your email"
                  disabled={!isEditing}
                />
                <label className="label">
                  <span className="label-text-alt text-muted-foreground">Enter a valid email address</span>
                </label>
              </div>
            </div>
          </div>
          
          {/* Submit Button */}
          <div className="flex justify-end">
            <button 
              type="submit" 
              className={`btn btn-primary px-8 ${isSubmitting ? 'loading' : ''}`}
              disabled={isSubmitting || !isEditing}
            >
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </form>
    </UserDashboardLayout>
  );
} 