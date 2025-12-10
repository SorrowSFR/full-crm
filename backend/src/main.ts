import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // CORS configuration - support multiple origins for Vercel deployments
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const allowedOrigins = frontendUrl.includes(',')
    ? frontendUrl.split(',').map(url => url.trim())
    : [frontendUrl];

  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      
      // Check if origin exactly matches allowed origins
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      
      // Allow Vercel preview deployments (any *.vercel.app domain if FRONTEND_URL is vercel.app)
      if (frontendUrl.includes('vercel.app') && origin.includes('.vercel.app')) {
        return callback(null, true);
      }
      
      // Allow localhost for development
      if (origin.startsWith('http://localhost:') || origin.startsWith('https://localhost:')) {
        return callback(null, true);
      }
      
      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  });

  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}`);
}
bootstrap();

