import React from 'react';

export const HowItWorks = () => {
  return (
    <div className="mt-24 border-t border-zinc-800 pt-12">
      <div className="mb-12 text-center">
        <h2 className="text-2xl font-bold text-zinc-100">How It Works</h2>
        <p className="mt-2 text-zinc-400">
          A transparent look at our monitoring architecture
        </p>
      </div>

      <div className="grid gap-8 md:grid-cols-3">
        {/* The Polling Engine */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 backdrop-blur-sm transition-all hover:border-emerald-500/50 hover:bg-zinc-900/80">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-zinc-800 text-emerald-400">
            <svg
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h3 className="mb-2 text-lg font-semibold text-zinc-100">
            The Polling Engine
          </h3>
          <p className="text-sm leading-relaxed text-zinc-400">
            Our system continuously monitors your defined endpoints. 
            Every check performs a fresh HTTP GET request with a 10-second timeout, 
            measuring the precise time-to-byte latency for accurate performance tracking.
          </p>
        </div>

        {/* Intelligent Analysis */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 backdrop-blur-sm transition-all hover:border-emerald-500/50 hover:bg-zinc-900/80">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-zinc-800 text-emerald-400">
            <svg
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <h3 className="mb-2 text-lg font-semibold text-zinc-100">
            Intelligent Analysis
          </h3>
          <p className="text-sm leading-relaxed text-zinc-400">
            Beyond simple status codes, we inspect headers and payloads. 
            The system automatically attempts to extract version information from 
            <code className="mx-1 rounded bg-zinc-800 px-1 py-0.5 text-xs font-mono text-emerald-400">X-Version</code> 
            headers or JSON response bodies to verify deployment integrity.
          </p>
        </div>

        {/* Live & Historical Data */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 backdrop-blur-sm transition-all hover:border-emerald-500/50 hover:bg-zinc-900/80">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-zinc-800 text-emerald-400">
            <svg
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"
              />
            </svg>
          </div>
          <h3 className="mb-2 text-lg font-semibold text-zinc-100">
            Persistent History
          </h3>
          <p className="text-sm leading-relaxed text-zinc-400">
            Results are instantly persisted to our Postgres database. 
            This allows us to generate real-time uptime statistics, 
            track average latency over 24-hour windows, and maintain 
            a permanent audit trail of service health.
          </p>
        </div>
      </div>
    </div>
  );
};
