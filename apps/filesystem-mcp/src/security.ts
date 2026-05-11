/**
 * Filesystem security — path traversal protection + sandbox enforcement.
 *
 * Every file operation MUST pass through this module.
 * Ensures all resolved paths stay within the configured workspace root.
 */

import path from "node:path";

// Patterns that indicate path traversal attempts
const BLOCKED_PATTERNS = [
  /\.\.\//,        // ../
  /\.\.\\/,        // ..\
  /~\//,           // ~/
  /^\/etc/,        // /etc
  /^\/system/,     // /system
  /^C:\\Windows/i,  // Windows system
  /^C:\\Program/i,  // Program Files
];

// Sensitive file names that should never be accessible
const BLOCKED_FILENAMES = [
  ".env",
  ".env.local",
  ".env.production",
  "id_rsa",
  "id_ed25519",
  "shadow",
  "passwd",
];

export class FileSecurity {
  private readonly root: string;

  constructor(workspaceRoot: string) {
    this.root = path.resolve(workspaceRoot);
  }

  /**
   * Resolve and validate a path against the sandbox.
   * Returns the absolute path if valid, throws if not.
   */
  resolve(inputPath: string): string {
    // Check for blocked patterns in the raw input
    for (const pattern of BLOCKED_PATTERNS) {
      if (pattern.test(inputPath)) {
        throw new SecurityError(
          `Blocked path pattern detected: "${inputPath}"`,
        );
      }
    }

    // Check for blocked filenames
    const basename = path.basename(inputPath);
    if (BLOCKED_FILENAMES.includes(basename.toLowerCase())) {
      throw new SecurityError(
        `Access to sensitive file blocked: "${basename}"`,
      );
    }

    // Resolve to absolute path within the sandbox
    const resolved = path.resolve(this.root, inputPath);

    // Ensure the resolved path is within the sandbox root
    if (!resolved.startsWith(this.root)) {
      throw new SecurityError(
        `Path escapes sandbox: "${inputPath}" resolves to "${resolved}" (sandbox: "${this.root}")`,
      );
    }

    return resolved;
  }

  /** Get the sandbox root path */
  getRoot(): string {
    return this.root;
  }
}

export class SecurityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SecurityError";
  }
}
