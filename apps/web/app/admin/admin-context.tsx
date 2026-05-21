'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

interface AdminContextType {
  pendingRequestsCount: number;
  refreshPendingCount: () => void;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);

  const refreshPendingCount = useCallback(async () => {
    try {
      // Use limit=1 + status filter for efficiency (we only need the total count)
      const res = await fetch('/api/admin/upgrade-requests?status=PENDING&limit=1', {
        cache: 'no-store',
      });
      if (res.ok) {
        const data = await res.json();
        setPendingRequestsCount(data.total || 0);
      }
    } catch {
      // silent fail — don't break the UI
    }
  }, []);

  useEffect(() => {
    refreshPendingCount();
  }, [refreshPendingCount]);

  return (
    <AdminContext.Provider value={{ pendingRequestsCount, refreshPendingCount }}>
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  const context = useContext(AdminContext);
  if (context === undefined) {
    throw new Error('useAdmin must be used within an AdminProvider');
  }
  return context;
}
