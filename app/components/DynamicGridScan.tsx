'use client';

import { useEffect, useState } from 'react';
import { GridScan } from './GridScan';

export function DynamicGridScan() {
  const [scanColor, setScanColor] = useState('#10b981'); // Default green

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const response = await fetch('/api/status');
        if (!response.ok) return;
        const data = await response.json();
        
        const services = data.services || [];
        const allUp = services.every((s: any) => s.latestCheck?.status === 'UP');
        const anyDown = services.some((s: any) => s.latestCheck?.status === 'DOWN');
        const allDown = services.every((s: any) => s.latestCheck?.status === 'DOWN');

        if (allDown) {
          setScanColor('#ef4444'); // Red - everything down
        } else if (anyDown) {
          setScanColor('#f59e0b'); // Orange - something down
        } else if (allUp) {
          setScanColor('#10b981'); // Green - all operational
        } else {
          setScanColor('#f59e0b'); // Orange - errors detected
        }
      } catch (err) {
        // Keep default color on error
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 30000); // Update every 30s
    return () => clearInterval(interval);
  }, []);

  return (
    <GridScan
      sensitivity={0.55}
      lineThickness={1}
      linesColor="#ffffff"
      gridScale={0.1}
      scanColor={scanColor}
      scanOpacity={0.4}
      enablePost
      bloomIntensity={0.6}
      chromaticAberration={0.002}
      noiseIntensity={0.01}
    />
  );
}
