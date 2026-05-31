import { BadRequestException, Injectable, PipeTransform } from "@nestjs/common";
import type { ZodIssue, ZodSchema } from "zod";

@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema: ZodSchema) {}

  transform(value: unknown) {
    const parsed = this.schema.safeParse(value);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues.map((issue: ZodIssue) => issue.message));
    }
    return parsed.data;
  }
}

export function zodPipe<T extends ZodSchema>(schema: T) {
  return new ZodValidationPipe(schema);
}
