# OSCE Prep Application

A comprehensive OSCE (Objective Structured Clinical Examination) preparation platform built with Next.js, featuring AI-powered practice sessions and interactive learning tools.

## Features

- **User Authentication**: Secure authentication powered by Clerk
- **OSCE Stations**: Interactive practice stations with AI feedback
- **Voice Integration**: Speech-to-text and text-to-speech capabilities
- **AI Personas**: Practice with AI-powered virtual patients using Anam.AI
- **Progress Tracking**: Monitor your preparation progress
- **Admin Dashboard**: Comprehensive admin panel for content management
- **Subscription Management**: Stripe-powered subscription system

## Tech Stack

- **Frontend**: Next.js 15, React 18, Tailwind CSS, DaisyUI
- **Backend**: Next.js API Routes, MongoDB with Mongoose
- **Authentication**: Clerk (with webhook synchronization)
- **AI Services**: OpenAI GPT, ElevenLabs TTS, AssemblyAI STT, Anam.AI
- **Payment**: Stripe
- **Deployment**: Vercel

## Environment Variables

Create a `.env.local` file in the root directory with the following variables:

### Required Variables
- `MONGODB_URI`: Your MongoDB connection string
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`: Clerk publishable key
- `CLERK_SECRET_KEY`: Clerk secret key
- `CLERK_WEBHOOK_SIGNING_SECRET`: Clerk webhook signing secret
- `OPENAI_API_KEY`: OpenAI API key for AI features
- `ELEVENLABS_API_KEY`: ElevenLabs API key for text-to-speech
- `ELEVENLABS_DEFAULT_VOICE_ID`: Default voice ID for TTS
- `ASSEMBLYAI_API_KEY`: AssemblyAI API key for speech-to-text
- `ANAM_API_KEY`: Anam.AI API key for AI personas
- `NEXT_PUBLIC_PERSONA_ID`: Anam.AI persona ID
- `STRIPE_SECRET_KEY`: Stripe secret key
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`: Stripe publishable key
- `STRIPE_PRICE_PRO`: Stripe price ID for pro subscription

### Optional Variables
- `PORT`: Server port (defaults to 3000)
- `NEXT_PUBLIC_VERCEL_URL`: Your deployment URL

## Dependencies

### Core Dependencies
- `next`: Next.js framework
- `react`: React library
- `mongoose`: MongoDB object modeling
- `@clerk/nextjs`: Clerk authentication for Next.js
- `svix`: Webhook signature verification
- `stripe`: Stripe payment processing
- `@stripe/stripe-js`: Stripe client-side library

### AI & Voice Dependencies
- `openai`: OpenAI API client
- `elevenlabs`: ElevenLabs TTS API
- `assemblyai`: AssemblyAI STT API
- `@anam-ai/js-sdk`: Anam.AI SDK for AI personas

### UI Dependencies
- `tailwindcss`: Utility-first CSS framework
- `daisyui`: Tailwind CSS component library

## Installation

1. Clone the repository
2. Install dependencies: `npm install`
3. Set up environment variables in `.env.local`
4. Configure your MongoDB database
5. Set up Clerk authentication
6. Configure webhook endpoints
7. Run the development server: `npm run dev`

## Authentication Setup

This application uses **Clerk** for authentication:

1. Create a Clerk account and project
2. Configure sign-up/sign-in methods
3. Set up webhook endpoints for user synchronization
4. Add admin emails to the `ADMIN_EMAILS` environment variable

## Admin Configuration

Admin users are determined by email addresses listed in the `ADMIN_EMAILS` environment variable. Admin users get:
- Automatic redirect to admin dashboard
- Access to user management
- Station content management
- System configuration options

## Deployment

The application is designed for deployment on Vercel:

1. Connect your repository to Vercel
2. Configure environment variables in Vercel dashboard
3. Set up webhook URLs for production
4. Deploy

## Development

- `npm run dev`: Start development server
- `npm run build`: Build for production
- `npm run start`: Start production server
- `npm run lint`: Run ESLint

## License

This project is private and proprietary. 