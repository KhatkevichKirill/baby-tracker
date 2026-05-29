export type RequestUser = {
  userId: string;
  email: string;
  familyIds: string[];
};

export type JwtPayload = {
  sub: string;
  email: string;
  familyIds: string[];
};
