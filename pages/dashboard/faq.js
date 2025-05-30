import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/router';
import UserDashboardLayout from '../../components/UserDashboardLayout';

// FAQ data
const faqs = [
  {
    question: "What is an OSCE?",
    answer: "An Objective Structured Clinical Examination (OSCE) is a modern type of examination often used in health sciences. It is designed to test clinical skill performance and competence in skills such as communication, clinical examination, medical procedures, prescription, and interpretation of results."
  },
  {
    question: "How does the OSCE Prep app work?",
    answer: "OSCE Prep app allows you to create your own OSCE stations, practice with them, and receive AI-powered feedback on your performance. You can also track your progress over time."
  },
  {
    question: "How many stations can I create?",
    answer: "Free users can create up to 5 OSCE stations. Premium subscribers have unlimited station creation."
  },
  {
    question: "How is my performance evaluated?",
    answer: "Your performance is evaluated using AI that analyzes your responses against the expected answers you provide when creating the station."
  },
  {
    question: "Can I use this for any medical specialty?",
    answer: "Yes, you can create stations for any medical specialty or topic you're studying."
  }
];

export default function DashboardFAQPage() {
  const { user, isLoaded, isSignedIn } = useUser();
  const router = useRouter();

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

  return (
    <UserDashboardLayout>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-foreground">Frequently Asked Questions</h2>
        <p className="text-muted-foreground mt-2">Find answers to common questions about OSCE Prep.</p>
      </div>
      
      <div className="space-y-4">
        {faqs.map((faq, index) => (
          <details 
            key={index} 
            className="border border-gray-300 rounded-lg bg-white shadow-sm"
            open={index === 0}
          >
            <summary className="px-6 py-4 cursor-pointer hover:bg-gray-50 transition-colors duration-200 text-lg font-medium text-gray-900 list-none">
              <div className="flex justify-between items-center">
                <span>{faq.question}</span>
                <svg 
                  className="w-5 h-5 text-gray-600 transition-transform duration-200 details-arrow" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </summary>
            <div className="px-6 pb-4 pt-2 border-t border-gray-200">
              <p className="text-gray-700 leading-relaxed">{faq.answer}</p>
            </div>
          </details>
        ))}
      </div>
      
      <div className="mt-8 bg-gray-50 rounded-lg p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Still have questions?</h3>
        <p className="mt-2 text-gray-600">If you couldn't find the answer to your question, feel free to contact us.</p>
        <div className="mt-4">
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors duration-200">
            Contact Support
          </button>
        </div>
      </div>
    </UserDashboardLayout>
  );
} 