import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus
} from "@nestjs/common";

type HttpRequest = { url: string };
type HttpResponse = { status: (code: number) => HttpResponse; json: (body: unknown) => void };

type ApiErrorBody = {
  error: {
    statusCode: number;
    code: string;
    message: string | string[];
    path: string;
    timestamp: string;
  };
};

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<HttpResponse>();
    const request = ctx.getRequest<HttpRequest>();

    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    const rawMessage =
      exception instanceof HttpException ? exception.getResponse() : "Internal server error";

    const message =
      typeof rawMessage === "string"
        ? rawMessage
        : typeof rawMessage === "object" && rawMessage !== null && "message" in rawMessage
          ? (rawMessage as { message: string | string[] }).message
          : "Request failed";

    const code =
      exception instanceof HttpException
        ? exception.name.replace(/Exception$/, "").replace(/([a-z])([A-Z])/g, "$1_$2").toUpperCase()
        : "INTERNAL_ERROR";

    const body: ApiErrorBody = {
      error: {
        statusCode: status,
        code,
        message,
        path: request.url,
        timestamp: new Date().toISOString()
      }
    };

    response.status(status).json(body);
  }
}
