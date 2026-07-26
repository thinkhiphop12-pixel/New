'use client'

import { useEffect } from 'react'
import Link from 'next/link'

export default function NotFound() {
  useEffect(() => {
    // Initialize ads on this page
    if (typeof window !== 'undefined' && window.initAds) {
      window.initAds()
    }
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900 flex flex-col items-center justify-center px-4">
      {/* Header */}
      <div className="w-full max-w-4xl mx-auto pt-8 pb-16">
        <Link href="/" className="inline-flex items-center gap-2 text-white hover:opacity-80 transition">
          <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center font-bold text-slate-950">
            B
          </div>
          <span className="font-bold text-lg">BALLKNW</span>
        </Link>
      </div>

      {/* Main Content */}
      <div className="w-full max-w-2xl mx-auto text-center">
        <div className="mb-12">
          <h1 className="text-9xl font-black text-white mb-4 tracking-tighter">404</h1>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Page Not Found</h2>
          <p className="text-xl text-slate-400 mb-8">
            Oops! The page you're looking for doesn't exist. It might have been moved or deleted.
          </p>
        </div>

        {/* Ad Slot */}
        <div className="my-8">
          <div className="ad-slot" id="ad-slot-404-top" data-ad-slot="XXXXXXXXXXXXXXXX"></div>
        </div>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
          <Link
            href="/"
            className="px-8 py-4 bg-green-500 text-slate-950 font-bold rounded-full hover:bg-green-400 transition text-lg"
          >
            Back to Home
          </Link>
          <Link
            href="/"
            className="px-8 py-4 bg-slate-800 text-white font-bold rounded-full hover:bg-slate-700 transition text-lg border border-slate-700"
          >
            Play BALLKNW
          </Link>
        </div>

        {/* Additional Ad Slot */}
        <div className="my-8">
          <div className="ad-slot" id="ad-slot-404-bottom" data-ad-slot="XXXXXXXXXXXXXXXX"></div>
        </div>

        {/* Help Text */}
        <div className="bg-slate-800 bg-opacity-50 rounded-lg p-6 border border-slate-700 mt-12">
          <p className="text-sm text-slate-400">
            Encountered an error? Report it to our team and we'll fix it.{' '}
            <a href="mailto:support@ballknw.com" className="text-green-500 hover:text-green-400 underline">
              Contact Support
            </a>
          </p>
        </div>
      </div>

      {/* Footer Ad */}
      <div className="w-full max-w-2xl mx-auto mt-16 mb-8">
        <div className="ad-slot" id="ad-slot-404-footer" data-ad-slot="XXXXXXXXXXXXXXXX"></div>
      </div>

      {/* Footer */}
      <footer className="text-center text-slate-500 text-sm py-8">
        <p>&copy; 2025 BALLKNW. All rights reserved.</p>
      </footer>
    </div>
  )
}
