import z from "zod";

export const signUpSchema = z
  .object({
    email: z
      .email({ error: "Please enter a valid email address" })
      .normalize()
      .lowercase(),
    username: z
      .string()
      .min(3, "Username must at least have 3 characters.")
      .max(40, "Username must not exceed 40 characters.")
      .regex(/^[a-zA-Z0-9._-]+$/, {
        error:
          "Username may only contain letters, numbers, periods, underscores, and hyphens.",
      })
      .normalize()
      .lowercase(),
    password: z
      .string()
      .min(8, { error: "Password must be at least 8 characters long" })
      .regex(/[A-Z]/, {
        error: "Password must contain at least one uppercase letter",
      })
      .regex(/[a-z]/, {
        error: "Password must contain at least one lowercase letter",
      })
      .regex(/[0-9]/, { error: "Password must contain at least one number" }),
    confirmPassword: z.string(),
    displayName: z
      .string()
      .trim()
      .min(3, { error: "Display name must at least have 3 characters." })
      .max(80, { error: "Display name must not exceed 80 characters." })
      .optional()
      .or(z.literal("")),
  })
  .refine((data) => data.password === data.confirmPassword, {
    error: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type SignUpInput = z.infer<typeof signUpSchema>;

export const signInSchema = z.union([
  z.object({
    email: z.email({ error: "Invalid email" }).normalize().lowercase(),
    password: z.string(),
  }),
  z.object({
    username: z.string().min(3, { error: "Invalid username" }),
    password: z.string(),
  }),
]);

export type SignInInput = z.infer<typeof signInSchema>;

export const passwordChangeSchema = z
  .object({
    newPassword: z
      .string()
      .min(8, { error: "Password must be at least 8 characters long" })
      .regex(/[A-Z]/, {
        error: "Password must contain at least one uppercase letter",
      })
      .regex(/[a-z]/, {
        error: "Password must contain at least one lowercase letter",
      })
      .regex(/[0-9]/, { error: "Password must contain at least one number" }),
    confirmPassword: z.string(),
    currentPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    error: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export type PasswordChangeInput = z.infer<typeof passwordChangeSchema>;
