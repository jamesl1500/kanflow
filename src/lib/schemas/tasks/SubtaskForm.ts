import { z } from "zod";

const OptionalDateStringSchema = z
    .string()
    .optional()
    .nullable()
    .transform((value) => {
        if (!value) return null;
        const parsed = new Date(value);
        return Number.isNaN(parsed.getTime()) ? null : value;
    });

export const CreateSubtaskSchema = z.object({
    company_slug: z.string().min(2).max(80),
    card_id: z.string().uuid("Invalid card ID"),
    title: z.string().min(1, "Subtask title is required").max(200),
    due_date: OptionalDateStringSchema,
});

export const UpdateSubtaskSchema = z.object({
    id: z.string().uuid("Invalid subtask ID"),
    company_slug: z.string().min(2).max(80),
    title: z.string().min(1).max(200).optional(),
    is_completed: z.boolean().optional(),
    due_date: OptionalDateStringSchema,
    position: z.number().int().min(0).optional(),
});

export const DeleteSubtaskSchema = z.object({
    id: z.string().uuid("Invalid subtask ID"),
    company_slug: z.string().min(2).max(80),
});
