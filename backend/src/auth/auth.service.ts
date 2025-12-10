import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

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
    try {
      this.logger.log(`Attempting to register user: ${email}`);
      
      // Check if user already exists
      const existingUser = await this.prisma.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        this.logger.warn(`Registration failed: User ${email} already exists`);
        throw new Error('User with this email already exists');
      }

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

      this.logger.log(`Successfully registered user: ${email}, org: ${result.org.org_id}`);

      const { password: _, ...userWithoutPassword } = result.user;
      return {
        user: userWithoutPassword,
        org: result.org,
      };
    } catch (error) {
      this.logger.error(`Registration error for ${email}:`, error);
      throw error;
    }
  }
}

