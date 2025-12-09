import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { organization: true },
    });

    if (user && (await bcrypt.compare(password, user.password))) {
      const { password: _, ...result } = user;
      return result;
    }
    return null;
  }

  async login(user: any) {
    const payload = { email: user.email, sub: user.user_id, org_id: user.org_id };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        user_id: user.user_id,
        email: user.email,
        name: user.name,
        org_id: user.org_id,
      },
    };
  }

  async register(email: string, password: string, name: string, orgName: string) {
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create organization and user in a transaction
    const result = await this.prisma.$transaction(async (tx) => {
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
    return {
      user: userWithoutPassword,
      org: result.org,
    };
  }
}

