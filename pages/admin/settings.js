import { useUser } from '@clerk/nextjs';
import { useState } from 'react';
import AdminDashboardLayout from '../../components/AdminDashboardLayout';
import { withAdminAuth } from '../../lib/auth-clerk';

function AdminSettings() {
  const { user, isLoaded } = useUser();
  
  const [formData, setFormData] = useState({
    appSettings: {
      siteName: 'OSCE Prep',
      allowRegistration: true,
      maxStationsPerUser: 5
    },
    emailSettings: {
      sendWelcomeEmail: true,
      notifyAdminOnNewUser: false
    },
    systemSettings: {
      maintenanceMode: false,
      debugMode: false
    }
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Handle input changes
  const handleInputChange = (section, name, value) => {
    setFormData({
      ...formData,
      [section]: {
        ...formData[section],
        [name]: value
      }
    });
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage({ type: '', text: '' });

    try {
      // Simulating an API call - this endpoint would need to be implemented
      await new Promise(resolve => setTimeout(resolve, 1000));
      setMessage({ 
        type: 'success', 
        text: 'Settings updated successfully!'
      });
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
    <AdminDashboardLayout>
      <div className="mb-6">
        <h2 className="text-lg font-medium text-gray-700">System Settings</h2>
        <p className="text-gray-500 mt-1">Configure application-wide settings</p>
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
          {/* Application Settings */}
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h3 className="card-title text-xl mb-4">Application Settings</h3>
              
              <div className="form-control w-full mb-4">
                <label className="label">
                  <span className="label-text">Site Name</span>
                </label>
                <input 
                  type="text"
                  value={formData.appSettings.siteName}
                  onChange={(e) => handleInputChange('appSettings', 'siteName', e.target.value)}
                  className="input input-bordered w-full"
                />
              </div>
              
              <div className="form-control w-full mb-4">
                <label className="label">
                  <span className="label-text">Max Stations Per User</span>
                </label>
                <input 
                  type="number"
                  value={formData.appSettings.maxStationsPerUser}
                  onChange={(e) => handleInputChange('appSettings', 'maxStationsPerUser', parseInt(e.target.value))}
                  className="input input-bordered w-full"
                  min="1"
                  max="100"
                />
              </div>
              
              <div className="form-control">
                <label className="label cursor-pointer justify-start gap-4">
                  <input 
                    type="checkbox" 
                    checked={formData.appSettings.allowRegistration}
                    onChange={(e) => handleInputChange('appSettings', 'allowRegistration', e.target.checked)}
                    className="checkbox" 
                  />
                  <span className="label-text">Allow New User Registration</span>
                </label>
              </div>
            </div>
          </div>
          
          {/* Email Settings */}
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h3 className="card-title text-xl mb-4">Email Notifications</h3>
              
              <div className="form-control">
                <label className="label cursor-pointer justify-start gap-4">
                  <input 
                    type="checkbox" 
                    checked={formData.emailSettings.sendWelcomeEmail}
                    onChange={(e) => handleInputChange('emailSettings', 'sendWelcomeEmail', e.target.checked)}
                    className="checkbox" 
                  />
                  <span className="label-text">Send Welcome Email to New Users</span>
                </label>
              </div>
              
              <div className="form-control">
                <label className="label cursor-pointer justify-start gap-4">
                  <input 
                    type="checkbox" 
                    checked={formData.emailSettings.notifyAdminOnNewUser}
                    onChange={(e) => handleInputChange('emailSettings', 'notifyAdminOnNewUser', e.target.checked)}
                    className="checkbox" 
                  />
                  <span className="label-text">Notify Admin When New User Registers</span>
                </label>
              </div>
            </div>
          </div>
          
          {/* System Settings */}
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h3 className="card-title text-xl mb-4">System Settings</h3>
              
              <div className="form-control">
                <label className="label cursor-pointer justify-start gap-4">
                  <input 
                    type="checkbox" 
                    checked={formData.systemSettings.maintenanceMode}
                    onChange={(e) => handleInputChange('systemSettings', 'maintenanceMode', e.target.checked)}
                    className="checkbox" 
                  />
                  <span className="label-text">Maintenance Mode</span>
                </label>
                <p className="text-xs text-gray-500 ml-9">When enabled, only admins can access the site</p>
              </div>
              
              <div className="form-control mt-4">
                <label className="label cursor-pointer justify-start gap-4">
                  <input 
                    type="checkbox" 
                    checked={formData.systemSettings.debugMode}
                    onChange={(e) => handleInputChange('systemSettings', 'debugMode', e.target.checked)}
                    className="checkbox" 
                  />
                  <span className="label-text">Debug Mode</span>
                </label>
                <p className="text-xs text-gray-500 ml-9">Enable detailed error messages and logging</p>
              </div>
            </div>
          </div>
          
          {/* Submit Button */}
          <div className="flex justify-end">
            <button 
              type="submit" 
              className={`btn btn-primary px-8 ${isSubmitting ? 'loading' : ''}`}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </form>
    </AdminDashboardLayout>
  );
}

// Wrap the page with admin auth protection
export const getServerSideProps = withAdminAuth(async (context) => {
  return {
    props: {}
  };
});

export default AdminSettings; 