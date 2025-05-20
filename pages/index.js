import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import Link from 'next/link';
import Head from 'next/head';
import Image from 'next/image';
import { useState } from 'react';

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState(0);
  
  const faqs = [
    {
      question: "What is OSCE and how does OSCE Prep help?",
      answer: "OSCE (Objective Structured Clinical Examination) is a modern type of examination often used in health sciences. OSCE Prep provides realistic simulation stations, AI-powered feedback, and comprehensive resources to help students practice and excel in these examinations."
    },
    {
      question: "How much does OSCE Prep cost?",
      answer: "OSCE Prep offers flexible pricing plans starting with a free tier that includes basic features. Premium plans with advanced features start at an affordable monthly subscription with discounts for annual commitments."
    },
    {
      question: "Can I access OSCE Prep on mobile devices?",
      answer: "Yes! OSCE Prep is fully responsive and works on desktops, tablets, and smartphones, allowing you to practice anytime, anywhere."
    },
    {
      question: "Do you offer specialized content for different medical specialties?",
      answer: "Absolutely. Our platform includes stations tailored to various specialties including general medicine, pediatrics, surgery, psychiatry, and more. We regularly update our content based on current examination standards."
    },
    {
      question: "How realistic are the simulations?",
      answer: "Our simulations are designed by practicing clinicians and medical educators to closely mirror real OSCE experiences. The AI personas respond naturally to your communication approach, providing an authentic examination environment."
    },
    {
      question: "Is there a limit to how many stations I can practice?",
      answer: "Free tier users have access to a limited number of stations. Premium subscribers enjoy unlimited access to all stations, allowing for comprehensive preparation across all clinical scenarios."
    },
    {
      question: "How do I get help if I have technical issues?",
      answer: "Our support team is available via email and live chat. Premium subscribers also receive priority support with faster response times."
    }
  ];

  const reviews = [
    {
      name: "Sarah M.",
      role: "Medical Student",
      image: "/images/testimonial-1.jpg",
      text: "OSCE Prep transformed my clinical examination skills. The AI feedback helped me identify weaknesses in my approach that I wasn't aware of. I passed my finals with distinction!"
    },
    {
      name: "James K.",
      role: "Nursing Student",
      image: "/images/testimonial-2.jpg",
      text: "The range of scenarios is impressive. I particularly appreciated the specialized nursing stations that gave me confidence before my actual OSCE. Worth every penny."
    },
    {
      name: "Dr. Patel",
      role: "Medical Educator",
      image: "/images/testimonial-3.jpg",
      text: "As someone who trains students for OSCEs, I recommend OSCE Prep to all my students. The platform provides consistent, high-quality practice opportunities that supplement classroom teaching perfectly."
    },
    {
      name: "Alex W.",
      role: "Pharmacy Student",
      image: "/images/testimonial-4.jpg",
      text: "I was struggling with patient communication scenarios until I found OSCE Prep. The instant feedback helped me refine my approach, and now I feel confident facing any examination scenario."
    }
  ];

  const benefits = [
    {
      title: "AI-Powered Feedback",
      description: "Receive detailed, personalized feedback on your performance from our advanced AI system that analyzes your communication, clinical reasoning, and approach.",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      )
    },
    {
      title: "Realistic Simulation Stations",
      description: "Practice with over 100 clinically accurate stations created by medical professionals across various specialties and difficulty levels.",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
        </svg>
      )
    },
    {
      title: "Track Your Progress",
      description: "Monitor your improvement over time with comprehensive analytics that identify strengths and areas for development in your clinical skills.",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      )
    },
    {
      title: "Learn Anywhere, Anytime",
      description: "Access your practice sessions from any device with our responsive platform that syncs your progress across all your devices.",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      )
    }
  ];

  // Redirect authenticated users to their dashboard
  useEffect(() => {
    if (session) {
      if (session.user.role === 'admin') {
        router.push('/admin');
      } else {
        router.push('/dashboard');
      }
    }
  }, [session, router]);

  return (
    <div className="min-h-screen bg-base-100">
      <Head>
        <title>OSCE Prep - Excel in Your Clinical Examinations</title>
        <meta name="description" content="OSCE Prep helps medical, nursing, and other health science students practice and perfect their clinical examination skills with AI-powered simulations." />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      {/* Navigation */}
      <header className="bg-base-100 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <span className="text-2xl font-bold text-primary">OSCE Prep</span>
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
              <Link href="/auth/signin" className="text-base font-medium text-warm-600 hover:text-accent mr-8">
                Login
              </Link>
              <Link href="/auth/signup" className="btn btn-primary">
                Get Started
              </Link>
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
                <h1 className="text-4xl md:text-5xl font-bold tracking-tight leading-tight">
                  Master Your Clinical Skills with <span className="text-primary">OSCE Prep</span>
                </h1>
                <p className="mt-6 text-xl text-muted-foreground max-w-2xl">
                  Practice realistic clinical scenarios with our AI-powered platform designed to help you excel in your Objective Structured Clinical Examinations.
                </p>
                <div className="mt-10">
                  <Link href="/auth/signup" className="btn btn-primary btn-lg mr-4">
                    Start Free Trial
                  </Link>
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
                  <div className="relative h-64 md:h-96">
                    <div className="absolute inset-0 bg-gradient-to-r from-accent to-secondary flex items-center justify-center">
                      <div className="text-center p-6">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-primary/80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                        <p className="mt-4 text-lg font-medium">Hero Image Placeholder</p>
                        <p className="text-sm text-muted-foreground">(Your OSCE Prep platform visualization)</p>
                      </div>
                    </div>
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
              <h2 className="text-3xl font-bold tracking-tight mb-4">How OSCE Prep Works</h2>
              <p className="section-description">
                Our platform makes practicing for clinical examinations simple, effective, and accessible
              </p>
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
        <section id="benefits" className="py-24 bg-secondary">
          <div className="container mx-auto px-4">
            <div className="text-center max-w-3xl mx-auto">
              <h2 className="text-3xl font-bold tracking-tight mb-4">Why Choose OSCE Prep?</h2>
              <p className="section-description">
                Our platform offers unique advantages to help you succeed in your clinical examinations
              </p>
            </div>
            
            <div className="mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {benefits.map((benefit, index) => (
                <div key={index} className="card bg-card shadow-lg hover:shadow-xl transition-shadow duration-300">
                  <div className="card-body items-center text-center">
                    <div className="bg-accent p-4 rounded-full mb-6">
                      {benefit.icon}
                    </div>
                    <h3 className="card-title text-xl font-semibold">{benefit.title}</h3>
                    <p className="text-muted-foreground">{benefit.description}</p>
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
              <h2 className="text-3xl font-bold tracking-tight mb-4">What Our Users Say</h2>
              <p className="section-description">
                Join thousands of students who have transformed their clinical skills with OSCE Prep
              </p>
            </div>
            
            <div className="mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8">
              {reviews.map((review, index) => (
                <div key={index} className="card bg-card shadow-lg">
                  <div className="card-body">
                    <div className="flex items-center mb-4">
                      <div className="avatar">
                        <div className="w-16 h-16 rounded-full bg-accent flex items-center justify-center">
                          <span className="text-primary font-bold text-xl">{review.name.charAt(0)}</span>
                        </div>
                      </div>
                      <div className="ml-4">
                        <h3 className="font-bold text-lg">{review.name}</h3>
                        <p className="text-muted-foreground">{review.role}</p>
                      </div>
                    </div>
                    <div className="flex mb-3">
                      {[...Array(5)].map((_, i) => (
                        <svg key={i} xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      ))}
                    </div>
                    <p className="text-foreground">{review.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section id="faq" className="py-24 bg-secondary">
          <div className="container mx-auto px-4">
            <div className="text-center max-w-3xl mx-auto">
              <h2 className="text-3xl font-bold tracking-tight mb-4">Frequently Asked Questions</h2>
              <p className="section-description">
                Find answers to common questions about OSCE Prep
              </p>
            </div>
            
            <div className="mt-16 max-w-4xl mx-auto">
              <div className="join join-vertical w-full">
                {faqs.map((faq, index) => (
                  <div key={index} className="collapse collapse-arrow join-item border border-border bg-card">
                    <input 
                      type="radio" 
                      name="faq-accordion"
                      checked={activeTab === index}
                      onChange={() => setActiveTab(index)}
                    />
                    <div className="collapse-title text-lg font-medium">
                      {faq.question}
                    </div>
                    <div className="collapse-content">
                      <p className="text-muted-foreground">{faq.answer}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24 bg-primary">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center">
              <h2 className="text-3xl font-bold text-primary-foreground">Ready to Transform Your Clinical Skills?</h2>
              <p className="mt-4 text-xl text-primary-foreground/90">
                Join thousands of students who are excelling in their OSCEs with our platform
              </p>
              
              <div className="mt-10">
                <Link href="/auth/signup" className="btn bg-white text-primary hover:bg-white/90 btn-lg">
                  Start Free Trial
                </Link>
                <p className="mt-4 text-sm text-primary-foreground/80">No credit card required. Cancel anytime.</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-foreground text-primary-foreground">
        <div className="container mx-auto px-4 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-lg font-bold mb-4">OSCE Prep</h3>
              <p className="text-primary-foreground/70">
                Helping health science students excel in their clinical examinations through innovative AI technology.
              </p>
            </div>
            
            <div>
              <h3 className="text-lg font-bold mb-4">Products</h3>
              <ul className="space-y-2">
                <li><a href="#" className="text-primary-foreground/70 hover:text-primary-foreground">OSCE Stations</a></li>
                <li><a href="#" className="text-primary-foreground/70 hover:text-primary-foreground">AI Feedback</a></li>
                <li><a href="#" className="text-primary-foreground/70 hover:text-primary-foreground">Progress Tracking</a></li>
                <li><a href="#" className="text-primary-foreground/70 hover:text-primary-foreground">For Educators</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-lg font-bold mb-4">Resources</h3>
              <ul className="space-y-2">
                <li><a href="#" className="text-primary-foreground/70 hover:text-primary-foreground">Blog</a></li>
                <li><a href="#" className="text-primary-foreground/70 hover:text-primary-foreground">Clinical Guidelines</a></li>
                <li><a href="#" className="text-primary-foreground/70 hover:text-primary-foreground">Support Center</a></li>
                <li><a href="#" className="text-primary-foreground/70 hover:text-primary-foreground">Webinars</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-lg font-bold mb-4">Contact</h3>
              <ul className="space-y-2">
                <li className="flex items-center text-primary-foreground/70">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <span>support@osceprep.com</span>
                </li>
              </ul>
              <div className="mt-4 flex space-x-4">
                <a href="#" className="text-primary-foreground/70 hover:text-primary-foreground">
                  <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd" />
                  </svg>
                </a>
                <a href="#" className="text-primary-foreground/70 hover:text-primary-foreground">
                  <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                  </svg>
                </a>
                <a href="#" className="text-primary-foreground/70 hover:text-primary-foreground">
                  <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path fillRule="evenodd" d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" clipRule="evenodd" />
                  </svg>
                </a>
              </div>
            </div>
          </div>
          
          <div className="border-t border-primary-foreground/20 mt-12 pt-8">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <p className="text-primary-foreground/70 text-sm">
                © {new Date().getFullYear()} OSCE Prep. All rights reserved.
              </p>
              <div className="flex space-x-6 mt-4 md:mt-0">
                <a href="#" className="text-primary-foreground/70 hover:text-primary-foreground text-sm">Privacy Policy</a>
                <a href="#" className="text-primary-foreground/70 hover:text-primary-foreground text-sm">Terms of Service</a>
                <a href="#" className="text-primary-foreground/70 hover:text-primary-foreground text-sm">Cookie Policy</a>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
} 