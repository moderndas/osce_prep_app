import { useUser, SignedIn, SignedOut, UserButton } from '@clerk/nextjs';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Head from 'next/head';
import Image from 'next/image';

export default function Home() {
  const { user, isSignedIn } = useUser();
  const router = useRouter();
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  
  const faqs = [
    {
      question: "How do patients/actors behave in station?",
      answer: "They act like a real person with emotions and facial expressions. Students will experience an OSCE exam like conversation."
    },
    {
      question: "What kind of OSCE stations are available?",
      answer: "All kinds of stations usually faced in an OSCE exam are available to practice such as Doctor station, Counselling station, OTC recommendation, Druug therapy problems, Ethics and Communication etc."
    },
    {
      question: "What kind of devices I need to use OSCE help?",
      answer: "For best experience, use a desktop or laptop."
    },
    {
      question: "Who creates and evaluates the OSCE stations?",
      answer: "Stations are designed by experienced & practicing pharmacists. Our AI is trained by pharmacists to provide you personalized feedback + tips."
    },
    {
      question: "Do you have a Free Trial of this app?",
      answer: "Yes. We recommend you first look at the DEMO on this page to familiarize yourself. We offer 1 FREE OSCE station to practice. Due to the nature of how AI tokens and inference works, we unfortunately have limited free usage of this app."
    },
    {
      question: "Who can use OSCE Help app? From Which countries?",
      answer: "OSCE Help is ideal for pharmacy  students, student pharmacists writing pharmacy licenesure exams, and anyone in pharamcy looking to enhance their communication skills. OSCE Help is suited for users in Canada, Australia, New Zealand, Ireland."
    },
    {
      question: "Do you offer OSCE Mock Exams?",
      answer: "Coming soon. We will offer OSCE Mock exams with the same level of set-up and performance feedback compared to in-person mock exams - But it will cost a lot cheaper."
    }
  ];

  const reviews = [
    {
      name: "Sam T.",
      role: "Pharmacist",
      image: "/images/testimonial-1.jpg",
      text: "I am one of the beta users of OSCE help..I feel students will be so happy to see on-demand feedback feature"
    },
    {
      name: "Neha C.",
      role: "PEBC exam qualified MCQ",
      image: "/images/testimonial-2.jpg",
      text: "please give it a try if you are looking to get a real life feel of how OSCE stations are."
    },
    {
      name: "Mayur Patel",
      role: "student pharmacist",
      image: "/images/testimonial-3.jpg",
      text: "osce help app is great. I don't have to pay a lot of money for OSCE coaching now."
    },
    {
      name: "Alexa Jane.",
      role: "Pharmacy Student",
      image: "/images/testimonial-4.jpg",
      text: "I was struggling with patient communication. The instant feedback helped me refine my approach, and now I feel confident facing any examination scenario."
    }
  ];

  const benefits = [
    {
      title: "Real-life Practice",
      description: "You will feel like you are conducting OSCE station with a real person",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      )
    },
    {
      title: "Instant Real Feedback",
      description: "Our AI will also analyse your performance and provide detailed personalized feedback + tips to improve",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      )
    },
    {
      title: "Practice Anytime, Anywhere",
      description: "Master your desired areas of OSCE exam and receive instant feedback - always on demand.",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
    {
      title: "5x Cheaper",
      description: "Our AI OSCE stations deliver the same value, if not more, at a fraction of cost of other OSCE coaches.",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
        </svg>
      )
    }
  ];

  // Redirect authenticated users to their dashboard
  useEffect(() => {
    if (isSignedIn && user) {
      // For now, redirect all authenticated users to dashboard
      // Later you can add role-based routing when you set up user roles in Clerk
      router.push('/dashboard');
    }
  }, [isSignedIn, user, router]);

  return (
    <div className="min-h-screen bg-base-100">
      <Head>
        <title>OSCE Help - Excel in Your PEBC and OSCE Clinical Examinations</title>
        <meta name="description" content="OSCE Help helps pharmacy students, pharmacists, students in pharmacy school practice and perfect their clinical OSCE exam skills with AI-powered simulations." />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      {/* Navigation */}
      <header className="bg-background border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <span className="text-2xl font-bold text-primary">OSCE Help</span>
            </div>
            <nav className="hidden md:flex space-x-10">
              <a href="#how-it-works" className="text-base font-medium text-gray-600 hover:text-primary">
                How It Works
              </a>
              <a href="#benefits" className="text-base font-medium text-gray-600 hover:text-primary">
                Benefits
              </a>
              <a href="#testimonials" className="text-base font-medium text-gray-600 hover:text-primary">
                Testimonials
              </a>
              <a href="#faq" className="text-base font-medium text-gray-600 hover:text-primary">
                FAQ
              </a>
            </nav>
            <div className="flex items-center">
              <SignedOut>
                <Link href="/auth/signin">
                  <button className="btn btn-outline mr-4">
                    Login
                  </button>
                </Link>
                <Link href="/auth/signup">
                  <button className="btn btn-primary">
                    Get Started
                  </button>
                </Link>
              </SignedOut>
              <SignedIn>
                <UserButton />
              </SignedIn>
            </div>
          </div>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section className="hero-section">
          <div className="container mx-auto px-4">
            <div className="flex flex-col md:flex-row items-center">
              <div className="md:w-1/2 md:pr-12">
                <h1 className="text-6xl font-bold mb-6">
                  Master Your Clinical Interview Skills with <span className="text-primary">OSCE Help</span>
                </h1>
                <p className="mt-6 text-xl text-muted-foreground max-w-2xl">
                  Practice exam scenarios with our AI designed to help you get comfortable, confident and prepared to pass yourOSCE Exams.
                </p>
                <div className="mt-10">
                  <SignedOut>
                    <Link href="/auth/signup">
                      <button className="btn btn-primary btn-lg mr-4">
                        Try for Free
                      </button>
                    </Link>
                  </SignedOut>
                  <SignedIn>
                    <Link href="/dashboard" className="btn btn-primary btn-lg mr-4">
                      Go to Dashboard
                    </Link>
                  </SignedIn>
                  <a href="#how-it-works" className="btn btn-outline btn-lg">
                    Learn More
                  </a>
                </div>
                <div className="mt-8 flex items-center text-sm text-muted-foreground">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary mr-1" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>No credit card required for free trial</span>
                </div>
              </div>
              <div className="md:w-1/2 mt-12 md:mt-0">
                <div className="bg-white rounded-lg shadow-xl overflow-hidden">
                  <div className="relative h-80 md:h-[500px]">
                    <Image 
                      src="/uploads/hero-image.jpg" 
                      alt="OSCE Help Platform"
                      fill
                      className="object-cover"
                      priority
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section id="how-it-works" className="py-24 bg-background">
          <div className="container mx-auto px-4">
            <div className="text-center max-w-3xl mx-auto">
              <h2 className="text-3xl font-bold mb-4">How OSCE Help Works</h2>
              <p className="section-description">
                Our platform makes practicing for OSCE stations easy, effective, and accessible.              </p>
            </div>
            
            <div className="mt-16 max-w-4xl mx-auto">
              <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                <div className="aspect-w-16 aspect-h-9 bg-gray-100 flex items-center justify-center">
                  <div className="text-center p-6">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-20 w-20 mx-auto text-primary/70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="mt-4 text-lg font-medium">Demo Video Placeholder</p>
                    <p className="text-sm text-muted-foreground">(Your OSCE Prep demo video will be embedded here)</p>
                  </div>
                </div>
                <div className="p-6 md:p-8">
                  <div className="flex justify-center space-x-4">
                    <button className="btn btn-primary">Watch Demo</button>
                    <button className="btn btn-outline">Schedule a Live Demo</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <section id="benefits" className="py-24 bg-background">
          <div className="container mx-auto px-4">
            <div className="text-center max-w-3xl mx-auto">
              <h2 className="text-3xl font-bold mb-4">Why Choose OSCE Help?</h2>
              <p className="section-description">
                Our platform offers unique advantages to help you succeed in your clinical examinations
              </p>
            </div>
            
            <div className="mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {benefits.map((benefit, index) => (
                <div key={index} className="card bg-card shadow-sm h-auto">
                  <div className="card-body p-6">
                    <div className="bg-accent p-3 rounded-lg w-fit mb-4">
                      {benefit.icon}
                    </div>
                    <h3 className="card-title">{benefit.title}</h3>
                    <p className="text-base-content/70">{benefit.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Testimonials Section */}
        <section id="testimonials" className="py-24 bg-background">
          <div className="container mx-auto px-4">
            <div className="text-center max-w-3xl mx-auto">
              <h2 className="text-3xl font-bold mb-4">What Our Students Say</h2>
              <p className="section-description">
                Real feedback from students who've improved their clinical skills with OSCE Help
              </p>
            </div>
            
            <div className="mt-16 max-w-6xl mx-auto px-4 md:px-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 px-4 md:px-8">
                {reviews.map((review, index) => (
                  <div key={index} className="card bg-card shadow-sm max-w-lg mx-auto">
                    <div className="card-body p-6">
                      {/* Stars */}
                      <div className="flex mb-3">
                        {[...Array(5)].map((_, i) => (
                          <svg key={i} xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                        ))}
                      </div>
                      
                      {/* Review Text */}
                      <p className="text-foreground italic text-lg leading-relaxed mb-4">"{review.text}"</p>
                      
                      {/* Name & Role */}
                      <div>
                        <p className="font-bold text-base">{review.name}, <span className="text-muted-foreground font-normal">{review.role}</span></p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section id="faq" className="py-24 bg-background">
          <div className="container mx-auto px-4">
            <div className="text-center max-w-3xl mx-auto">
              <h2 className="text-3xl font-bold mb-4">Frequently Asked Questions</h2>
              <p className="section-description">
                Find answers to common questions about OSCE Help
              </p>
            </div>
            
            <div className="mt-16 max-w-4xl mx-auto">
              <div className="border border-base-300 rounded-lg overflow-hidden bg-base-100">
                {faqs.map((faq, index) => (
                  <div key={index} className={`collapse collapse-arrow ${index !== 0 ? 'border-t border-base-300' : ''}`}>
                    <input type="radio" name="landing-faq-accordion" />
                    <div className="collapse-title text-lg font-medium">
                      {faq.question}
                    </div>
                    <div className="collapse-content">
                      <p className="text-base-content/70">{faq.answer}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24 bg-primary cta-section">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-semibold tracking-tight text-primary-foreground mb-4">Ready to Transform Your Clinical Skills?</h2>
              <p className="mt-4 text-xl text-primary-foreground/90">
                Join thousands of students who are excelling in their OSCEs with our platform
              </p>
              
              <div className="mt-10">
                <SignedOut>
                  <Link href="/auth/signup">
                    <button className="btn btn-cta-white btn-lg">
                      Get Started
                    </button>
                  </Link>
                </SignedOut>
                <SignedIn>
                  <Link href="/dashboard">
                    <button className="btn btn-cta-white btn-lg">
                      Go to Dashboard
                    </button>
                  </Link>
                </SignedIn>
                <p className="mt-4 text-sm text-primary-foreground/80">No credit card required. Cancel anytime.</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Privacy & Cookies Modal */}
      {showPrivacyModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">Privacy & Cookies Policy</h2>
              <button 
                onClick={() => setShowPrivacyModal(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
              >
                ×
              </button>
            </div>
            
            <div className="p-6 space-y-8">
              {/* Privacy Policy Section */}
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">Privacy Policy</h3>
                <p className="text-sm text-gray-600 mb-6">Last Updated: May 21, 2025</p>
                
                <div className="space-y-6">
                  <div>
                    <h4 className="text-lg font-semibold text-gray-800 mb-2">1. Introduction</h4>
                    <p className="text-gray-700">Your privacy matters to us. This Privacy Policy explains how Helping Patient and Pharmacist Inc. ("we," "our," "us") collects, uses, and protects information relating to users of OsceHelp.</p>
                  </div>
                  
                  <div>
                    <h4 className="text-lg font-semibold text-gray-800 mb-2">2. What We Collect</h4>
                    <div className="space-y-3">
                      <p className="text-gray-700"><strong>Account Data:</strong> Name, email, password hash, school/program (optional), account creation data, login usage data, session logs, scenario choices, performance analytics, IP address, browser type to improve platform and detect abuse.</p>
                      <p className="text-gray-700"><strong>Content Data:</strong> Text or audio you input during OSCE simulations to provide AI feedback and enhance model quality.</p>
                      <p className="text-gray-700"><strong>Payment Data (if paid plans):</strong> Transaction ID, last 4 digits of card (via payment processor) for billing and fraud prevention.</p>
                      <p className="text-gray-700">We do not collect more personal data than is necessary to operate the Platform, and we do not sell personal data to third parties.</p>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-lg font-semibold text-gray-800 mb-2">3. How We Use Information</h4>
                    <ul className="list-disc list-inside text-gray-700 space-y-1">
                      <li>Operate & provide the Platform and its AI features</li>
                      <li>Improve performance, accuracy, and user experience</li>
                      <li>Authenticate and secure user accounts, detect bots, and prevent abuse</li>
                      <li>Communicate important service updates, security alerts, or required notices</li>
                    </ul>
                  </div>
                  
                  <div>
                    <h4 className="text-lg font-semibold text-gray-800 mb-2">4. Legal Bases (GDPR, if applicable)</h4>
                    <p className="text-gray-700">We process personal data on the bases of (i) contract (providing the service), (ii) legitimate interest (security, product improvement), and (iii) consent (where required, e.g., marketing emails).</p>
                  </div>
                  
                  <div>
                    <h4 className="text-lg font-semibold text-gray-800 mb-2">5. Sharing & Disclosure</h4>
                    <ul className="list-disc list-inside text-gray-700 space-y-1">
                      <li><strong>Service Providers:</strong> Cloud hosting, analytics, payment processors—bound by confidentiality obligations</li>
                      <li><strong>Legal Compliance:</strong> Courts, regulators, or law-enforcement agencies when legally required</li>
                      <li><strong>Business Transfers:</strong> In the event of a merger, acquisition, or asset sale</li>
                    </ul>
                  </div>
                  
                  <div>
                    <h4 className="text-lg font-semibold text-gray-800 mb-2">6. International Transfers</h4>
                    <p className="text-gray-700">Data may be processed outside your jurisdiction. We use appropriate safeguards (e.g., Standard Contractual Clauses) for cross-border transfers where required.</p>
                  </div>
                  
                  <div>
                    <h4 className="text-lg font-semibold text-gray-800 mb-2">7. Data Retention</h4>
                    <p className="text-gray-700">We retain data only as long as necessary for the purposes above or as required by law. You may request deletion via admin@oscehelp.com; some data (e.g., billing records) may be retained as mandated.</p>
                  </div>
                  
                  <div>
                    <h4 className="text-lg font-semibold text-gray-800 mb-2">8. Security</h4>
                    <p className="text-gray-700">We use industry-standard technical and organisational measures—including encryption in transit, least-privilege access controls, and regular security reviews—but no system is entirely secure.</p>
                  </div>
                  
                  <div>
                    <h4 className="text-lg font-semibold text-gray-800 mb-2">9. Your Rights</h4>
                    <p className="text-gray-700">Depending on your jurisdiction, you may have rights to access, rectify, erase, port, or restrict processing of your personal data, or object to certain processing activities. Contact admin@shiftsprn.com or admin@oscehelp.com to exercise these rights.</p>
                  </div>
                  
                  <div>
                    <h4 className="text-lg font-semibold text-gray-800 mb-2">10. Children's Privacy</h4>
                    <p className="text-gray-700">The Platform is not intended for users under 18. We do not knowingly collect personal data from minors. If you believe a child has provided personal data, contact us for deletion.</p>
                  </div>
                  
                  <div>
                    <h4 className="text-lg font-semibold text-gray-800 mb-2">11. Changes</h4>
                    <p className="text-gray-700">We may revise this Privacy Policy from time to time. Material changes will be communicated via the Platform or email.</p>
                  </div>
                </div>
              </div>
              
              {/* Cookie Policy Section */}
              <div className="border-t border-gray-200 pt-8">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Cookie Policy</h3>
                <p className="text-sm text-gray-600 mb-6">Last Updated: May 21, 2025</p>
                
                <div className="space-y-6">
                  <div>
                    <h4 className="text-lg font-semibold text-gray-800 mb-2">1. What Are Cookies?</h4>
                    <p className="text-gray-700">Cookies are small text files stored on your device that allow a website or app to recognise your browser and capture certain information.</p>
                  </div>
                  
                  <div>
                    <h4 className="text-lg font-semibold text-gray-800 mb-2">2. How We Use Cookies</h4>
                    <div className="space-y-3">
                      <p className="text-gray-700"><strong>Strictly Necessary:</strong> Enable core features such as secure login and session management (SessionID)</p>
                      <p className="text-gray-700"><strong>Preference:</strong> Remember settings like language or UI preferences (ui-theme, locale)</p>
                      <p className="text-gray-700"><strong>Analytics:</strong> Understand how users interact with the Platform to improve performance (Google Analytics _ga)</p>
                      <p className="text-gray-700"><strong>Security:</strong> Detect fraudulent logins and protect user accounts (csrf_token)</p>
                      <p className="text-gray-700">We do not use third-party advertising or marketing cookies.</p>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-lg font-semibold text-gray-800 mb-2">3. Managing Cookies</h4>
                    <p className="text-gray-700">You can control cookies through your browser settings. Disabling certain cookies may affect site functionality. For more information, visit www.allaboutcookies.org.</p>
                  </div>
                  
                  <div>
                    <h4 className="text-lg font-semibold text-gray-800 mb-2">4. Changes to This Cookie Policy</h4>
                    <p className="text-gray-700">We may update this Cookie Policy from time to time. Any changes will appear in-app and take effect when posted.</p>
                  </div>
                  
                  <div>
                    <h4 className="text-lg font-semibold text-gray-800 mb-2">5. Contact</h4>
                    <p className="text-gray-700">For questions about our Cookie Policy, email admin@oscehelp.com or admin@shiftsprn.com</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="sticky bottom-0 bg-white border-t border-gray-200 p-6">
              <button 
                onClick={() => setShowPrivacyModal(false)}
                className="btn btn-primary w-full"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Terms of Service Modal */}
      {showTermsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">Terms of Service</h2>
              <button 
                onClick={() => setShowTermsModal(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
              >
                ×
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <p className="text-sm text-gray-600 mb-6">Last Updated: May 21, 2025</p>
              
              <div className="space-y-6">
                <div>
                  <h4 className="text-lg font-semibold text-gray-800 mb-2">1. Acceptance of These Terms</h4>
                  <p className="text-gray-700">By creating an account or using any part of the OsceHelp service (the "Platform"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree, do not use the Platform.</p>
                </div>
                
                <div>
                  <h4 className="text-lg font-semibold text-gray-800 mb-2">2. Eligibility</h4>
                  <p className="text-gray-700 mb-3">You must be 18 years of age or older (or the age of majority in your jurisdiction). The Platform is not directed to minors.</p>
                  <p className="text-gray-700">By using the Platform, you represent that you meet these eligibility requirements and that all information you provide is truthful and accurate.</p>
                </div>
                
                <div>
                  <h4 className="text-lg font-semibold text-gray-800 mb-2">3. Nature of the Service</h4>
                  <p className="text-gray-700 mb-3">OsceHelp is an AI-powered educational tool that enables students to practise Objective Structured Clinical Examination (OSCE) scenarios.</p>
                  <p className="text-gray-700">The content and feedback generated by the Platform are for practice and study only. They do not constitute medical advice, licensure preparation guarantees, or professional accreditation. The platform is not affiliated with or endorsed by the pharmacy examining board or organization of the user's country.</p>
                </div>
                
                <div>
                  <h4 className="text-lg font-semibold text-gray-800 mb-2">4. Account Registration & Security</h4>
                  <p className="text-gray-700 mb-3">You must create an account and keep your login credentials secure.</p>
                  <p className="text-gray-700">We employ strong authentication measures and reserve the right to suspend accounts suspected of automated or malicious activity.</p>
                </div>
                
                <div>
                  <h4 className="text-lg font-semibold text-gray-800 mb-2">5. Permitted & Prohibited Uses</h4>
                  <p className="text-gray-700 mb-3">You may use the Platform solely for personal, non-commercial study.</p>
                  <p className="text-gray-700 mb-2">You may not:</p>
                  <ul className="list-disc list-inside text-gray-700 space-y-1 ml-4">
                    <li>Use the Platform to cheat, facilitate academic dishonesty, or violate any examination rules</li>
                    <li>Attempt to reverse-engineer, decompile, or otherwise misuse the AI models</li>
                    <li>Upload unlawful, defamatory, or infringing content</li>
                  </ul>
                </div>
                
                <div>
                  <h4 className="text-lg font-semibold text-gray-800 mb-2">6. Intellectual-Property Rights</h4>
                  <p className="text-gray-700 mb-3">We retain all rights in the Platform, including underlying AI models and content.</p>
                  <p className="text-gray-700">You receive a limited, non-exclusive, revocable licence to access the Platform for its intended educational purpose.</p>
                </div>
                
                <div>
                  <h4 className="text-lg font-semibold text-gray-800 mb-2">7. Fees & Subscriptions (if applicable)</h4>
                  <p className="text-gray-700">If OsceHelp offers paid plans, you agree to pay all fees according to the price and billing terms displayed at the time of purchase. Fees are non-refundable except where required by law or explicitly stated otherwise.</p>
                </div>
                
                <div>
                  <h4 className="text-lg font-semibold text-gray-800 mb-2">8. Disclaimers</h4>
                  <p className="text-gray-700 mb-3"><strong>"As Is" / "As Available."</strong> The Platform may contain inaccuracies or simulation errors. We make no warranties—express or implied—about accuracy, completeness, or fitness for a particular purpose.</p>
                  <p className="text-gray-700"><strong>Educational Use Only.</strong> The Platform is not a substitute for accredited education, formal OSCE courses, clinical experience, or professional licensure preparation.</p>
                </div>
                
                <div>
                  <h4 className="text-lg font-semibold text-gray-800 mb-2">9. Limitation of Liability</h4>
                  <p className="text-gray-700">To the fullest extent permitted by law, Helping Patient and Pharmacist Inc., its directors, officers, employees, or shareholders shall not be liable for any indirect, incidental, consequential, special, punitive, or exemplary damages, including exam failure, data loss, or lost profits, even if advised of the possibility.</p>
                </div>
                
                <div>
                  <h4 className="text-lg font-semibold text-gray-800 mb-2">10. Indemnification</h4>
                  <p className="text-gray-700">You agree to indemnify and hold harmless the Company from any claims or damages arising out of (i) your use of the Platform, (ii) your violation of these Terms, or (iii) any content you submit.</p>
                </div>
                
                <div>
                  <h4 className="text-lg font-semibold text-gray-800 mb-2">11. Termination</h4>
                  <p className="text-gray-700">We may suspend or terminate your account at any time for violation of these Terms or for any behaviour we deem harmful to other users or the Platform.</p>
                </div>
                
                <div>
                  <h4 className="text-lg font-semibold text-gray-800 mb-2">12. Governing Law & Dispute Resolution</h4>
                  <p className="text-gray-700">These Terms are governed by the laws of the company's jurisdiction. Any dispute arising under these Terms shall be resolved exclusively in the courts where applicable.</p>
                </div>
                
                <div>
                  <h4 className="text-lg font-semibold text-gray-800 mb-2">13. Changes to Terms</h4>
                  <p className="text-gray-700">We may update these Terms from time to time. Continued use after notice of changes constitutes acceptance of the revised Terms.</p>
                </div>
              </div>
            </div>
            
            <div className="sticky bottom-0 bg-white border-t border-gray-200 p-6">
              <button 
                onClick={() => setShowTermsModal(false)}
                className="btn btn-primary w-full"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="text-white" style={{backgroundColor: '#1a1f2c'}}>
        <div className="container mx-auto px-4 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-lg font-bold mb-4">OSCE Help</h3>
              <p className="text-white/70">
                AI powered OSCE practice. On-demand, Real-life Exam simulation and instant, personalized feedback on performance.
              </p>
            </div>
            
            <div>
              <h3 className="text-lg font-bold mb-4">My other Products</h3>
              <ul className="space-y-2">
                <li>
                  <a href="https://warmlabcoats.com" target="_blank" rel="noopener noreferrer" className="text-white/70 hover:text-white flex items-center">
                    Cozy Lab Coats
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                </li>
                <li>
                  <a href="https://shiftsprn.com" target="_blank" rel="noopener noreferrer" className="text-white/70 hover:text-white flex items-center">
                    ShiftsPRN
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                </li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-lg font-bold mb-4">Resources</h3>
              <ul className="space-y-2">
                <li>
                  <a href="https://pebcprep.com" target="_blank" rel="noopener noreferrer" className="text-white/70 hover:text-white flex items-center">
                    Pebcprep.com
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                </li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-lg font-bold mb-4">Contact</h3>
              <ul className="space-y-2">
                <li className="flex items-center text-white/70">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <span>admin@osceprep.com</span>
                </li>
                <li className="flex items-center text-white/70">
                  <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                  </svg>
                  <a href="https://x.com/moderndass" target="_blank" rel="noopener noreferrer" className="text-white/70 hover:text-white flex items-center">
                    My Twitter
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 17L17 7M17 7H7M17 7V17" />
                    </svg>
                  </a>
                </li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-white/20 mt-12 pt-8">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <p className="text-white/70 text-sm">
                © {new Date().getFullYear()} OSCE Help. All rights reserved.
              </p>
              <div className="flex space-x-6 mt-4 md:mt-0">
                <button 
                  onClick={() => setShowPrivacyModal(true)}
                  className="text-white/70 hover:text-white text-sm underline-offset-4 hover:underline"
                >
                  Privacy & Cookies
                </button>
                <button 
                  onClick={() => setShowTermsModal(true)}
                  className="text-white/70 hover:text-white text-sm underline-offset-4 hover:underline"
                >
                  Terms of Service
                </button>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
} 
