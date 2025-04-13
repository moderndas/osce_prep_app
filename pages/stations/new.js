import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../api/auth/[...nextauth]';
import Link from 'next/link';

export default function NewStation() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [formData, setFormData] = useState({
    stationName: '',
    clinicalBackground: '',
    expectedAnswers: [''],
    initialQuestion: '',
    fiveMinuteQuestion: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [stationCount, setStationCount] = useState(0);

  useEffect(() => {
    // Check station count when component mounts
    const checkStationLimit = async () => {
      try {
        const response = await fetch('/api/stations');
        const data = await response.json();
        
        if (!response.ok) throw new Error(data.message);
        
        setStationCount(data.data.length);
      } catch (err) {
        setError('Failed to check station limit');
      }
    };

    if (session) {
      checkStationLimit();
    }
  }, [session]);

  if (stationCount >= 5) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base-200 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full text-center">
          <div className="alert alert-error">
            <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <span>You have reached the limit of 5 stations.</span>
          </div>
          <div className="mt-4">
            <Link href="/dashboard" className="link link-primary">
              Return to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Protect the route
  if (status === 'unauthenticated') {
    router.push('/auth/signin');
    return null;
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base-200">
        <div className="flex flex-col items-center gap-4">
          <span className="loading loading-spinner loading-lg"></span>
          <div className="text-xl">Loading...</div>
        </div>
      </div>
    );
  }

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleArrayChange = (index, field, value) => {
    const newArray = [...formData[field]];
    newArray[index] = value;
    setFormData(prev => ({
      ...prev,
      [field]: newArray
    }));
  };

  const addArrayField = (field) => {
    setFormData(prev => ({
      ...prev,
      [field]: [...prev[field], '']
    }));
  };

  const removeArrayField = (index, field) => {
    if (formData[field].length > 1) {
      setFormData(prev => ({
        ...prev,
        [field]: prev[field].filter((_, i) => i !== index)
      }));
    }
  };

  const clearForm = () => {
    setFormData({
      stationName: '',
      clinicalBackground: '',
      expectedAnswers: [''],
      initialQuestion: '',
      fiveMinuteQuestion: ''
    });
    setError('');
    setSuccess('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/stations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Error creating station');
      }

      setSuccess('Station created successfully!');
      clearForm();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-base-200 py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <div className="flex justify-between items-center mb-6">
              <h1 className="card-title text-2xl">Create New Station</h1>
              <button
                type="button"
                onClick={() => router.push('/dashboard')}
                className="btn btn-ghost"
              >
                Back to Dashboard
              </button>
            </div>

            {error && (
              <div className="alert alert-error">
                <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="alert alert-success">
                <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <span>{success}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="form-control w-full">
                <h2 className="text-lg font-medium mb-2">Station Name</h2>
                <input
                  type="text"
                  name="stationName"
                  value={formData.stationName}
                  onChange={handleChange}
                  required
                  placeholder="Enter station name"
                  className="input input-bordered w-full h-12 focus:input-primary shadow-sm"
                />
              </div>

              <div className="form-control w-full">
                <h2 className="text-lg font-medium mb-2">Clinical Background</h2>
                <textarea
                  name="clinicalBackground"
                  value={formData.clinicalBackground}
                  onChange={handleChange}
                  required
                  placeholder="Enter clinical background details"
                  rows={4}
                  className="textarea textarea-bordered w-full min-h-[120px] focus:textarea-primary shadow-sm"
                />
              </div>

              <div className="form-control w-full">
                <h2 className="text-lg font-medium mb-2">Expected Answers</h2>
                <div className="space-y-3">
                  {formData.expectedAnswers.map((answer, index) => (
                    <div key={index} className="flex gap-2">
                      <input
                        type="text"
                        value={answer}
                        onChange={(e) => handleArrayChange(index, 'expectedAnswers', e.target.value)}
                        required
                        placeholder={`Enter expected answer ${index + 1}`}
                        className="input input-bordered flex-1 h-12 focus:input-primary shadow-sm"
                      />
                      <button
                        type="button"
                        onClick={() => removeArrayField(index, 'expectedAnswers')}
                        disabled={formData.expectedAnswers.length === 1}
                        className="btn btn-square btn-error btn-sm"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => addArrayField('expectedAnswers')}
                    className="btn btn-outline btn-primary btn-sm"
                  >
                    Add Another Answer
                  </button>
                </div>
              </div>

              <div className="form-control w-full">
                <h2 className="text-lg font-medium mb-2">
                  Initial Question
                  <span className="text-sm font-normal opacity-70 ml-2">(10 seconds)</span>
                </h2>
                <textarea
                  name="initialQuestion"
                  value={formData.initialQuestion}
                  onChange={handleChange}
                  placeholder="Enter the initial question"
                  rows={3}
                  className="textarea textarea-bordered w-full min-h-[120px] focus:textarea-primary shadow-sm"
                />
              </div>

              <div className="form-control w-full">
                <h2 className="text-lg font-medium mb-2">Five Minute Question</h2>
                <textarea
                  name="fiveMinuteQuestion"
                  value={formData.fiveMinuteQuestion}
                  onChange={handleChange}
                  placeholder="Enter the five minute question"
                  rows={3}
                  className="textarea textarea-bordered w-full min-h-[120px] focus:textarea-primary shadow-sm"
                />
              </div>

              <div className="flex justify-end gap-4 mt-8 pt-4 border-t">
                <button
                  type="button"
                  onClick={clearForm}
                  className="btn btn-ghost"
                >
                  Clear Form
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn btn-primary min-w-[150px]"
                >
                  {isSubmitting ? (
                    <>
                      <span className="loading loading-spinner"></span>
                      Creating...
                    </>
                  ) : 'Create Station'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

// Server-side authentication check
export async function getServerSideProps(context) {
  const session = await getServerSession(context.req, context.res, authOptions);

  if (!session) {
    return {
      redirect: {
        destination: '/auth/signin',
        permanent: false,
      },
    };
  }

  return {
    props: {},
  };
} 