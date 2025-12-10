import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { signToken } from '@/lib/jwt';
import bcrypt from 'bcrypt';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, name, orgName } = body;

    if (!email || !password || !name || !orgName) {
      return NextResponse.json(
        { error: 'Missing required fields: email, password, name, orgName' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Create organization and user in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: { name: orgName },
      });

      const user = await tx.user.create({
        data: {
          email,
          password: hashedPassword,
          name,
          org_id: org.org_id,
        },
      });

      return { org, user };
    });

    const { password: _, ...userWithoutPassword } = result.user;
    const token = signToken({
      email: result.user.email,
      user_id: result.user.user_id,
      org_id: result.user.org_id,
    });

    return NextResponse.json({
      access_token: token,
      user: userWithoutPassword,
      org: result.org,
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: error.message || 'Registration failed' },
      { status: 500 }
    );
  }
}

