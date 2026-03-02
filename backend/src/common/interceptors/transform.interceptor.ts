import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta?: any;
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<ApiResponse<T>> {
    return next.handle().pipe(
      map((responseData) => {
        // If the response already has the success format, return as-is
        if (responseData && typeof responseData === 'object' && 'success' in responseData) {
          return responseData;
        }

        // If the response has data and meta properties, wrap them
        if (responseData && typeof responseData === 'object' && 'data' in responseData && 'meta' in responseData) {
          return {
            success: true,
            data: responseData.data,
            meta: responseData.meta,
          };
        }

        return {
          success: true,
          data: responseData,
        };
      }),
    );
  }
}
