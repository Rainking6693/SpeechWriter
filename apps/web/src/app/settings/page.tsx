import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { ComplianceSettings } from '@/components/settings/compliance-settings';

export default async function SettingsPage() {
  const session = await auth();

  if (!session) {
    redirect('/auth/signin');
  }

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-gray-600 mt-2">
          Manage your compliance, privacy, and content generation preferences
        </p>
      </div>

      <div className="space-y-8">
        <ComplianceSettings />
      </div>
    </div>
  );
}