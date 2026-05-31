import { Injectable, UnauthorizedException } from "@nestjs/common";
import jwt from "jsonwebtoken";
import type { JwtPayload, RequestUser } from "./auth.types";

const TOKEN_TTL = "7d";

@Injectable()
export class JwtService {
  private get secret() {
    const secret = process.env.JWT_SECRET;
    if (!secret || secret.length < 16) {
      throw new Error("JWT_SECRET must be set and at least 16 characters");
    }
    return secret;
  }

  sign(payload: JwtPayload) {
    return jwt.sign(payload, this.secret, { expiresIn: TOKEN_TTL });
  }

  verify(token: string): RequestUser {
    try {
      const decoded = jwt.verify(token, this.secret) as JwtPayload;
      return {
        userId: decoded.sub,
        email: decoded.email,
        familyIds: decoded.familyIds
      };
    } catch {
      throw new UnauthorizedException("Invalid or expired token");
    }
  }
}
