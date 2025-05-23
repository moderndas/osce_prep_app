import { useSession } from 'next-auth/react';
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
    question: "Can I share my stations with others?",
    answer: "Currently, stations are private to your account. We plan to introduce sharing functionality in a future update."
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

export default function FAQPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Protect the route
  if (status === 'unauthenticated') {
    router.push('/auth/signin');
    return null;
  }

  if (status === 'loading') {
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
          <div key={index} className="collapse collapse-arrow bg-white border border-border rounded-lg shadow-sm">
            <input type="checkbox" defaultChecked={index === 0} /> 
            <div className="collapse-title text-lg font-medium text-foreground">
              {faq.question}
            </div>
            <div className="collapse-content">
              <p className="text-muted-foreground">{faq.answer}</p>
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-8 bg-white border border-border rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-foreground">Still have questions?</h3>
        <p className="mt-2 text-muted-foreground">If you couldn't find the answer to your question, feel free to contact us.</p>
        <div className="mt-4">
          <button className="btn btn-primary">Contact Support</button>
        </div>
      </div>
    </UserDashboardLayout>
  );
} 