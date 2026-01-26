import prisma from '../prisma';

export interface PasswordResetAuditData {
  userId: string;
  userEmail: string;
  action: 'reset_initiated' | 'reset_completed' | 'reset_failed';
  initiatedBy?: string; // Admin user ID who initiated the reset
  token?: string; // Reset token (for tracking)
  reason?: string; // Failure reason if applicable
}

/**
 * Log password reset actions for audit purposes
 * This is a simple console-based audit log that can be extended to a database table later
 */
export const logPasswordReset = async (data: PasswordResetAuditData) => {
  try {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      ...data,
    };

    // Log to console (can be extended to database table later)
    console.log('[PASSWORD_RESET_AUDIT]', JSON.stringify(logEntry, null, 2));

    // Optional: Store in a dedicated audit table if needed in the future
    // For now, keeping it minimal as requested
  } catch (error) {
    console.error('[PASSWORD_RESET_AUDIT] Failed to log:', error);
    // Don't throw - audit logging should not break the main flow
  }
};
