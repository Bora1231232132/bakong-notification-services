import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common'
import { instanceToPlain } from 'class-transformer'
import { map, Observable } from 'rxjs'
import { BaseResponseDto } from '../base-response.dto'

@Injectable()
export class ResponseFormatInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const response = context.switchToHttp().getResponse()
    response.status(200)
    return next.handle().pipe(
      map((data) => {
        if (data instanceof BaseResponseDto) {
          return instanceToPlain(data)
        }
        if (data && typeof data === 'object' && 'responseCode' in data && 'data' in data) {
          return instanceToPlain(data)
        }
        return instanceToPlain(new BaseResponseDto({ data }))
      }),
    )
  }
}
