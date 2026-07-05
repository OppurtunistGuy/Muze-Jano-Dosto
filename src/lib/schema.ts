import { z } from "zod";
import { CATEGORIES, GENDERS, TRAITS } from "./types";

const traitMapSchema = z.record(z.enum(TRAITS), z.number().min(0).max(5)).default({});

const optionSchema = z.object({
  label: z.string().min(1).max(80),
  traits: traitMapSchema,
});

export const questionSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1).max(120),
  subtitle: z.string().max(160).optional().default(""),
  optionA: optionSchema,
  optionB: optionSchema,
  category: z.enum(CATEGORIES),
  active: z.boolean(),
});

export const questionsArraySchema = z.array(questionSchema);

export const playerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(30, "Name must be 30 characters or fewer")
    .refine((v) => !/^\d+$/.test(v), "Name cannot be numbers only"),
  gender: z.enum(GENDERS),
});

export const setupSchema = z
  .object({
    player1: playerSchema,
    player2: playerSchema,
  })
  .refine((v) => v.player1.name.trim().toLowerCase() !== v.player2.name.trim().toLowerCase(), {
    message: "Both names cannot be identical",
    path: ["player2", "name"],
  });
