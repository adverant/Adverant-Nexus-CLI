/**
 * Nexus CLI ASCII Art Banners
 *
 * Inspired by popular CLIs: Docker, Kubernetes, GitHub CLI, Vercel
 * Created using research from FIGlet, TOIlet, and modern terminal design patterns
 */

import chalk from 'chalk';

export interface BannerOptions {
  variant?: 'minimal' | 'compact' | 'standard' | 'full';
  theme?: 'neural' | 'hexagon' | 'mesh';
  colored?: boolean;
  showVersion?: boolean;
  showTagline?: boolean;
}

export class NexusBanner {
  constructor(private version: string = '3.0.0') {}

  /**
   * Display banner with options
   */
  display(options: BannerOptions = {}): void {
    const {
      variant = 'minimal',
      theme = 'hexagon',
      colored = true,
      showVersion = true,
      showTagline = true,
    } = options;

    let banner = '';

    if (variant === 'minimal') {
      banner = this.getMinimalBanner(theme);
    } else if (variant === 'compact') {
      banner = this.getCompactBanner(theme);
    } else if (variant === 'standard') {
      banner = this.getStandardBanner(theme);
    } else {
      banner = this.getFullBanner(theme);
    }

    if (colored && theme === 'hexagon') {
      banner = this.colorizeHexagon(banner);
    } else if (colored && theme === 'neural') {
      banner = this.colorizeNeural(banner);
    } else if (colored && theme === 'mesh') {
      banner = this.colorizeMesh(banner);
    }

    console.log(banner);

    if (showVersion) {
      const versionLine = colored
        ? chalk.dim(`  v${this.version}`)
        : `  v${this.version}`;
      console.log(versionLine);
    }

    if (showTagline && variant !== 'minimal') {
      const tagline = colored
        ? chalk.cyan('  AI-Powered Microservices CLI')
        : '  AI-Powered Microservices CLI';
      console.log(tagline);
    }

    console.log('');
  }

  /**
   * Minimal banner (2 lines) - for frequent use
   */
  private getMinimalBanner(theme: string): string {
    if (theme === 'hexagon') {
      return `
  ⬡ NEXUS CLI ⬡
`;
    } else if (theme === 'neural') {
      return `
  ◉━━━ NEXUS CLI ━━━◉
`;
    } else {
      return `
  ◆━◆ NEXUS CLI ◆━◆
`;
    }
  }

  /**
   * Compact banner (4-5 lines) - balanced
   */
  private getCompactBanner(theme: string): string {
    if (theme === 'hexagon') {
      return `
     ⬡━━━⬡
    ⬡ NEXUS ⬡
     ⬡━━━⬡
      CLI
`;
    } else if (theme === 'neural') {
      return `
    ◉━━━━━◉
    ║NEXUS║
    ◉━━━━━◉
      CLI
`;
    } else {
      return `
    ◆━━◆━━◆
    ║NEXUS║
    ◆━━◆━━◆
      CLI
`;
    }
  }

  /**
   * Standard banner (7-8 lines) - main banner
   */
  private getStandardBanner(theme: string): string {
    if (theme === 'hexagon') {
      // Hexagonal hub architecture - shows central nexus with connected services
      return `
        ⬡━━━━━━⬡
       ⬡  Auth  ⬡
      ⬡━━━⬡━━━⬡
     ⬡ GraphRAG⬡━━NEXUS━━⬡MageAgent⬡
      ⬡━━━⬡━━━⬡
       ⬡ Gateway⬡
        ⬡━━━━━━⬡
`;
    } else if (theme === 'neural') {
      // Neural network - input → AI processing → output
      return `
    ╔═══════════════╗
    ║  Input Layer  ║
    ╠═══════════════╣
    ║ ◉━◉━◉  NEXUS  ║ ← AI Layer
    ║ ◉━◉━◉   CLI   ║
    ╠═══════════════╣
    ║ Output Layer  ║
    ╚═══════════════╝
`;
    } else {
      // Service mesh - interconnected services
      return `
    ◆━━━◆━━━◆━━━◆
    │ ╱ │ ╲ │ ╱ │
    ◆━━━◆━━━◆━━━◆
      NEXUS  CLI
    ◆━━━◆━━━◆━━━◆
    │ ╲ │ ╱ │ ╲ │
    ◆━━━◆━━━◆━━━◆
`;
    }
  }

