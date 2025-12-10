import { Controller, Post, Body, UseGuards, Request, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { LocalAuthGuard } from './local-auth.guard';

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private authService: AuthService) {}

  @Post('register')
  async register(
    @Body() body: { email: string; password: string; name: string; orgName: string },
  ) {
    try {
      // Validate required fields
      if (!body.email || !body.password || !body.name || !body.orgName) {
        throw new HttpException(
          'Missing required fields: email, password, name, orgName',
          HttpStatus.BAD_REQUEST,
        );
      }

      return await this.authService.register(body.email, body.password, body.name, body.orgName);
    } catch (error) {
      this.logger.error('Registration error:', error);
      
      if (error instanceof HttpException) {
        throw error;
      }
      
      // Log the full error for debugging
      this.logger.error('Full error details:', error.stack || error.message);
      
      throw new HttpException(
        error.message || 'Registration failed',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @UseGuards(LocalAuthGuard)
  @Post('login')
  async login(@Request() req) {
    return this.authService.login(req.user);
  }

  @UseGuards(JwtAuthGuard)
  @Post('me')
  async getProfile(@Request() req) {
    return req.user;
  }
}

