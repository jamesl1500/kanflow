import { z } from "zod";

export const InviteRoleSchema = z.enum(["admin", "member"]);

const InviteByUsernameBaseSchema = z.object({
    invite_method: z.literal("username"),
    user_name: z
        .string()
        .trim()
        .min(3, "Username must be at least 3 characters")
        .max(32, "Username must be 32 characters or less")
        .regex(/^[a-zA-Z0-9_\.]+$/, "Username can only contain letters, numbers, underscore, and dot")
        .transform((value) => value.toLowerCase()),
    role: InviteRoleSchema.default("member"),
});

const InviteByEmailBaseSchema = z.object({
    invite_method: z.literal("email"),
    email: z
        .string()
        .trim()
        .email("Please enter a valid email")
        .transform((value) => value.toLowerCase()),
    role: InviteRoleSchema.default("member"),
});

const InviteByUsernameSchema = InviteByUsernameBaseSchema.extend({
    company_id: z.string().uuid("Invalid company ID"),
});

const InviteByEmailSchema = InviteByEmailBaseSchema.extend({
    company_id: z.string().uuid("Invalid company ID"),
});

export const InviteMemberClientSchema = z.discriminatedUnion("invite_method", [
    InviteByUsernameBaseSchema,
    InviteByEmailBaseSchema,
]);

export const InviteMemberSchema = z.discriminatedUnion("invite_method", [
    InviteByUsernameSchema,
    InviteByEmailSchema,
]);

export type InviteMemberClientInput = z.infer<typeof InviteMemberClientSchema>;
export type InviteMemberInput = z.infer<typeof InviteMemberSchema>;
