import { syncServicesFromConfig } from './lib/sync';
import { pollAllServices } from './lib/poller';

let pollingInterval: NodeJS.Timeout | null = null;

export async function register() {
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/8377921e-00d8-4d4b-aec6-02e64b20d0f7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'instrumentation.node.ts:8',message:'Register function called',data:{runtime:process.env.NEXT_RUNTIME},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H_INIT'})}).catch(()=>{});
  // #endregion
  
  console.log('[Instrumentation] Initializing service monitoring...');

  try {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/8377921e-00d8-4d4b-aec6-02e64b20d0f7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'instrumentation.node.ts:14',message:'Before sync',data:{},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H_SYNC'})}).catch(()=>{});
    // #endregion
    
    // Sync services from config on startup
    await syncServicesFromConfig();
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/8377921e-00d8-4d4b-aec6-02e64b20d0f7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'instrumentation.node.ts:21',message:'After sync, before initial poll',data:{},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H_POLL'})}).catch(()=>{});
    // #endregion

    // Initial poll
    await pollAllServices();
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/8377921e-00d8-4d4b-aec6-02e64b20d0f7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'instrumentation.node.ts:28',message:'After initial poll',data:{hasInterval:!!pollingInterval},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H_POLL'})}).catch(()=>{});
    // #endregion

    // Set up recurring polling (every 60 seconds)
    const pollIntervalMs = parseInt(process.env.POLL_INTERVAL_MS || '60000', 10);
    
    if (!pollingInterval) {
      pollingInterval = setInterval(async () => {
        try {
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/8377921e-00d8-4d4b-aec6-02e64b20d0f7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'instrumentation.node.ts:38',message:'Interval tick',data:{},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H_INTERVAL'})}).catch(()=>{});
          // #endregion
          await pollAllServices();
        } catch (error) {
          console.error('[Instrumentation] Error during poll:', error);
        }
      }, pollIntervalMs);

      console.log(`[Instrumentation] Polling started (interval: ${pollIntervalMs}ms)`);
      
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/8377921e-00d8-4d4b-aec6-02e64b20d0f7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'instrumentation.node.ts:49',message:'Interval setup complete',data:{intervalMs:pollIntervalMs},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H_INTERVAL'})}).catch(()=>{});
      // #endregion
    }
  } catch (error) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/8377921e-00d8-4d4b-aec6-02e64b20d0f7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'instrumentation.node.ts:55',message:'Error in register',data:{error:error instanceof Error ? error.message : String(error)},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H_ERROR'})}).catch(()=>{});
    // #endregion
    console.error('[Instrumentation] Failed to initialize:', error);
  }
}

