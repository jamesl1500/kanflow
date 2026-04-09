import { z } from "zod";

export const UpdatableCompanyRoleSchema = z.enum(["admin", "member"]);

export const UpdateMemberSchema = z.object({
    company_id: z.string().uuid("Invalid company ID"),
    member_id: z.string().uuid("Invalid member ID"),
    role: UpdatableCompanyRoleSchema,
});

export const RemoveMemberSchema = z.object({
    company_id: z.string().uuid("Invalid company ID"),
    member_id: z.string().uuid("Invalid member ID"),
});

export type UpdateMemberInput = z.infer<typeof UpdateMemberSchema>;
export type RemoveMemberInput = z.infer<typeof RemoveMemberSchema>;
