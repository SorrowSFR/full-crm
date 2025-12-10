import { verifyToken, getTokenFromRequest } from './jwt';
import { prisma } from './prisma';
import { NextRequest } from 'next/server';

export async function getAuthenticatedUser(request: NextRequest) {
  const token = getTokenFromRequest(request);
  if (!token) return null;

  const payload = verifyToken(token);
  if (!payload) return null;

  const user = await prisma.user.findUnique({
    where: { user_id: payload.user_id },
    include: { organization: true },
  });

  if (!user || user.org_id !== payload.org_id) return null;

  return { user_id: user.user_id, email: user.email, org_id: user.org_id };
}

