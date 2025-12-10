# AI Calling CRM - Frontend

This is the frontend application for the AI Calling CRM system, built with Next.js 14.

## Getting Started

### Prerequisites

- Node.js 20.19+ (or use Prisma 5.x for Node 20.16)
- Backend API running (see main README.md)

### Installation

1. **Install dependencies**:
```bash
npm install
```

2. **Set up environment variables**:
Create a `.env.local` file:
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

3. **Start the development server**:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the application.

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Project Structure

```
frontend/
├── app/              # Next.js App Router pages
│   ├── login/        # Authentication pages
│   ├── campaigns/    # Campaign management pages
│   └── analytics/    # Analytics dashboard
├── components/       # React components
│   ├── ui/          # shadcn/ui components
│   └── campaigns/   # Campaign-specific components
├── hooks/           # Custom React hooks
│   └── use-websocket.ts  # WebSocket connection hook
├── lib/             # Utility functions
│   ├── api.ts       # API client configuration
│   └── auth.ts      # Authentication helpers
└── stores/          # Zustand state management
    └── auth-store.ts # Authentication state
```

## Features

- **Authentication**: JWT-based login and registration
- **Campaign Management**: Upload Excel files, create campaigns, monitor progress
- **Real-time Updates**: WebSocket integration for live campaign updates
- **Analytics Dashboard**: View metrics and export data
- **Responsive Design**: Mobile-friendly UI with TailwindCSS

## WebSocket Integration

The frontend uses WebSocket for real-time updates. The `useWebSocket` hook automatically:
- Connects when user is authenticated
- Subscribes to campaign updates
- Handles reconnection automatically
- Cleans up on component unmount

## Environment Variables

- `NEXT_PUBLIC_API_URL` - Backend API URL (required)

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [TailwindCSS](https://tailwindcss.com/docs)
- [shadcn/ui](https://ui.shadcn.com)
