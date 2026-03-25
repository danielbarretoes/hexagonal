/**
 * Jest Test Results Processor
 * Outputs test results to /logs with timestamp
 */

const fs = require('fs');
const path = require('path');

const LOGS_DIR = path.join(process.cwd(), 'logs');

function ensureLogsDir() {
  if (!fs.existsSync(LOGS_DIR)) {
    fs.mkdirSync(LOGS_DIR, { recursive: true });
  }
}

function formatTimestamp(date = new Date()) {
  return date.toISOString().replace(/[:.]/g, '-');
}

function processor(results) {
  ensureLogsDir();

  const timestamp = formatTimestamp();
  const filename = `test-results-${timestamp}.json`;
  const filepath = path.join(LOGS_DIR, filename);

  const summary = {
    timestamp: new Date().toISOString(),
    success: results.numFailedTests === 0,
    totalTests: results.numTotalTests,
    passedTests: results.numPassedTests,
    failedTests: results.numFailedTests,
    pendingTests: results.numPendingTests,
    duration: results.testResults.reduce((acc, suite) => acc + suite.duration, 0),
    suites: results.testResults.map(suite => ({
      name: suite.testResults[0]?.ancestorTitles[0] || suite.testResults[0]?.fullName || 'Unknown',
      success: suite.status === 'passed',
      tests: suite.testResults.map(test => ({
        name: test.fullName,
        success: test.status === 'passed',
        duration: test.duration,
        error: test.failureMessages ? test.failureMessages.join('\n') : null
      }))
    }))
  };

  fs.writeFileSync(filepath, JSON.stringify(summary, null, 2));
  console.log(`\n📝 Test results logged to: ${filepath}`);

  return results;
}

module.exports = processor;
