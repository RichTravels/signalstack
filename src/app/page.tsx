import { redirect } from 'next/navigation';

export default function RootPage() {
  // Directly forces incoming local traffic straight into our newly isolated system path
  redirect('/telemetry');
}
