import { syncServicesFromConfig } from './lib/sync';
import { pollAllServices } from './lib/poller';

let pollingInterval: NodeJS.Timeout | null = null;

export async function register() {
  console.log('[Instrumentation] Initializing service monitoring...');

  try {
    // Sync services from config on startup
    await syncServicesFromConfig();

    // Initial poll
    await pollAllServices();

    // Set up recurring polling (configurable via ENABLE_POLLING env var)
    const pollIntervalMs = parseInt(process.env.POLL_INTERVAL_MS || '60000', 10);
    const enablePolling = process.env.ENABLE_POLLING !== 'false'; // Default to true
    
    if (enablePolling && !pollingInterval) {
      pollingInterval = setInterval(async () => {
        try {
          await pollAllServices();
        } catch (error) {
          console.error('[Instrumentation] Error during poll:', error);
        }
      }, pollIntervalMs);

      console.log(`[Instrumentation] Polling started (interval: ${pollIntervalMs}ms)`);
    }
  } catch (error) {
    console.error('[Instrumentation] Failed to initialize:', error);
  }
}

