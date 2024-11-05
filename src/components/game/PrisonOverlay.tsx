import React from 'react';
import { Lock } from 'lucide-react';

interface PrisonOverlayProps {
  releaseTime: number;
}

export default function PrisonOverlay({ releaseTime }: PrisonOverlayProps) {
  const [timeLeft, setTimeLeft] = React.useState<number>(0);

  React.useEffect(() => {
    const interval = setInterval(() => {
      const remaining = Math.max(0, releaseTime - Date.now());
      setTimeLeft(remaining);
      
      if (remaining <= 0) {
        window.location.reload(); // Refresh to release from prison
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [releaseTime]);

  const minutes = Math.floor(timeLeft / 60000);
  const seconds = Math.floor((timeLeft % 60000) / 1000);

  return (
    <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-50">
      <div className="text-center space-y-6 p-8 max-w-md">
        <div className="mx-auto w-20 h-20 rounded-full bg-red-900/30 flex items-center justify-center">
          <Lock className="w-10 h-10 text-red-500" />
        </div>
        <h2 className="text-3xl font-bold text-red-500">You're in Prison!</h2>
        <p className="text-gray-400">
          Your mission failed and you got caught. You'll be released in:
        </p>
        <div className="text-4xl font-mono text-red-400">
          {minutes}:{seconds.toString().padStart(2, '0')}
        </div>
      </div>
    </div>
  );
}