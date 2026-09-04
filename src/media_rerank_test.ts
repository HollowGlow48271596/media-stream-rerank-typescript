import { z } from "zod";
const requestSchema = z.object({ query: z.string().min(1), candidates: z.array(z.object({ id: z.string(), title: z.string(), description: z.string() })).min(1), top_k: z.number().int().positive().optional() });
const input = { query: "concert", candidates: [{ id: "1", title: "Concert stream", description: "Live music" }], top_k: 1 };
const parsed = requestSchema.parse(input);
if (parsed.top_k !== 1 || parsed.candidates[0].title !== "Concert stream") throw new Error("request boundary decision failed");
console.log("request boundary: valid media query accepted");
