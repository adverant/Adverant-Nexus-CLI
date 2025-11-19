/**
 * Plugin Init Command
 *
 * Initialize a new plugin from template
 */

import { Command } from 'commander';
import inquirer from 'inquirer';
import ora from 'ora';
import chalk from 'chalk';
import path from 'path';
import fs from 'fs/promises';

type PluginTemplateType = 'typescript' | 'python';

export function createInitCommand(): Command {
  const command = new Command('init');

  command
    .description('Initialize a new plugin from template')
    .argument('<name>', 'Plugin name')
    .option('-t, --template <type>', 'Template type (typescript|python)', 'typescript')
    .option('-d, --description <desc>', 'Plugin description')
    .option('-a, --author <author>', 'Plugin author')
    .option('-o, --output <path>', 'Output directory', '.')
    .option('-y, --yes', 'Skip prompts and use defaults')
    .action(async (name: string, options) => {
      try {
        let template = options.template as PluginTemplateType;
        let description = options.description;
        let author = options.author;
        const outputPath = options.output;

        if (!options.yes) {
          const responses = await inquirer.prompt([
            {
              type: 'list',
              name: 'template',
              message: 'Select plugin template:',
              choices: [
                { name: 'TypeScript', value: 'typescript' },
                { name: 'Python', value: 'python' },
              ],
              default: template === 'typescript' ? 0 : 1,
            },
            {
              type: 'input',
              name: 'description',
              message: 'Plugin description:',
              default: description || `${name} plugin for Nexus CLI`,
            },
            {
              type: 'input',
              name: 'author',
              message: 'Author name:',
              default: author || 'Plugin Developer',
            },
          ]);

          template = responses.template || template;
          description = responses.description || description;
          author = responses.author || author;
        }

        const spinner = ora('Generating plugin scaffold...').start();

        const pluginPath = await generatePlugin({
          name,
          description: description || `${name} plugin for Nexus CLI`,
          author: author || 'Plugin Developer',
          template,
          outputPath,
        });

        spinner.succeed('Plugin scaffold generated successfully!');

        console.log();
        console.log(chalk.bold('Next steps:'));
        console.log();
        console.log(`  1. cd ${path.relative(process.cwd(), pluginPath)}`);
        console.log(`  2. npm install`);
        console.log(`  3. npm run build`);
        console.log(`  4. nexus plugin install .`);
        console.log();
        console.log(chalk.dim('For more info, see README.md\n'));
      } catch (error: any) {
        console.error(chalk.red(`\nError: ${error.message}\n`));
        process.exit(1);
      }
    });

  return command;
}

async function generatePlugin(config: {
  name: string;
  description: string;
  author: string;
  template: PluginTemplateType;
  outputPath: string;
}): Promise<string> {
  const pluginPath = path.resolve(config.outputPath, config.name);

  await fs.mkdir(pluginPath, { recursive: true });

  if (config.template === 'typescript') {
    await generateTypeScriptPlugin(pluginPath, config);
  } else {
    await generatePythonPlugin(pluginPath, config);
  }

  return pluginPath;
}

async function generateTypeScriptPlugin(
  pluginPath: string,
  config: { name: string; description: string; author: string }
): Promise<void> {
  const packageJson = {
    name: config.name,
    version: '0.1.0',
    description: config.description,
    author: config.author,
    main: 'dist/index.js',
    scripts: {
      build: 'tsc',
      watch: 'tsc --watch',
    },
    nexus: {
      plugin: true,
      commands: [
        {
          name: 'hello',
          description: 'Say hello',
        },
      ],
    },
    devDependencies: {
      typescript: '^5.0.0',
      '@types/node': '^20.0.0',
    },
  };

  const tsconfigJson = {
    compilerOptions: {
      target: 'ES2022',
      module: 'ES2022',
      moduleResolution: 'node',
      outDir: './dist',
      rootDir: './src',
      strict: true,
      esModuleInterop: true,
      skipLibCheck: true,
      forceConsistentCasingInFileNames: true,
    },
    include: ['src/**/*'],
  };

  const indexTs = `/**
 * ${config.name} - Nexus CLI Plugin
 * ${config.description}
 */

export async function execute(args: string[]): Promise<void> {
  console.log('Hello from ${config.name}!');
  console.log('Arguments:', args);
}

export const commands = {
  hello: {
    description: 'Say hello',
    handler: execute,
  },
};
`;

  const readme = `# ${config.name}

${config.description}

## Installation

\`\`\`bash
nexus plugin install .
\`\`\`

## Usage

\`\`\`bash
nexus ${config.name} hello
\`\`\`

## Development

\`\`\`bash
npm install
npm run build
\`\`\`

## Author

${config.author}
`;

  await fs.writeFile(
    path.join(pluginPath, 'package.json'),
    JSON.stringify(packageJson, null, 2)
  );
  await fs.writeFile(
    path.join(pluginPath, 'tsconfig.json'),
    JSON.stringify(tsconfigJson, null, 2)
  );
  await fs.mkdir(path.join(pluginPath, 'src'), { recursive: true });
  await fs.writeFile(path.join(pluginPath, 'src', 'index.ts'), indexTs);
  await fs.writeFile(path.join(pluginPath, 'README.md'), readme);
}

async function generatePythonPlugin(
  pluginPath: string,
  config: { name: string; description: string; author: string }
): Promise<void> {
  const packageJson = {
    name: config.name,
    version: '0.1.0',
    description: config.description,
    author: config.author,
    main: 'main.py',
    nexus: {
      plugin: true,
      runtime: 'python',
      commands: [
        {
          name: 'hello',
          description: 'Say hello',
        },
      ],
    },
  };

  const mainPy = `#!/usr/bin/env python3
"""
${config.name} - Nexus CLI Plugin
${config.description}
"""

def execute(args):
    print(f"Hello from ${config.name}!")
    print(f"Arguments: {args}")

if __name__ == "__main__":
    import sys
    execute(sys.argv[1:])
`;

  const readme = `# ${config.name}

${config.description}

## Installation

\`\`\`bash
nexus plugin install .
\`\`\`

## Usage

\`\`\`bash
nexus ${config.name} hello
\`\`\`

## Author

${config.author}
`;

  await fs.writeFile(
    path.join(pluginPath, 'package.json'),
    JSON.stringify(packageJson, null, 2)
  );
  await fs.writeFile(path.join(pluginPath, 'main.py'), mainPy);
  await fs.writeFile(path.join(pluginPath, 'README.md'), readme);
  await fs.chmod(path.join(pluginPath, 'main.py'), 0o755);
}
