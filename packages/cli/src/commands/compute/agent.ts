/**
 * Compute Agent Command
 *
 * Starts a local compute agent that:
 * - Detects local hardware (Apple Silicon, NVIDIA GPU)
 * - Registers with nexus-hpc-gateway
 * - Executes ML jobs locally using PyTorch MPS, Metal, etc.
 * - Streams logs back to the dashboard
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import os from 'os';
import open from 'open';
import inquirer from 'inquirer';
import { log } from '../../core/logging/logger.js';
import { detectHardware, type HardwareInfo } from './lib/hardware-detection.js';
import { LocalComputeAgent } from './lib/local-compute-agent.js';
import { CredentialsManager } from '../../auth/credentials-manager.js';
import type { AuthCredentials } from '../../types/index.js';

const DASHBOARD_URL = 'https://dashboard.adverant.ai';

/**
 * Decode JWT payload without verification
 */
function decodeJwtPayload(token: string): { sub?: string; email?: string; name?: string; exp?: number } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payloadPart = parts[1];
    if (!payloadPart) return null;
    const base64 = payloadPart.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    const decoded = Buffer.from(padded, 'base64').toString('utf-8');
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

/**
 * Generate a human-readable device code
 */
function generateDeviceCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
  code += '-';
  for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

/**
 * Ensure user is authenticated, prompting for login if needed
 */
async function ensureAuthenticated(credentialsManager: CredentialsManager): Promise<boolean> {
  const isAuthenticated = await credentialsManager.isAuthenticated();

  if (isAuthenticated) {
    const creds = await credentialsManager.loadCredentials();
    console.log(chalk.green(`✓ Authenticated as ${creds?.email || 'user'}`));
    return true;
  }

  console.log(chalk.yellow('\n⚠ Authentication required to register with HPC Gateway\n'));

  const { shouldLogin } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'shouldLogin',
      message: 'Would you like to login now?',
      default: true,
    },
  ]);

  if (!shouldLogin) {
    console.log(chalk.yellow('Agent will run in standalone mode (no remote job support).\n'));
    return false;
  }

  // Trigger login flow
  const deviceCode = generateDeviceCode();
  const authUrl = `${DASHBOARD_URL}/cli-auth?code=${deviceCode}`;

  console.log(chalk.cyan('\nOpening Nexus authentication page...\n'));
  console.log(chalk.dim(`  ${authUrl}\n`));

  try {
    await open(authUrl);
    console.log(chalk.green('Browser opened!\n'));
  } catch {
    console.log(chalk.yellow('Could not open browser automatically.'));
    console.log(`Please visit: ${chalk.cyan(authUrl)}\n`);
  }

  console.log(chalk.yellow('After logging in on the dashboard:\n'));
  console.log('  1. Authenticate with Google or GitHub');
  console.log('  2. Copy the CLI token displayed');
  console.log('  3. Paste it below\n');

  const { token } = await inquirer.prompt([
    {
      type: 'password',
      name: 'token',
      message: 'Paste your CLI token:',
      mask: '*',
      validate: (input: string) => {
        if (!input || input.length < 10) return 'Please paste a valid CLI token';
        return true;
      },
    },
  ]);

  const spinner = ora('Verifying token...').start();
  const payload = decodeJwtPayload(token);

  if (!payload) {
    spinner.fail(chalk.red('Invalid token format'));
    return false;
  }

  if (payload.exp && payload.exp * 1000 < Date.now()) {
    spinner.fail(chalk.red('Token expired'));
    return false;
  }

  const email = payload.email || 'unknown@user.com';
  const userId = payload.sub || payload.email || 'unknown';
  const expiresAt = payload.exp
    ? new Date(payload.exp * 1000).toISOString()
    : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  const credentials: AuthCredentials = {
    access_token: token,
    refresh_token: '',
    expires_at: expiresAt,
    token_type: 'Bearer',
    user_id: userId,
    email: email,
  };

  await credentialsManager.saveCredentials(credentials);
  spinner.succeed(chalk.green(`Authenticated as ${email}`));

  return true;
}

export interface AgentOptions {
  gateway?: string;
  name?: string;
  maxMemory?: number;
  allowRemoteJobs?: boolean;
  daemonize?: boolean;
  port?: number;
}

