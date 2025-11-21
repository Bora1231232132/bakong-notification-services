import { HttpAdapterHost, NestFactory, Reflector } from '@nestjs/core'
import helmet from 'helmet'
import { AllExceptionsFilter } from './common/middleware/exception.filter'
import { ResponseFormatInterceptor } from './common/middleware/response-format.interceptor'
import { GlobalValidationPipe } from './common/middleware/validator.pipe'
import { configService } from './common/services/config.service'
import { FirebaseManager } from './common/services/firebase-manager.service'
import { AppModule } from './modules/app.module'
import { ClassSerializerInterceptor } from '@nestjs/common'

// Environment file is automatically loaded by config.service.ts based on NODE_ENV
// It will look for: env.development, env.staging, or env.production
// in apps/backend/ or project root

async function bootstrap() {
  // Initialize all Firebase apps for all platforms
  const firebaseResult = await FirebaseManager.initializeAll()
  if (firebaseResult.failed > 0) {
    console.warn(
      `⚠️  WARNING: ${firebaseResult.failed} Firebase app(s) failed to initialize. Some notification sending may not work properly.`,
    )
    console.warn('⚠️  Please check Firebase service account configuration.')
  }
  if (firebaseResult.success > 0) {
    console.log(
      `✅ Successfully initialized ${firebaseResult.success} Firebase app(s) for multi-platform support.`,
    )
    console.log(`✅ Initialized apps: ${FirebaseManager.getInitializedApps().join(', ')}`)
  }

  const app = await NestFactory.create(AppModule)

  // Parse CORS origins - support comma-separated values
  const corsOrigins = configService.corsOrigin
    ? configService.corsOrigin
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean)
    : []

  app.enableCors({
    origin: ['http://localhost', 'http://127.0.0.1', ...corsOrigins],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'x-api-key',
      'X-Requested-With',
      'Accept',
      'Origin',
    ],
    credentials: true,
    preflightContinue: false,
    optionsSuccessStatus: 204,
  })

  app.use((req, res, next) => {
    next()
  })

  app.use(helmet())
  app.setGlobalPrefix('/api/v1')
  app.useGlobalPipes(GlobalValidationPipe)
  app.useGlobalInterceptors(
    new ResponseFormatInterceptor(),
    new ClassSerializerInterceptor(app.get(Reflector)),
  )
  app.useGlobalFilters(new AllExceptionsFilter(app.get(HttpAdapterHost)))

  await app.listen(configService.apiPort)
}
bootstrap()
