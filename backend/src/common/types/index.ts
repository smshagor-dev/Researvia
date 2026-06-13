export interface ApiResponse<T = any> {
  data: T;
  meta?: Record<string, any>;
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: any[];
  };
}

export type UserRoleType = 'user' | 'admin' | 'super_admin';

export interface RequestUser {
  id: string;
  email: string;
  role: UserRoleType;
  sessionId?: string;
}

export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRoleType;
  sessionId?: string;
  iat?: number;
  exp?: number;
}
