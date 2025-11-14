import { HttpAdapterHost, NestFactory, Reflector } from '@nestjs/core'
import helmet from 'helmet'
import { AllExceptionsFilter } from './common/middleware/exception.filter'
import { ResponseFormatInterceptor } from './common/middleware/response-format.interceptor'
import { GlobalValidationPipe } from './common/middleware/validator.pipe'
import { configService } from './common/services/config.service'
import { BaseFunctionHelper } from './common/util/base-function.helper'
import { AppModule } from './modules/app.module'
import { ClassSerializerInterceptor } from '@nestjs/common'

// Environment file is automatically loaded by config.service.ts based on NODE_ENV
// It will look for: env.development, env.staging, or env.production
// in apps/backend/ or project root

async function bootstrap() {
  const firebaseInitialized = await BaseFunctionHelper.initializeFirebase()
  if (!firebaseInitialized) {
    console.warn(
      '⚠️  WARNING: Firebase initialization failed. Notification sending may not work properly.',
    )
    console.warn('⚠️  Please check Firebase service account configuration.')
  }

  const app = await NestFactory.create(AppModule)

  app.enableCors({
    origin: ['http://localhost', 'http://127.0.0.1', configService.corsOrigin],
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
