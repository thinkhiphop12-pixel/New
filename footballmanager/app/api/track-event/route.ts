/**
 * API Route: POST /api/track-event
 * Tracks user behavior for analytics and engagement metrics
 *
 * Body:
 * {
 *   eventType: 'game_play' | 'game_complete' | 'streak_achieved' | 'share' | etc.
 *   game: 'scout' | 'gaffer'
 *   userId?: string (device ID from localStorage)
 *   metadata?: { score, streak, theme, duration, etc. }
 * }
 *
 * Stores in Supabase `user_events` table
 */

export const dynamic = 'force-dynamic';

import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

const VALID_EVENT_TYPES = [
  'game_play',
  'game_complete',
  'game_quit',
  'streak_achieved',
  'share',
  'install_prompt',
  'page_view',
  'tutorial_complete',
];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { eventType, game, userId, metadata = {} } = body;

    // Validation
    if (!eventType || !VALID_EVENT_TYPES.includes(eventType)) {
      return NextResponse.json(
        { error: 'Invalid eventType' },
        { status: 400 }
      );
    }

    if (!game || !['scout', 'gaffer'].includes(game)) {
      return NextResponse.json(
        { error: 'Invalid game' },
        { status: 400 }
      );
    }

    // Generate device ID if not provided
    const deviceId = userId || generateDeviceId();

    // Log to console in development
    if (!supabase) {
      console.log('Event tracked (dev mode):', {
        eventType,
        game,
        deviceId,
        metadata,
        timestamp: new Date().toISOString(),
      });

      return NextResponse.json(
        {
          message: 'Event tracked (development mode)',
          eventType,
        },
        { status: 200 }
      );
    }

    // Insert event into Supabase
    const { error } = await supabase
      .from('user_events')
      .insert([
        {
          event_type: eventType,
          game,
          user_id: deviceId,
          metadata,
          created_at: new Date().toISOString(),
        },
      ]);

    if (error) {
      console.error('Supabase insert error:', error);
      // Don't fail if analytics fails - just log it
      return NextResponse.json(
        { message: 'Event tracked (logging error)', eventType },
        { status: 200 }
      );
    }

    return NextResponse.json(
      { message: 'Event tracked', eventType },
      { status: 201 }
    );
  } catch (error) {
    console.error('API error:', error);
    // Always return success to avoid breaking user experience
    return NextResponse.json(
      { message: 'Event tracked (error ignored)' },
      { status: 200 }
    );
  }
}

// Generate a pseudo-unique device ID
function generateDeviceId(): string {
  return `device_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

// Health check
export async function GET() {
  return NextResponse.json(
    {
      status: 'ok',
      supportedEvents: VALID_EVENT_TYPES,
    },
    { status: 200 }
  );
}
