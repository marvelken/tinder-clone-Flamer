"use client"
// pages/error.js or components/ErrorPage.jsx
import { useState } from 'react';
import Link from 'next/link';
import { 
  HeartOff, 
  RefreshCw, 
  Home, 
  ArrowLeft, 
  Flame, 
  XCircle,
  MessageSquare
} from 'lucide-react';

export default function ErrorPage({ 
  statusCode = 500, 
  message = "Our servers are taking a break from matchmaking"
}) {
  const [email, setEmail] = useState('');

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-rose-500 to-pink-600">
      {/* App Logo */}
      <div className="pt-6 text-center">
        <div className="inline-flex items-center">
          <Flame className="h-8 w-8 text-white" />
          <span className="ml-2 text-xl font-bold text-white">Flamer</span>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="flex flex-1 flex-col items-center justify-center p-6">
        <div className="w-full max-w-md">
          {/* Error Card */}
          <div className="relative mb-4 overflow-hidden rounded-3xl bg-white shadow-2xl">
            {/* Top Decoration - "Swipe Left" Indicator */}
            <div className="absolute left-4 top-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-500/90 text-white shadow-lg">
              <XCircle className="h-8 w-8" />
            </div>
            
            {/* Error Content */}
            <div className="pt-16 text-center">
              <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-rose-100">
                <HeartOff className="h-12 w-12 text-rose-500" />
              </div>
              
              <h1 className="mb-2 px-6 text-2xl font-bold text-gray-800">
                It's Not You, It's Us
              </h1>
              
              <p className="mb-6 px-6 text-gray-600">
                {message}
              </p>
              
              {/* Tinder-like Card Interface */}
              <div className="mx-auto mb-6 w-3/4 overflow-hidden rounded-xl bg-gray-100 shadow-inner">
                <div className="bg-red-50 px-4 py-3 text-center">
                  <p className="text-sm font-medium text-red-600">Error #{statusCode}</p>
                </div>
                <div className="p-4">
                  <p className="text-sm text-gray-600">
                    We couldn't make this connection. Our servers might be overwhelmed with 
                    all the love in the air.
                  </p>
                </div>
              </div>
              
              {/* Action Buttons - Styled like Dating App Buttons */}
              <div className="mb-6 flex justify-center space-x-4 px-6">
                <button
                  onClick={() => window.history.back()}
                  className="flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-md transition hover:bg-gray-50"
                  aria-label="Go back"
                >
                  <ArrowLeft className="h-6 w-6 text-gray-500" />
                </button>
                
                <button
                  onClick={() => window.location.reload()}
                  className="flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-md transition hover:bg-gray-50"
                  aria-label="Refresh"
                >
                  <RefreshCw className="h-6 w-6 text-blue-500" />
                </button>
                
                <Link href="/">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-md transition hover:bg-gray-50" aria-label="Home">
                    <Home className="h-6 w-6 text-green-500" />
                  </div>
                </Link>
              </div>
              
              {/* Contact Support Section */}
              <div className="bg-gray-50 px-6 py-6">
                <h3 className="mb-3 text-center text-sm font-medium text-gray-700">
                  Need help finding your perfect match?
                </h3>
                
                <div className="mb-4 flex">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="flex-1 rounded-l-lg border border-r-0 border-gray-300 px-4 py-2 focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
                  />
                  <button className="flex items-center rounded-r-lg bg-rose-500 px-4 py-2 text-sm font-medium text-white hover:bg-rose-600">
                    <MessageSquare className="mr-2 h-4 w-4" />
                    Contact
                  </button>
                </div>
                
                <p className="text-center text-xs text-gray-500">
                  Our support team will help you get back to finding love
                </p>
              </div>
            </div>
          </div>
          
          {/* Keep Swiping Link */}
          <div className="text-center">
            <Link href="/swipe">
              <div className="inline-flex items-center text-sm font-medium text-white hover:underline">
                <Flame className="mr-1 h-4 w-4" />
                Keep swiping for potential matches
              </div>
            </Link>
          </div>
        </div>
      </div>
      
      {/* Footer */}
      <div className="pb-6 pt-2 text-center text-xs text-white/70">
        <p>© {new Date().getFullYear()} Flamer. All hearts reserved.</p>
      </div>
    </div>
  );
}