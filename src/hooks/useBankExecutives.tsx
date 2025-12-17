import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

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
      
      const { data, error } = await supabase
        .from('bank_executives')
        .select('id, name, bank_name, contact_number')
        .eq('bank_name', bank)
        .order('name');

      if (error) throw error;

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