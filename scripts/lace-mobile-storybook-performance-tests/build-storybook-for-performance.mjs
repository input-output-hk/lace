/* eslint-disable no-console */

import { execSync, spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

import {
  APPS_ROOT,
  BUILD_OUTPUT_DIR,
  MONOREPO_ROOT,
  STATIC_SERVER_BUILD_PATH,
  TEST_PORT,
} from './const.mjs';

const isDebug = process.env.DEBUG_STORYBOOK_PERF_TEST === 'true';

// Helper function to clean up previous builds
export const cleanupBuildDirectory = appName => {
  const buildPath = path.join(APPS_ROOT, appName, BUILD_OUTPUT_DIR);
  if (fs.existsSync(buildPath)) {
    console.log(`🧹 Cleaning up previous build at ${buildPath}`);
    execSync(`rm -rf "${buildPath}"`, { stdio: 'pipe' });
  }
};

// Helper function to build storybook with performance optimizations
export const buildStorybookForPerformance = (
  storybookAppName,
  buildPath = STATIC_SERVER_BUILD_PATH,
) => {
  console.log(
    `🏗️  Building ${storybookAppName} with performance optimizations...`,
  );

  // Build static storybook with --test flag for performance testing
  return new Promise((resolve, reject) => {
    // 🚨 IMPORTANT: This is where the static Storybook is created. To update the Storybook CLI config,
    // edit this, NOT the `nx test-storybook` command in the runPeformanceTests function
    const buildProcess = spawn(
      'npx',
      [
        // NX CLI options:
        'nx',
        'build-storybook',
        storybookAppName,
        '--skip-nx-cache', // Skip the NX cache, as it causes a race condition between Playwright and Storybook setup
        '--',
        // Storybook build CLI options go here:
        '--test',
        '--output-dir',
        buildPath,
        ...(isDebug ? ['--loglevel', 'error', '--verbose', 'info'] : []),
        ...(!isDebug ? ['--quiet'] : []),
      ],
      {
        cwd: MONOREPO_ROOT,
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...process.env,
          STORYBOOK_PERF_TEST: 'true',
        },
      },
    );

    let buildError = '';

    buildProcess.stdout.on('data', data => {
      const output = data.toString();
      console.log(output.trim());

      // Check if build completed successfully
      if (
        output.includes('Preview built') ||
        output.includes('Output directory:')
      ) {
        // Give it a moment for cleanup, then check for output directory
        setTimeout(() => {
          if (fs.existsSync(buildPath)) {
            console.log(`✅ Build completed for ${storybookAppName}`);
            buildProcess.kill('SIGTERM'); // Terminate the process
            resolve(buildPath);
          }
        }, 2000);
      }
    });

    buildProcess.stderr.on('data', data => {
      const output = data.toString();
      buildError += output;
      console.log(output.trim());
    });

    buildProcess.on('close', code => {
      if (fs.existsSync(buildPath)) {
        console.log(`✅ Build completed for ${storybookAppName}`);
        resolve(buildPath);
      } else if (code !== 0) {
        reject(new Error(`Build failed with code ${code}: ${buildError}`));
      } else {
        reject(new Error('Build completed but output directory not found'));
      }
    });

    buildProcess.on('error', error => {
      reject(new Error(`Build process failed: ${error.message}`));
    });

    // Set a timeout as backup
    setTimeout(() => {
      if (fs.existsSync(outputPath)) {
        console.log(
          `✅ Build completed for ${appName} (detected via timeout check)`,
        );
        buildProcess.kill('SIGTERM');
        resolve(outputPath);
      } else {
        buildProcess.kill('SIGTERM');
        reject(
          new Error(
            'Build timeout - no output directory found after 5 minutes',
          ),
        );
      }
    }, 300000); // 5 minutes
  });
};

// Helper function to start static file server
export const startStaticServer = (
  buildPath = STATIC_SERVER_BUILD_PATH,
  port = TEST_PORT,
) => {
  console.log(`🌐 Starting static server for ${buildPath} on port ${port}...`);

  // Use http-server to serve the built storybook
  const serverProcess = spawn(
    'npx',
    ['http-server', buildPath, '-p', port.toString(), '-c-1', '--silent'],
    {
      cwd: MONOREPO_ROOT,
      stdio: 'pipe',
      detached: false,
    },
  );

  // Handle server output
  serverProcess.stdout.on('data', data => {
    const output = data.toString();
    if (output.includes('Available on:') || output.includes('Hit CTRL-C')) {
      console.log(`📡 Server output: ${output.trim()}`);
    }
  });

  serverProcess.stderr.on('data', data => {
    console.log(`Server stderr: ${data.toString().trim()}`);
  });

  // Wait for server to be ready
  try {
    execSync(`npx wait-on tcp:${port}`, {
      cwd: MONOREPO_ROOT,
      stdio: 'pipe',
      timeout: 60000, // 60 seconds timeout for server startup
    });

    console.log(`✅ Static server running on http://localhost:${port}`);
    return serverProcess;
  } catch (error) {
    console.error(`❌ Failed to start server on port ${port}:`, error.message);
    serverProcess.kill();
    throw error;
  }
};

// Helper function to stop static server
export const stopStaticServer = serverProcess => {
  try {
    if (serverProcess && !serverProcess.killed) {
      console.log(`🛑 Stopping server process...`);
      serverProcess.kill('SIGTERM');

      // Wait a moment for graceful shutdown, then force kill if needed
      setTimeout(() => {
        if (!serverProcess.killed) {
          serverProcess.kill('SIGKILL');
        }
      }, 5000);
    }

    // Also kill any remaining processes on the port as backup
    execSync(`lsof -ti:${TEST_PORT} | xargs kill -9`, {
      stdio: 'pipe',
    });
    console.log(`🛑 Stopped server on port ${TEST_PORT}`);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (error) {
    console.log(`🛑 No server process found on port ${TEST_PORT}`);
  }
};

export const runStaticStorybook = async (
  storybookAppName = STORYBOOK_APP,
  buildPath = STATIC_SERVER_BUILD_PATH,
) => {
  // Clean up any previous builds
  cleanupBuildDirectory(storybookAppName, buildPath);

  // Build storybook with performance optimizations
  const staticStorybookPath = await buildStorybookForPerformance(
    storybookAppName,
    buildPath,
  );
  // Start static server
  const serverProcess = startStaticServer(staticStorybookPath, TEST_PORT);

  return serverProcess;
};