export function createComputeAgentCommand(): Command {
  const command = new Command('agent')
    .description('Manage local compute agent');

  // Start subcommand
  command
    .command('start')
    .description('Start the local compute agent')
    .option('-g, --gateway <url>', 'HPC gateway URL', 'https://api.adverant.ai/hpc')
    .option('-n, --name <name>', 'Custom name for this compute node')
    .option('--max-memory <percent>', 'Maximum memory usage percentage', '75')
    .option('--allow-remote-jobs', 'Allow remote job submissions', false)
    .option('-d, --daemonize', 'Run as background daemon', false)
    .option('-p, --port <port>', 'Local agent port', '9200')
    .option('--standalone', 'Skip authentication and run in standalone mode', false)
    .action(async (options: AgentOptions & { standalone?: boolean }) => {
      try {
        // Check authentication first (unless standalone mode)
        const credentialsManager = new CredentialsManager();

        if (!options.standalone) {
          await ensureAuthenticated(credentialsManager);
        }

        const spinner = ora('Detecting hardware...').start();

        // Detect local hardware
        const hardware = await detectHardware();
        spinner.succeed('Hardware detected');

        displayHardwareInfo(hardware);

        // Determine agent name
        const agentName = options.name || generateAgentName(hardware);

        console.log(chalk.cyan('\n📡 Starting Local Compute Agent'));
        console.log(chalk.gray(`   Name: ${agentName}`));
        console.log(chalk.gray(`   Gateway: ${options.gateway}`));
        console.log(chalk.gray(`   Max Memory: ${options.maxMemory}%`));
        console.log(chalk.gray(`   Allow Remote Jobs: ${options.allowRemoteJobs ? 'Yes' : 'No'}`));
        console.log();

        // Create and start agent
        const agent = new LocalComputeAgent({
          name: agentName,
          gatewayUrl: options.gateway || 'https://api.adverant.ai/hpc',
          maxMemoryPercent: parseInt(String(options.maxMemory ?? 75), 10),
          allowRemoteJobs: options.allowRemoteJobs || false,
          apiPort: parseInt(String(options.port ?? 9200), 10),
        });

        if (options.daemonize) {
          await agent.startDaemon();
          console.log(chalk.green('✓ Agent started as daemon'));
          console.log(chalk.gray(`  PID file: ~/.nexus/compute-agent.pid`));
          console.log(chalk.gray(`  Logs: ~/.nexus/logs/compute-agent.log`));
        } else {
          // Run in foreground
          await agent.start();
        }
      } catch (error) {
        console.error(chalk.red('\n✗ Failed to start compute agent'));
        log.error('Agent start error:', error instanceof Error ? error : new Error(String(error)));
        process.exit(1);
      }
    });

  // Stop subcommand
  command
    .command('stop')
    .description('Stop the local compute agent')
    .action(async () => {
      const spinner = ora('Stopping compute agent...').start();

      try {
        const agent = new LocalComputeAgent({});
        await agent.stop();
        spinner.succeed('Compute agent stopped');
      } catch (error) {
        spinner.fail('Failed to stop compute agent');
        log.error('Agent stop error:', error instanceof Error ? error : new Error(String(error)));
        process.exit(1);
      }
    });

  // Status subcommand
  command
    .command('status')
    .description('Check compute agent status')
    .action(async () => {
      try {
        const agent = new LocalComputeAgent({});
        const status = await agent.getStatus();

        if (status.running) {
          console.log(chalk.green('● Agent is running'));
          console.log(chalk.gray(`  PID: ${status.pid}`));
          console.log(chalk.gray(`  Uptime: ${status.uptime}`));
          console.log(chalk.gray(`  Jobs Completed: ${status.jobsCompleted}`));
          console.log(chalk.gray(`  Jobs Running: ${status.jobsRunning}`));
        } else {
          console.log(chalk.yellow('○ Agent is not running'));
          console.log(chalk.gray('  Run: nexus compute agent start'));
        }
      } catch (error) {
        console.log(chalk.red('○ Agent is not running'));
        log.debug('Status check error:', error instanceof Error ? error : new Error(String(error)));
      }
    });

  return command;
}

/**
 * Display detected hardware information
 */
function displayHardwareInfo(hardware: HardwareInfo): void {
  console.log(chalk.cyan('\n🖥️  Hardware Detected:'));

  // CPU Info
  console.log(chalk.white('   CPU:'));
  console.log(chalk.gray(`      Model: ${hardware.cpu.model}`));
  const coreInfo = hardware.cpu.performanceCores && hardware.cpu.efficiencyCores
    ? ` (${hardware.cpu.performanceCores}P + ${hardware.cpu.efficiencyCores}E)`
    : '';
  console.log(chalk.gray(`      Cores: ${hardware.cpu.cores}${coreInfo}`));

  // Memory Info
  console.log(chalk.white('   Memory:'));
  console.log(chalk.gray(`      Total: ${hardware.memory.total} GB`));
  console.log(chalk.gray(`      Type: ${hardware.memory.unified ? 'Unified (shared with GPU)' : 'Discrete'}`));

  // GPU Info
  if (hardware.gpu) {
    console.log(chalk.white('   GPU/Accelerator:'));
    console.log(chalk.gray(`      Type: ${hardware.gpu.type}`));
    console.log(chalk.gray(`      Memory: ${hardware.gpu.memory} GB`));
    console.log(chalk.gray(`      API: ${hardware.gpu.api}`));

    if (hardware.gpu.fp32Tflops) {
      console.log(chalk.gray(`      FP32: ${hardware.gpu.fp32Tflops} TFLOPS`));
    }

    if (hardware.gpu.neuralEngine) {
      console.log(chalk.gray(`      Neural Engine: ${hardware.gpu.neuralEngineTops} TOPS`));
    }
  }

  // Supported Frameworks
  console.log(chalk.white('   Supported Frameworks:'));
  const frameworks = hardware.frameworks || [];
  if (frameworks.length > 0) {
    frameworks.forEach((fw) => {
      const statusIcon = fw.available ? chalk.green('✓') : chalk.red('✗');
      const gpuIcon = fw.gpuSupport ? chalk.blue(' (GPU)') : '';
      console.log(chalk.gray(`      ${statusIcon} ${fw.name} ${fw.version || ''}${gpuIcon}`));
    });
  } else {
    console.log(chalk.gray('      None detected'));
  }
}

/**
 * Generate agent name from hardware
 */
function generateAgentName(hardware: HardwareInfo): string {
  const hostname = os.hostname();
  const gpuType = hardware.gpu?.type.replace(/\s+/g, '-') || 'CPU';
  return `${hostname}-${gpuType}`.toLowerCase();
}

export default createComputeAgentCommand;
