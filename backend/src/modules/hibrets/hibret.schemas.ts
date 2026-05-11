import { z } from "zod";

export const createHibretSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional().nullable(),
  status: z.string().optional(),
});

export const updateHibretSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().optional().nullable(),
  status: z.string().optional(),
});
