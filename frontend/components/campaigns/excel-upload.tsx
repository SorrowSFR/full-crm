'use client';

import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import api from '@/lib/api';

interface ExcelUploadProps {
  onSuccess: (campaignId: string) => void;
}

export default function ExcelUpload({ onSuccess }: ExcelUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<any[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState({
    phone: '',
    name: '',
    customFields: {} as Record<string, string>,
  });
  const [agentReference, setAgentReference] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setError('');

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = event.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        if (jsonData.length === 0) {
          setError('File is empty');
          return;
        }

        const headers = jsonData[0] as string[];
        const preview = jsonData.slice(1, 6).map((row: any) => {
          const obj: any = {};
          headers.forEach((header, index) => {
            obj[header] = row[index];
          });
          return obj;
        });

        setHeaders(headers);
        setPreview(preview);

        // Auto-detect phone column
        const phoneHeader = headers.find(
          (h) => h?.toLowerCase().includes('phone') || h?.toLowerCase().includes('mobile') || h?.toLowerCase().includes('tel'),
        );
        if (phoneHeader) {
          setColumnMapping((prev) => ({ ...prev, phone: phoneHeader }));
        }

        // Auto-detect name column
        const nameHeader = headers.find(
          (h) => h?.toLowerCase().includes('name') || h?.toLowerCase().includes('contact'),
        );
        if (nameHeader) {
          setColumnMapping((prev) => ({ ...prev, name: nameHeader }));
        }
      } catch (err) {
        setError('Failed to parse Excel file');
      }
    };
    reader.readAsBinaryString(selectedFile);
  };

  const handleSubmit = async () => {
    if (!file || !columnMapping.phone || !agentReference) {
      setError('Please fill in all required fields');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('agent_reference', agentReference);
      formData.append('column_mapping', JSON.stringify(columnMapping));

      const response = await api.post('/campaigns/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      onSuccess(response.data.campaign_id);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to upload campaign');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Upload Excel File</CardTitle>
          <CardDescription>Upload a CSV or XLSX file with up to 500 leads</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="file">Excel File</Label>
            <Input
              id="file"
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileChange}
              ref={fileInputRef}
            />
          </div>

          <div>
            <Label htmlFor="agentReference">Agent Reference *</Label>
            <Input
              id="agentReference"
              type="text"
              value={agentReference}
              onChange={(e) => setAgentReference(e.target.value)}
              placeholder="Enter agent reference"
            />
          </div>

          {headers.length > 0 && (
            <>
              <div>
                <Label>Map Columns *</Label>
                <div className="space-y-2 mt-2">
                  <div>
                    <Label htmlFor="phone" className="text-sm">Phone Column *</Label>
                    <Select
                      value={columnMapping.phone}
                      onValueChange={(value) => setColumnMapping((prev) => ({ ...prev, phone: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select phone column" />
                      </SelectTrigger>
                      <SelectContent>
                        {headers.map((header) => (
                          <SelectItem key={header} value={header}>
                            {header}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="name" className="text-sm">Name Column (Optional)</Label>
                    <Select
                      value={columnMapping.name}
                      onValueChange={(value) => setColumnMapping((prev) => ({ ...prev, name: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select name column" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">None</SelectItem>
                        {headers.map((header) => (
                          <SelectItem key={header} value={header}>
                            {header}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {preview.length > 0 && (
                <div>
                  <Label>Preview (First 5 rows)</Label>
                  <div className="mt-2 border rounded-lg overflow-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-100">
                          {headers.map((header) => (
                            <th key={header} className="p-2 text-left border">
                              {header}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {preview.map((row, idx) => (
                          <tr key={idx}>
                            {headers.map((header) => (
                              <td key={header} className="p-2 border">
                                {row[header] || ''}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}

          {error && <p className="text-sm text-red-500">{error}</p>}

          <Button onClick={handleSubmit} disabled={loading || !file || !columnMapping.phone || !agentReference}>
            {loading ? 'Uploading...' : 'Create Campaign'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

