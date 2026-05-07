export type AdminRole = 'owner' | 'admin';

export interface AdminProfile {
  id: string;
  email: string;
  fullName: string;
  role: AdminRole;
}

export interface LoginResponse {
  token: string;
  admin: AdminProfile;
}

export interface MeResponse {
  admin: AdminProfile;
}
