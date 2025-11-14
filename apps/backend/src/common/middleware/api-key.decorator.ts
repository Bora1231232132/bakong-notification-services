import { SetMetadata } from '@nestjs/common'

export const API_KEY_REQUIRED_KEY = 'apiKeyRequired'
export const ApiKeyRequired = () => SetMetadata(API_KEY_REQUIRED_KEY, true)
