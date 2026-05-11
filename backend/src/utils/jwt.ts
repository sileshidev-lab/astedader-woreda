import jwt, { type Secret, type SignOptions } from "jsonwebtoken";
import { env } from "../config/env";

export type JwtUserPayload = {
  userId: string;
  role: string;
};

const jwtSecret: Secret = env.JWT_SECRET;

export function signToken(payload: JwtUserPayload) {
  const options: SignOptions = {
    expiresIn: env.JWT_EXPIRES_IN as SignOptions["expiresIn"],
  };

  return jwt.sign(payload, jwtSecret, options);
}

export function verifyToken(token: string) {
  return jwt.verify(token, jwtSecret) as JwtUserPayload;
}
