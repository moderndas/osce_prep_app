# OSCE Prep App

A Next.js application for OSCE preparation.

## Prerequisites

- Node.js 18.x or later
- npm or yarn
- MongoDB Atlas account
- GitHub account (for authentication)
- Vercel account (for deployment)

## Setup Instructions

1. Clone the repository:
   ```bash
   git clone <your-repo-url>
   cd osce-prep-app
   ```

2. Install dependencies:
   ```bash
   npm install
   # or
   yarn install
   ```

3. Set up environment variables:
   - Copy `.env.local.example` to `.env.local`
   - Fill in the required environment variables:
     - `MONGODB_URI`: Your MongoDB connection string
     - `GITHUB_ID` and `GITHUB_SECRET`: From your GitHub OAuth app
     - `NEXTAUTH_SECRET`: Generate a secure random string
     - `NEXTAUTH_URL`: Use `http://localhost:3000` for development

4. Run the development server:
   ```bash
   npm run dev
   # or
   yarn dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Additional Packages Used

- `next-auth`: For authentication
- `@next-auth/mongodb-adapter`: MongoDB adapter for NextAuth.js
- `mongodb`: MongoDB driver
- `mongoose`: MongoDB object modeling
- Additional packages will be listed here as they're added

## Deployment

This project is configured for deployment on Vercel:

1. Push your changes to GitHub:
   ```bash
   git add .
   git commit -m "Your commit message"
   git push
   ```

2. Connect your GitHub repository to Vercel:
   - Go to [Vercel](https://vercel.com)
   - Import your GitHub repository
   - Configure environment variables in Vercel dashboard
   - Vercel will automatically deploy your application

3. Your app will be available at the Vercel-assigned URL.

## Development Guidelines

- Create new components in the `components/` directory
- Add new pages in the `pages/` directory
- Use the `lib/` directory for utility functions
- Follow the existing code style and formatting

## Contributing

1. Create a feature branch
2. Make your changes
3. Submit a pull request

## License

[Add your license here] 