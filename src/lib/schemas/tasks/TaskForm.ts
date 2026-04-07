import { z } from "zod";

export const TaskPrioritySchema = z.enum(["high", "medium", "low"]);
export const TaskStatusSchema = z.enum(["todo", "in_progress", "blocked", "review", "done"]);

const OptionalDateStringSchema = z
    .string()
    .optional()
    .nullable()
    .transform((value) => {
        if (!value) return null;
        const parsed = new Date(value);
        return Number.isNaN(parsed.getTime()) ? null : value;
    });

export const CreateTaskSchema = z.object({
    company_slug: z.string().min(2).max(80),
    workspace_id: z.string().uuid("Invalid workspace"),
    list_id: z.string().uuid("Invalid list"),
    title: z.string().min(1, "Task title is required").max(200, "Task title must be 200 characters or less"),
    description: z.string().max(4000, "Description must be 4000 characters or less").optional().or(z.literal("")),
    priority: TaskPrioritySchema.default("medium"),
    status: TaskStatusSchema.default("todo"),
    due_date: OptionalDateStringSchema,
    estimate_points: z.coerce.number().int().min(0).max(500).optional().nullable(),
    tags: z.array(z.string().min(1).max(24)).max(12).default([]),
});

export const UpdateTaskSchema = z.object({
    id: z.string().uuid("Invalid task ID"),
    company_slug: z.string().min(2).max(80),
    workspace_id: z.string().uuid("Invalid workspace").optional(),
    list_id: z.string().uuid("Invalid list").optional(),
    title: z.string().min(1).max(200).optional(),
    description: z.string().max(4000).optional().nullable(),
    priority: TaskPrioritySchema.optional(),
    status: TaskStatusSchema.optional(),
    due_date: OptionalDateStringSchema,
    estimate_points: z.coerce.number().int().min(0).max(500).optional().nullable(),
    tags: z.array(z.string().min(1).max(24)).max(12).optional(),
});

export type CreateTaskInput = z.infer<typeof CreateTaskSchema>;
export type UpdateTaskInput = z.infer<typeof UpdateTaskSchema>;
