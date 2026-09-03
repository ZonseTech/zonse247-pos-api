import { AppPlatform, PrintErrorCode } from '../types';

export class PrintEngineError extends Error {
    public readonly code: PrintErrorCode;
    public readonly platform?: AppPlatform;
    public readonly retryable: boolean;

    constructor(
        code: PrintErrorCode,
        message: string,
        options: { platform?: AppPlatform; retryable?: boolean } = {}
    ) {
        super(message);
        this.name = 'PrintEngineError';
        this.code = code;
        this.platform = options.platform;
        this.retryable = options.retryable ?? false;
    }
}
