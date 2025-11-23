import { readFileSync } from 'fs';
import { join } from 'path';

export interface ServiceConfig {
  name: string;
  url: string;
  expectedVersion: string | null;
  environment?: string | null;
}

let cachedConfig: ServiceConfig[] | null = null;

export function loadServicesConfig(): ServiceConfig[] {
  if (cachedConfig) {
    return cachedConfig;
  }

  try {
    const configPath = join(process.cwd(), 'services.json');
    const fileContent = readFileSync(configPath, 'utf-8');
    cachedConfig = JSON.parse(fileContent);
    return cachedConfig!;
  } catch (error) {
    console.error('Failed to load services.json:', error);
    return [];
  }
}

export function clearConfigCache() {
  cachedConfig = null;
}