  /**
   * Full banner (12+ lines) - for README/docs
   */
  private getFullBanner(theme: string): string {
    if (theme === 'hexagon') {
      return `
           ⬡━━━━━━━━━⬡
          ⬡   Auth    ⬡
         ⬡━━━━━⬡━━━━━⬡
        ⬡ GraphRAG  ⬡
       ⬡━━━━━━━━━━━━━⬡
      ⬡       🔷      ⬡
     ⬡━━━━━ NEXUS ━━━━━⬡
      ⬡       CLI     ⬡
       ⬡━━━━━━━━━━━━━⬡
        ⬡  MageAgent ⬡
         ⬡━━━━━⬡━━━━━⬡
          ⬡  Gateway ⬡
           ⬡━━━━━━━━━⬡
`;
    } else if (theme === 'neural') {
      return `
    ╔═══════════════════════╗
    ║    Input Layer        ║
    ║   ◉─◉─◉─◉─◉─◉─◉      ║
    ╠═══════════════════════╣
    ║  Hidden Layer 1 (AI)  ║
    ║   ◉━━◉━━◉━━◉━━◉      ║
    ╠═══════════════════════╣
    ║  Hidden Layer 2       ║
    ║    ◉━━━NEXUS━━━◉     ║
    ║    ◉━━━ CLI ━━━◉     ║
    ╠═══════════════════════╣
    ║   Output Layer        ║
    ║   ◉─◉─◉─◉─◉─◉─◉      ║
    ╚═══════════════════════╝
`;
    } else {
      return `
    ╔═══════════════════════╗
    ║  Service Mesh Network ║
    ╠═══════════════════════╣
    ║  ◆━━━◆━━━◆━━━◆━━━◆  ║
    ║  │╱  │╲  │╱  │╲  │  ║
    ║  ◆━━━◆━━━◆━━━◆━━━◆  ║
    ║       🔷 NEXUS 🔷     ║
    ║          CLI          ║
    ║  ◆━━━◆━━━◆━━━◆━━━◆  ║
    ║  │╲  │╱  │╲  │╱  │  ║
    ║  ◆━━━◆━━━◆━━━◆━━━◆  ║
    ╚═══════════════════════╝
`;
    }
  }

  /**
   * Colorize hexagon theme
   */
  private colorizeHexagon(banner: string): string {
    return banner
      .replace(/⬡/g, chalk.cyan('⬡'))
      .replace(/━/g, chalk.blue('━'))
      .replace(/🔷/g, chalk.magenta('🔷'))
      .replace(/NEXUS/g, chalk.bold.cyan('NEXUS'))
      .replace(/CLI/g, chalk.bold.white('CLI'))
      .replace(/(Auth|GraphRAG|MageAgent|Gateway)/g, chalk.green('$1'));
  }

  /**
   * Colorize neural network theme
   */
  private colorizeNeural(banner: string): string {
    return banner
      .replace(/◉/g, chalk.magenta('◉'))
      .replace(/━/g, chalk.blue('━'))
      .replace(/[╔╗╚╝╠╣═║]/g, chalk.cyan('$&'))
      .replace(/NEXUS/g, chalk.bold.magenta('NEXUS'))
      .replace(/CLI/g, chalk.bold.white('CLI'))
      .replace(/(Input|Hidden|Output|AI)/g, chalk.yellow('$1'));
  }

  /**
   * Colorize mesh theme
   */
  private colorizeMesh(banner: string): string {
    return banner
      .replace(/◆/g, chalk.cyan('◆'))
      .replace(/[━│╱╲]/g, chalk.blue('$&'))
      .replace(/[╔╗╚╝╠╣═║]/g, chalk.cyan('$&'))
      .replace(/🔷/g, chalk.magenta('🔷'))
      .replace(/NEXUS/g, chalk.bold.cyan('NEXUS'))
      .replace(/CLI/g, chalk.bold.white('CLI'))
      .replace(/Service Mesh Network/g, chalk.green('Service Mesh Network'));
  }

  /**
   * Get banner as string (for README)
   */
  getBannerString(variant: BannerOptions['variant'] = 'full', theme: BannerOptions['theme'] = 'hexagon'): string {
    if (variant === 'minimal') return this.getMinimalBanner(theme);
    if (variant === 'compact') return this.getCompactBanner(theme);
    if (variant === 'standard') return this.getStandardBanner(theme);
    return this.getFullBanner(theme);
  }
}

// Export convenience function
export function displayBanner(version?: string, options?: BannerOptions): void {
  const banner = new NexusBanner(version);
  banner.display(options);
}
