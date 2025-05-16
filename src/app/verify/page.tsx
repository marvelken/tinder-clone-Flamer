"use client"

import { Mail, Heart, Flame, ArrowRight, CheckCircle, RefreshCw } from "lucide-react";
import { useState, useEffect } from "react";

export default function VerifyPage() {
  const [email, setEmail] = useState("youremail@example.com");
  const [resendDisabled, setResendDisabled] = useState(false);
  const [countdown, setCountdown] = useState(0);

  // Handle resend email logic
  const handleResend = () => {
    setResendDisabled(true);
    setCountdown(60);
    // Here you would add your actual resend logic
  };

  // Countdown timer
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0 && resendDisabled) {
      setResendDisabled(false);
    }
  }, [countdown, resendDisabled]);

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-r from-rose-100 to-pink-100">
      {/* Header */}
      <div className="absolute left-0 top-0 w-full p-6">
        <div className="flex items-center justify-center">
          <Flame className="h-8 w-8 text-rose-500" />
          <h1 className="ml-2 text-2xl font-bold text-rose-500">Flamer</h1>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-xl">
          {/* Email Illustration */}
          <div className="bg-rose-500 px-8 py-10 text-center text-white">
            <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
              <Mail className="h-12 w-12" />
            </div>
            <h2 className="mt-4 text-2xl font-bold">Check Your Inbox</h2>
            <p className="mt-2 text-rose-100">We've sent you a verification link</p>
          </div>

          {/* Message Content */}
          <div className="p-8">
            <div className="mb-6 rounded-lg bg-rose-50 p-4 text-center">
              <p className="text-rose-700">
                We've sent a verification link to <span className="font-semibold">{email}</span>
              </p>
            </div>

            <div className="mb-8 space-y-4">
              <div className="flex items-start">
                <div className="mr-4 mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-rose-100">
                  <CheckCircle className="h-4 w-4 text-rose-500" />
                </div>
                <p className="text-gray-600">
                  Click the link in the email to verify your account
                </p>
              </div>

              <div className="flex items-start">
                <div className="mr-4 mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-rose-100">
                  <CheckCircle className="h-4 w-4 text-rose-500" />
                </div>
                <p className="text-gray-600">
                  If you don't see the email, check your spam folder
                </p>
              </div>

              <div className="flex items-start">
                <div className="mr-4 mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-rose-100">
                  <CheckCircle className="h-4 w-4 text-rose-500" />
                </div>
                <p className="text-gray-600">
                  The link will expire in 24 hours
                </p>
              </div>
            </div>

            {/* Resend Button */}
            <button
              onClick={handleResend}
              disabled={resendDisabled}
              className={`mb-4 flex w-full items-center justify-center rounded-full py-3 font-medium text-white ${
                resendDisabled ? "bg-gray-400" : "bg-rose-500 hover:bg-rose-600"
              }`}
            >
              {resendDisabled ? (
                <>
                  <RefreshCw className="mr-2 h-5 w-5 animate-spin" />
                  Resend in {countdown}s
                </>
              ) : (
                <>
                  <Mail className="mr-2 h-5 w-5" />
                  Resend Verification Email
                </>
              )}
            </button>

            {/* Back to Login */}
            <div className="text-center">
              <a
                href="/auth"
                className="inline-flex items-center text-sm font-medium text-rose-500 hover:text-rose-600"
              >
                Return to login
                <ArrowRight className="ml-1 h-4 w-4" />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="p-6 text-center">
        <div className="flex items-center justify-center">
          <Heart className="h-4 w-4 text-rose-400" />
          <p className="ml-2 text-sm text-gray-500">
            Your perfect match is just one verification away
          </p>
        </div>
      </div>
    </div>
  );
}