/**
 * Email Optin Modal Component
 * Displayed at game end to capture emails for marketing campaigns
 * Fully optional - users can skip and continue playing
 *
 * Uses Supabase to store emails and user consent
 */

'use client';

import { useState } from 'react';

interface EmailOptinModalProps {
  onClose: () => void;
  gameName: 'scout' | 'gaffer';
  score?: number;
  streak?: number;
}

export function EmailOptinModal({
  onClose,
  gameName,
  score,
  streak,
}: EmailOptinModalProps) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const gameTitle = gameName === 'scout' ? 'Scout' : 'Gaffer';
  const subscriptionMessage =
    gameName === 'scout'
      ? 'Get email alerts when a new daily puzzle goes live!'
      : 'Stay updated with new features, tips, and exclusive content!';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/capture-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          game: gameName,
          score,
          streak,
          consentDate: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.statusText}`);
      }

      setSubmitted(true);
      setTimeout(onClose, 2000); // Close after showing success
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to subscribe');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {submitted ? (
          // Success state
          <div className="text-center">
            <div className="text-4xl mb-4">✨</div>
            <h3 className="text-xl font-bold mb-2">Thanks for subscribing!</h3>
            <p className="text-gray-600">
              Check your inbox for the next {gameTitle} update.
            </p>
          </div>
        ) : (
          <>
            {/* Header */}
            <button
              onClick={onClose}
              className="float-right text-gray-500 hover:text-gray-700 text-2xl leading-none"
            >
              ✕
            </button>

            <h3 className="text-2xl font-bold mb-2">
              Love {gameTitle}? Stay updated!
            </h3>

            {streak && (
              <div className="bg-blue-50 border-l-4 border-blue-500 p-3 mb-4 rounded">
                <p className="text-sm text-blue-800">
                  🔥 Amazing! You have a <strong>{streak}-day streak</strong>
                </p>
              </div>
            )}

            <p className="text-gray-600 mb-4">{subscriptionMessage}</p>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  disabled={loading}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none disabled:bg-gray-100"
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <button
                  type="submit"
                  disabled={loading || !email}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-2 rounded-lg transition"
                >
                  {loading ? 'Subscribing...' : 'Subscribe'}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium py-2 rounded-lg transition"
                >
                  Skip
                </button>
              </div>

              <p className="text-xs text-gray-500 text-center">
                We respect your privacy. Unsubscribe anytime.
              </p>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
