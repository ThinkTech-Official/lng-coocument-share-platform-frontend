// ─── Const enums (erasableSyntaxOnly compatible) ─────────────────────────────

export const Role = {
  SUPERADMIN: 'SUPERADMIN',
  ADMIN: 'ADMIN',
  CONTRACTOR: 'CONTRACTOR',
} as const;
export type Role = (typeof Role)[keyof typeof Role];

export const ActorRole = Role;
export type ActorRole = Role;

export const DocumentState = {
  DRAFT: 'DRAFT',
  PUBLISHED: 'PUBLISHED',
  UNPUBLISHED: 'UNPUBLISHED',
} as const;
export type DocumentState = (typeof DocumentState)[keyof typeof DocumentState];

export const VideoUploadStatus = {
  UPLOADING: 'UPLOADING',
  READY: 'READY',
  FAILED: 'FAILED',
} as const;
export type VideoUploadStatus = (typeof VideoUploadStatus)[keyof typeof VideoUploadStatus];

export const DepartmentAccess = {
  ALL: 'ALL',
  RESTRICTED: 'RESTRICTED',
} as const;
export type DepartmentAccess = (typeof DepartmentAccess)[keyof typeof DepartmentAccess];

// ─── Domain interfaces ────────────────────────────────────────────────────────

export interface Department {
  id: string;
  name: string;
  description: string;
  created_at: string;
  deleted_at: string | null;
}

export interface Category {
  id: string;
  name: string;
  parent_category_id: string | null;
  parent?: { id: string; name: string } | null;
  sort_order: number;
  created_at: string;
  deleted_at: string | null;
  subcategories?: Category[];
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  is_active: boolean;
  force_password_reset: boolean;
  created_at: string;
  deleted_at: string | null;
}

export interface Admin extends User {
  role: 'SUPERADMIN' | 'ADMIN';
}

export interface Contractor extends User {
  role: 'CONTRACTOR';
  departments: Department[];
}

export interface Document {
  id: string;
  title: string;
  description: string;
  category_id: string;
  category?: Category;
  access_type: DepartmentAccess;
  document_departments?: Array<{
    department_id: string;
    department: { id: string; name: string };
  }>;
  state: DocumentState;
  document_url?: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface Video {
  id: string;
  title: string;
  description: string;
  category_id: string;
  category?: Category;
  department_access: DepartmentAccess;
  is_live: boolean;
  upload_status: VideoUploadStatus;
  thumbnail_sas_url: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface Log {
  id: string;
  actor_id: string;
  actor_role: ActorRole;
  action_type: string;
  target_type: string;
  target_id: string;
  ip_address: string;
  user_agent: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

// ─── API utility types ────────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  cursor?: string;
}

export interface LogsPage {
  data: Log[];
  nextCursor: string | null;
  hasNextPage: boolean;
}

export interface ApiError {
  message: string;
  statusCode: number;
}

export interface ListParams {
  page?: number;
  limit?: number;
  search?: string;
  cursor?: string;
}
