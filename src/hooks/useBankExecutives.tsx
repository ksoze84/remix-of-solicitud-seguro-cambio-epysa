import { exec } from '@/integrations/epy/EpysaApi';
import { useState, useEffect } from 'react';

export interface BankExecutive {
  id: string;
  name: string;
  bank_name: string;
  contact_number: string;
}

export const useBankExecutives = (bankName?: string) => {
  const [executives, setExecutives] = useState<BankExecutive[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (bankName) {
      fetchExecutives(bankName);
    } else {
      setExecutives([]);
    }
  }, [bankName]);

  const fetchExecutives = async (bank: string) => {
    try {
      setLoading(true);
      setError(null);

      const data = (await exec('frwrd/list_bank_executives', { bank_name: bank })).data as BankExecutive[];

      setExecutives(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading executives');
      console.error('Error fetching bank executives:', err);
      setExecutives([]);
    } finally {
      setLoading(false);
    }
  };

  return { executives, loading, error, refetch: () => bankName && fetchExecutives(bankName) };
};