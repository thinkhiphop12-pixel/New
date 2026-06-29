import type { Metadata } from 'next';
import PerfectCupGame from '@/components/PerfectCupGame';

export const metadata: Metadata = {
  title: 'Perfect Cup 8-0 — Draft Fantasy',
  description:
    'Draft five World Cup legends, simulate a tournament run, and try to win every match.',
};

export default function PerfectCupPage() {
  return <PerfectCupGame />;
}
