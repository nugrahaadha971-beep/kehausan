import React, { useEffect, useState } from 'react';
import { Download, Share, WifiOff, X } from 'lucide-react';
import { Button3D } from './Button3D';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsInstalled(isStandalone);

    const ua = window.navigator.userAgent.toLowerCase();
    setIsIOS(/iphone|ipad|ipod/.test(ua));

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  const install = async () => {
    if (!deferredPrompt) return false;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
      setDeferredPrompt(null);
      return true;
    }
    return false;
  };

  return {
    isInstallable: !!deferredPrompt,
    isInstalled,
    isIOS,
    install,
  };
}

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  return isOnline;
}

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) return null;

  if (isInstallable) {
    return (
      <Button3D variant="water" fullWidth size="sm" onClick={install}>
        <Download className="w-4 h-4" />
        Pasang ke Layar Utama
      </Button3D>
    );
  }

  if (isIOS) {
    return (
      <>
        <Button3D variant="white" fullWidth size="sm" onClick={() => setShowIOSGuide(true)}>
          <Share className="w-4 h-4" />
          Cara Pasang di iPhone / iPad
        </Button3D>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-sm rounded-[20px] bg-white dark:bg-slate-800 p-5 shadow-xl border-2 border-[#E5E5E5] dark:border-slate-700">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-display text-lg font-extrabold text-[#3C3C3C] dark:text-white">
                  Pasang Tetes di iOS
                </h3>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  aria-label="Tutup panduan"
                  className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <ol className="space-y-2 text-sm text-[#3C3C3C] dark:text-slate-300 font-semibold list-decimal pl-5">
                <li>Ketuk ikon <strong>Bagikan (Share)</strong> di bilah Safari.</li>
                <li>Gulir ke bawah lalu pilih <strong>Tambah ke Layar Utama</strong>.</li>
                <li>Ketuk <strong>Tambah</strong> di pojok kanan atas.</li>
              </ol>
              <div className="mt-4">
                <Button3D variant="water" fullWidth size="sm" onClick={() => setShowIOSGuide(false)}>
                  Mengerti
                </Button3D>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};

export const OfflineBanner: React.FC = () => {
  const isOnline = useOnlineStatus();
  if (isOnline) return null;

  return (
    <div
      role="status"
      className="mx-4 mt-2 flex items-center gap-2 rounded-[14px] bg-[#FFC800]/20 border border-[#FFC800] px-3 py-2 text-xs font-bold text-[#7A5900] dark:text-[#FFE066]"
    >
      <WifiOff className="w-4 h-4 shrink-0" />
      <span>Mode offline — catatanmu tetap tersimpan aman di perangkat.</span>
    </div>
  );
};
