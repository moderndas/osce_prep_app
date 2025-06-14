import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/router';
import UserDashboardLayout from '../../components/UserDashboardLayout';

// FAQ data
const faqs = [
  {
    question: "How to Start session for OSCE station?",
    answer: "Follow the steps: Click on Practice Now > it will open a popup message as Heads Up > Takes you to Station page > click on Start session > Patient will appear on screen > User can start talking now."
  },
  {
    question: "How to end session for OSCE station?",
    answer: "After session starts > User will talk to patient as usual. When the station is finished, User can click End session button if they wish to end early. If they don't, the station will end Automatically after 7 minutes."
  },
  {
    question: "What are some important Tips for a successful session?",
    answer: "Here are some important tips: 1) Once you say your line, wait about 1-2 seconds for the AI Actor to process and respond back to you. 2) If you do not understand what AI Actor said, ask your question again. They will respond. 3) Do not close the browser tab, do not click Back icon or do not reload the page. All these actions will kill session and ruin your experience."
  },
  {
    question: "What if I want to stop the station in the middle and start over?",
    answer: "Simply click on END SESSION button and it will take you back to dashboard. From there, you can restart your session."
  },
  {
    question: "How do I know OSCE station is about to end?",
    answer: "We automatically fire up a timer when you start a session. After 5 minutes, a soft whistle will sound to alert you that 2 minutes are left in this station."
  },
  {
    question: "Do I need a timer to practice OSCE station?",
    answer: "Absolutely not. We keep track of your time and will notify you. You focus on your performance."
  },
  {
    question: "Do you provide required References to solve OSCE station?",
    answer: "Yes. Just like OSCE exam, you will know in advance what references are needed for a particular station. Plus You will also see the LINKS and PDFs of references on your SCREEN. Feel free to click them. They will open in a NEW TAB in your browser. Refer as needed."
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
        <h2 className="text-3xl font-bold mb-4">Frequently Asked Questions</h2>
        <p className="text-base-content/70 mt-2">Find answers to common questions about OSCE Help.</p>
      </div>
      
      <div className="border border-base-300 rounded-lg overflow-hidden bg-base-100">
        {faqs.map((faq, index) => (
          <div key={index} className={`collapse collapse-arrow ${index !== 0 ? 'border-t border-base-300' : ''}`}>
            <input type="radio" name="faq-accordion" defaultChecked={index === 0} />
            <div className="collapse-title text-lg font-medium">
              {faq.question}
            </div>
            <div className="collapse-content">
              <p className="text-base-content/70">{faq.answer}</p>
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-8 bg-base-200 rounded-lg p-6">
        <h3 className="text-xl font-bold mb-4">Still have questions?</h3>
        <p className="mt-2 text-base-content/70">If you couldn't find the answer to your question, feel free to contact us.</p>
        <div className="mt-4">
          <button className="btn btn-primary">
            Contact Support
          </button>
        </div>
      </div>
    </UserDashboardLayout>
  );
} 