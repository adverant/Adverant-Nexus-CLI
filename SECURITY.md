# Security Policy

## Supported Versions

We release patches for security vulnerabilities in the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 3.x.x   | :white_check_mark: |
| 2.x.x   | :white_check_mark: |
| < 2.0   | :x:                |

## Reporting a Vulnerability

**DO NOT** open a public issue for security vulnerabilities.

Instead, please report security vulnerabilities by emailing:

**security@adverant.ai**

### What to Include

Please include the following in your report:

- Description of the vulnerability
- Steps to reproduce the issue
- Potential impact
- Suggested fix (if you have one)
- Your contact information

### Response Timeline

- **Initial Response**: Within 48 hours
- **Status Update**: Within 5 business days
- **Fix Timeline**: Depends on severity
  - Critical: 1-7 days
  - High: 7-14 days
  - Medium: 14-30 days
  - Low: 30-90 days

### What to Expect

1. **Acknowledgment**: We'll acknowledge receipt of your report
2. **Investigation**: We'll investigate and validate the issue
3. **Fix Development**: We'll develop and test a fix
4. **Disclosure**: We'll coordinate disclosure with you
5. **Credit**: We'll credit you in the security advisory (unless you prefer anonymity)

## Security Best Practices

### For Users

1. **Keep Updated**: Always use the latest version
2. **API Keys**: Never commit API keys to version control
3. **Environment Variables**: Use `.env` files (never commit these)
4. **Permissions**: Review plugin permissions before installation
5. **Secure Storage**: Store credentials using system keychains when possible

### For Plugin Developers

1. **Input Validation**: Always validate user input
2. **Permission Requests**: Request minimal permissions
3. **Secure Communication**: Use HTTPS for all API calls
4. **Dependency Audits**: Run `npm audit` regularly
5. **Code Signing**: Sign your plugins before distribution

## Known Security Considerations

### API Key Management

The CLI stores API keys in:
- Environment variables (`.env` file)
- System keychain (macOS Keychain, Windows Credential Manager, Linux Secret Service)
- Configuration files (`~/.nexus/config.toml`)

**Recommendation**: Use system keychain when available.

### Plugin Sandbox

Plugins run in the same process as the CLI with requested permissions:
- `file:read` - Read filesystem
- `file:write` - Write filesystem
- `network:http` - Make HTTP requests
- `service:*` - Access Nexus services
- `system:execute` - Execute system commands

**Warning**: Only install plugins from trusted sources.

### Network Security

- All Nexus API connections use HTTPS in production
- JWT tokens expire after 7 days (configurable)
- WebSocket connections use WSS (secure WebSocket)
- MCP protocol uses stdio (local only)

## Security Audits

We perform security audits:
- **Automated**: npm audit, Snyk, Dependabot
- **Manual**: Code reviews for all PRs
- **External**: Annual third-party security audit

## Vulnerability Disclosure Policy

We follow responsible disclosure:

1. **Private Disclosure**: Report privately to security@adverant.ai
2. **Investigation**: 5-90 days depending on severity
3. **Fix Development**: Coordinated with reporter
4. **Public Disclosure**: After fix is released
5. **CVE Assignment**: For significant vulnerabilities

## Security Updates

Security updates are released as:
- **Patch Releases**: For security fixes (e.g., 3.0.1)
- **Security Advisories**: Published on GitHub
- **Notifications**: Sent to mailing list subscribers

Subscribe to security updates:
https://github.com/adverant/nexus-cli/security/advisories

## Secure Development

We follow these practices:

- **Code Review**: All code reviewed before merge
- **Automated Testing**: 85%+ test coverage
- **Static Analysis**: ESLint, TypeScript strict mode
- **Dependency Scanning**: Automated vulnerability scanning
- **Principle of Least Privilege**: Minimal permissions by default
- **Defense in Depth**: Multiple layers of security
- **Secure by Default**: Secure configuration out of the box

## Contact

For security concerns, contact:
- **Email**: security@adverant.ai
- **PGP Key**: Available at https://adverant.ai/pgp-key.txt
- **Response Time**: 48 hours

For general questions:
- **GitHub Discussions**: https://github.com/adverant/nexus-cli/discussions
- **Issues**: https://github.com/adverant/nexus-cli/issues

---

**Thank you for helping keep Nexus CLI secure!** 🔒
