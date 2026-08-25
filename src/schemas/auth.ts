import { z } from "zod";

const email = z.string().trim().toLowerCase().email().max(320);
const newPassword = z
  .string()
  .min(12, "Password must be at least 12 characters.")
  .max(128, "Password must be at most 128 characters.");
const token = z.string().trim().min(32).max(256);

export const registerSchema = z.object({
  displayName: z.string().trim().min(2).max(120),
  email,
  password: newPassword
});

export const loginSchema = z.object({
  email,
  password: z.string().min(1).max(128),
  rememberMe: z.boolean().optional().default(false)
});

export const verifyEmailSchema = z.object({ token });
export const resendVerificationSchema = z.object({ email });
export const forgotPasswordSchema = z.object({ email });
export const resetPasswordSchema = z.object({ token, password: newPassword });

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
