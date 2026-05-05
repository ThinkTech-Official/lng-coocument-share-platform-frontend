export interface CategoryFormValues {
  type: 'root' | 'subcategory';
  parent_category_id?: string | null;
  name: string;
  sort_order: number;
}

export interface DepartmentFormValues {
  name: string;
  description: string;
}

export interface ContractorCreateValues {
  name: string;
  email: string;
  department_ids: string[];
}

export interface ContractorEditValues {
  name: string;
  email: string;
}

export interface DocumentUploadValues {
  title: string;
  description: string;
  category_id: string;
  department_access: 'ALL' | 'RESTRICTED';
  department_ids: string[];
}

export interface DocumentEditValues {
  title: string;
  description: string;
  category_id: string;
}

export interface VideoUploadValues {
  title: string;
  description: string;
  category_id: string;
  department_access: 'ALL' | 'RESTRICTED';
  department_ids: string[];
}

export interface VideoEditValues {
  title: string;
  description: string;
  category_id: string;
}
