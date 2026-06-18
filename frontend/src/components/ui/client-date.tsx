'use client';

import { useState, useEffect } from 'react';
import { formatDateTime } from '@/lib/utils';

export function ClientDate({ date }: { date: string }) {
  const [formatted, setFormatted] = useState('');
  useEffect(() => {
    setFormatted(formatDateTime(date));
  }, [date]);
  return <>{formatted}</>;
}
