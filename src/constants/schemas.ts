import { z } from 'zod';

export const categorySchema = z
  .object({
    type: z.enum(['root', 'subcategory']),
    parent_category_id: z.string().nullable(),
    name: z
      .string()
      .min(2, 'Name must be at least 2 characters')
      .max(100, 'Name is too long'),
    sort_order: z
      .number({ error: 'Sort order must be a number' })
      .int('Sort order must be a whole number')
      .min(1, 'Sort order must be at least 1')
      .max(999, 'Sort order cannot exceed 999'),
  })
  .superRefine((data, ctx) => {
    if (data.type === 'subcategory' && !data.parent_category_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Please select a parent category',
        path: ['parent_category_id'],
      });
    }
  });

export type CategoryFormValues = z.infer<typeof categorySchema>;


export const departmentSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100, 'Name is too long'),
  description: z.string().trim().max(500, 'Description cannot exceed 500 characters'),
});

export const contractorCreateSchema = z.object({
  name:           z.string().trim().min(2, 'Name must be at least 2 characters').max(60, 'Name is too long'),
  email:          z.string().trim().min(1, 'Email is required').email('Enter a valid email address'),
  department_ids: z.array(z.string()).min(1, 'Please select at least one department'),
});

export const contractorEditSchema = z.object({
  name:  z.string().trim().min(2, 'Name must be at least 2 characters').max(60, 'Name is too long'),
  email: z.string().trim().min(1, 'Email is required').email('Enter a valid email address'),
});

export const documentUploadSchema = z
  .object({
    title:             z.string().trim().min(2, 'Title must be at least 2 characters').max(200, 'Title is too long'),
    description:       z.string().trim().max(500, 'Description cannot exceed 500 characters'),
    category_id:       z.string().min(1, 'Please select a category'),
    department_access: z.enum(['ALL', 'RESTRICTED']),
    department_ids:    z.array(z.string()),
  })
  .superRefine((data, ctx) => {
    if (data.department_access === 'RESTRICTED' && data.department_ids.length === 0) {
      ctx.addIssue({
        code:    z.ZodIssueCode.custom,
        message: 'Select at least one department',
        path:    ['department_ids'],
      });
    }
  });

export const documentEditSchema = z.object({
  title:       z.string().trim().min(2, 'Title must be at least 2 characters').max(200, 'Title is too long'),
  description: z.string().trim().max(500, 'Description cannot exceed 500 characters'),
  category_id: z.string().min(1, 'Please select a category'),
});

export const videoUploadSchema = z
  .object({
    title:             z.string().trim().min(2, 'Title must be at least 2 characters').max(200, 'Title is too long'),
    description:       z.string().trim().max(500, 'Description cannot exceed 500 characters'),
    category_id:       z.string().min(1, 'Please select a category'),
    department_access: z.enum(['ALL', 'RESTRICTED']),
    department_ids:    z.array(z.string()),
  })
  .superRefine((data, ctx) => {
    if (data.department_access === 'RESTRICTED' && data.department_ids.length === 0) {
      ctx.addIssue({
        code:    z.ZodIssueCode.custom,
        message: 'Select at least one department',
        path:    ['department_ids'],
      });
    }
  });

export const videoEditSchema = z.object({
  title:       z.string().trim().min(2, 'Title must be at least 2 characters').max(200, 'Title is too long'),
  description: z.string().trim().max(500, 'Description cannot exceed 500 characters'),
  category_id: z.string().min(1, 'Please select a category'),
});
