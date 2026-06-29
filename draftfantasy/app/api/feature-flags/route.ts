import { NextResponse } from 'next/server';

/**
 * Mock feature-flag endpoint. The original site fetched flags from a 3rd-party
 * service (PostHog); the clone serves static defaults so the client never has to
 * call out to an external host.
 */
export function GET() {
  return NextResponse.json({
    flags: {
      'perfect-cup-enabled': true,
      'history-enabled': true,
      surveys: false,
    },
  });
}
