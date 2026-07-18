export interface AuthContext {
  userId: string;
  organizationId: string;
  role: 'OWNER' | 'ADMIN' | 'TRADER' | 'VIEWER' | 'SUPPORT_READONLY';
  sessionId: string;
  email: string;
}
