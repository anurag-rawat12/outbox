import type { Metadata } from 'next';
import { DashboardClient } from '@/app/_components/dashboard/DashboardClient';

export const metadata: Metadata = {
  title: 'Homepage — ONG ReachInbox',
};

export default function DashboardPage() {
  return <DashboardClient />;
}
