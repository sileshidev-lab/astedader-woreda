declare namespace Express {
  export interface Request {
    user?: {
      id: string;
      email: string;
      role: string;
      status: string;
      privileges: string[];
      hibretId?: string | null;
      memberId?: string | null;
      hibretName?: string | null;
      memberName?: string | null;
    };
  }
}
