/**
 * Test Logger Utility
 * Writes test results to /logs folder with timestamp
 */

import * as fs from 'fs';
import * as path from 'path';

export interface TestResult {
  timestamp: string;
  success: boolean;
  testSuite?: string;
  testName?: string;
  duration?: number;
  error?: string;
}

export interface TestSuiteResult {
  timestamp: string;
  name: string;
  success: boolean;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  duration: number;
  results: TestResult[];
}

const LOGS_DIR = path.join(process.cwd(), 'logs');

function ensureLogsDir(): void {
  if (!fs.existsSync(LOGS_DIR)) {
    fs.mkdirSync(LOGS_DIR, { recursive: true });
  }
}

function formatTimestamp(date: Date = new Date()): string {
  return date.toISOString().replace(/[:.]/g, '-');
}

export function logTestResult(result: TestResult): void {
  ensureLogsDir();
  const filename = `test-result-${formatTimestamp()}.json`;
  const filepath = path.join(LOGS_DIR, filename);
  fs.writeFileSync(filepath, JSON.stringify(result, null, 2));
}

export function logTestSuiteResult(result: TestSuiteResult): void {
  ensureLogsDir();
  const filename = `test-suite-${result.name.replace(/[^a-zA-Z0-9]/g, '-')}-${formatTimestamp()}.json`;
  const filepath = path.join(LOGS_DIR, filename);
  fs.writeFileSync(filepath, JSON.stringify(result, null, 2));
}

export function createTestResult(
  success: boolean,
  testSuite?: string,
  testName?: string,
  duration?: number,
  error?: string,
): TestResult {
  return {
    timestamp: new Date().toISOString(),
    success,
    testSuite,
    testName,
    duration,
    error,
  };
}

export function getLogFilePath(filename: string): string {
  return path.join(LOGS_DIR, filename);
}

export function getLatestLogFile(): string | null {
  ensureLogsDir();
  const files = fs.readdirSync(LOGS_DIR).filter((f) => f.endsWith('.json'));
  if (files.length === 0) return null;
  return path.join(LOGS_DIR, files.sort().reverse()[0]);
}
