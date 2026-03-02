'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/login');
  }, [router]);

  return (
    <div className="min-h-screen bg-maki-dark flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 bg-maki-gold rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse-soft">
          <span className="text-white font-display font-bold text-2xl">M</span>
        </div>
        <p className="text-white/50 text-sm">Cargando...</p>
      </div>
    </div>
  );
}
