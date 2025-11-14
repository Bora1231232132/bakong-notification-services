import { ErrorCode, ResponseMessage } from '@bakong/shared'

export class BaseResponseDto<T = unknown> {
  public responseCode: number
  public responseMessage: string
  public errorCode: number
  public data: T | []

  constructor(payload?: {
    responseCode?: number
    responseMessage?: string
    errorCode?: number
    data?: T | []
  }) {
    this.responseCode = payload?.responseCode ?? 0
    this.responseMessage = payload?.responseMessage ?? ResponseMessage.REQUEST_SUCCESS
    this.errorCode = payload?.errorCode ?? ErrorCode.REQUEST_SUCCESS
    this.data = payload?.data ?? []
  }

  static success<T>(params?: { data?: T; message?: string }) {
    return new BaseResponseDto<T>({
      responseCode: 0,
      errorCode: ErrorCode.REQUEST_SUCCESS,
      responseMessage: params?.message ?? ResponseMessage.REQUEST_SUCCESS,
      data: params?.data ?? [],
    })
  }

  static error<T>(params: { errorCode: number; message: string; data?: T | [] }) {
    return new BaseResponseDto<T>({
      responseCode: 1,
      responseMessage: params?.message ?? ResponseMessage.INTERNAL_SERVER_ERROR,
      errorCode: params?.errorCode ?? ErrorCode.INTERNAL_SERVER_ERROR,
      data: params?.data ?? [],
    })
  }

  toString() {
    return JSON.stringify(this)
  }
}
