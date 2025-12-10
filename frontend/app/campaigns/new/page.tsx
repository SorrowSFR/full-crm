'use client';

import { useRouter } from 'next/navigation';
import ExcelUpload from '@/components/campaigns/excel-upload';

export default function NewCampaignPage() {
  const router = useRouter();

  const handleSuccess = (campaignId: string) => {
    router.push(`/campaigns/${campaignId}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Create New Campaign</h1>
        <ExcelUpload onSuccess={handleSuccess} />
      </div>
    </div>
  );
}

