/**
 * API Route: POST /api/capture-email
 * Captures user email for marketing campaigns
 *
 * Body:
 * {
 *   email: string (required)
 *   game: 'scout' | 'gaffer'
 *   score?: number
 *   streak?: number
 *   consentDate: string (ISO 8601)
 * }
 *
 * Stores in Supabase `emails` table
 */

import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials missing - email capture will not work');
}

const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Email validation
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, game, score, streak, consentDate } = body;

    // Validation
    if (!email || !isValidEmail(email)) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      );
    }

    if (!game || !['scout', 'gaffer'].includes(game)) {
      return NextResponse.json(
        { error: 'Invalid game' },
        { status: 400 }
      );
    }

    // If Supabase is not configured, log to console (dev mode)
    if (!supabase) {
      console.log('Email captured (dev mode):', {
        email,
        game,
        score,
        streak,
        consentDate,
        timestamp: new Date().toISOString(),
      });

      return NextResponse.json(
        {
          message: 'Email captured (development mode)',
          email,
        },
        { status: 200 }
      );
    }

    // Check if email already exists
    const { data: existing } = await supabase
      .from('emails')
      .select('id')
      .eq('email', email)
      .single();

    if (existing) {
      // Email already subscribed - update last activity
      const { error: updateError } = await supabase
        .from('emails')
        .update({
          last_activity: new Date().toISOString(),
          last_game: game,
        })
        .eq('email', email);

      if (updateError) {
        console.error('Supabase update error:', updateError);
        return NextResponse.json(
          { error: 'Failed to update subscription' },
          { status: 500 }
        );
      }

      return NextResponse.json(
        { message: 'Email already subscribed', email },
        { status: 200 }
      );
    }

    // Insert new email
    const { error } = await supabase
      .from('emails')
      .insert([
        {
          email,
          games: [game],
          last_game: game,
          initial_score: score,
          initial_streak: streak,
          consent_date: consentDate,
          created_at: new Date().toISOString(),
          last_activity: new Date().toISOString(),
        },
      ]);

    if (error) {
      console.error('Supabase insert error:', error);
      return NextResponse.json(
        { error: 'Failed to save email' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        message: 'Email captured successfully',
        email,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Health check
export async function GET() {
  return NextResponse.json(
    {
      status: 'ok',
      supabaseConfigured: !!supabase,
    },
    { status: 200 }
  );
}
