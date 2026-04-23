import { z } from 'zod';

export const signupSchema = z
  .object({
    email: z.email('Invalid email address'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Must include an uppercase letter')
      .regex(/[a-z]/, 'Must include a lowercase letter')
      .regex(/[0-9]/, 'Must include a number')
      .regex(/[^A-Za-z0-9]/, 'Must include a special character'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine(data => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const loginSchema = z.object({
  email: z.email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const forgotPasswordSchema = z.object({
  email: z.email('Invalid email address'),
});

export const editProfileSchema = z.object({
  fullName: z
    .string()
    .min(1, 'Full name is required')
    .regex(/^[a-zA-Z\s]+$/, 'Full name can only contain letters and spaces'),
  alias: z
    .string()
    .min(3, 'Alias must be at least 3 characters')
    .max(20, 'Alias cannot exceed 20 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Alias can only contain letters, numbers, underscores, or dashes'),
  phone: z
    .string()
    .optional()
    .refine(val => !val || /^\+1 \(\d{3}\) \d{3}-\d{4}$/.test(val), {
      message: 'Phone number must be valid (e.g., +1 (555) 000-0000)',
    }),
  address: z.string().min(5, 'Address Line must be at least 5 characters'),
  zipCode: z
    .string()
    .optional()
    .refine(val => !val || val.trim() === '' || /^\d{5}(-\d{4})?$/.test(val), {
      message: 'Zip code must be 5 digits or ZIP+4 format',
    }),
  vehicleType: z.string().optional(),
  make: z.string().optional(),
  model: z.string().optional(),
  year: z
    .string()
    .optional()
    .refine(val => !val || /^\d{4}$/.test(val), {
      message: 'Enter a valid 4-digit year',
    }),
  rigDescription: z.string().optional(),
  aboutMe: z.string().optional(),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine(data => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type EditProfileInput = z.infer<typeof editProfileSchema>;
