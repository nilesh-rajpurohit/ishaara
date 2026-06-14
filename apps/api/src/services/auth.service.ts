import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma";
import { AppError } from "../middlewares/error.middleware";

const ACCESS_SECRET = process.env.JWT_SECRET!;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET!;
const ACCESS_EXPIRES = process.env.JWT_EXPIRES_IN || "15m";
const REFRESH_EXPIRES = process.env.JWT_REFRESH_EXPIRES_IN || "7d";

export const generateTokens = (userId: string) => {
  const accessToken = jwt.sign({ userId }, ACCESS_SECRET, {
    expiresIn: ACCESS_EXPIRES,
  });
  const refreshToken = jwt.sign({ userId }, REFRESH_SECRET, {
    expiresIn: REFRESH_EXPIRES,
  });
  return { accessToken, refreshToken };
};

export const registerUser = async (
  email: string,
  password: string,
  name: string,
  preferredLang = "hi",
  isDeaf = false
) => {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new AppError(409, "Email already registered");

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { email, passwordHash, name, preferredLang, isDeaf },
  });

  const { accessToken, refreshToken } = generateTokens(user.id);

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);
  await prisma.session.create({
    data: { userId: user.id, refreshToken, expiresAt },
  });

  return {
    accessToken,
    refreshToken,
    user: { id: user.id, email: user.email, name: user.name, preferredLang: user.preferredLang, isDeaf: user.isDeaf },
  };
};

export const loginUser = async (email: string, password: string) => {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new AppError(401, "Invalid email or password");

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) throw new AppError(401, "Invalid email or password");

  const { accessToken, refreshToken } = generateTokens(user.id);

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);
  await prisma.session.create({
    data: { userId: user.id, refreshToken, expiresAt },
  });

  return {
    accessToken,
    refreshToken,
    user: { id: user.id, email: user.email, name: user.name, preferredLang: user.preferredLang, isDeaf: user.isDeaf },
  };
};

export const refreshTokens = async (token: string) => {
  const session = await prisma.session.findUnique({
    where: { refreshToken: token },
    include: { user: true },
  });

  if (!session || session.expiresAt < new Date()) {
    throw new AppError(401, "Invalid or expired refresh token");
  }

  try {
    jwt.verify(token, REFRESH_SECRET);
  } catch {
    throw new AppError(401, "Invalid refresh token");
  }

  await prisma.session.delete({ where: { id: session.id } });

  const { accessToken, refreshToken } = generateTokens(session.userId);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);
  await prisma.session.create({
    data: { userId: session.userId, refreshToken, expiresAt },
  });

  return { accessToken, refreshToken };
};

export const logoutUser = async (token: string) => {
  await prisma.session.deleteMany({ where: { refreshToken: token } });
};
