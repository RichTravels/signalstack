import { redirect } from 'next/navigation';

export default function RootPage() {
  // Gracefully bypass the default starter screen and push traffic directly to your telemetry dashboard
  redirect('/dashboard');
}
