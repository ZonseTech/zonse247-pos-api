import { AppPlatform, PrintErrorCode } from '../types';
import { PrintEngineError } from './print-engine-error';

export class PlatformNotSupportedError extends PrintEngineError {
    public readonly feature: string;

    constructor(feature: string, platform?: AppPlatform) {
        super(
            PrintErrorCode.PLATFORM_NOT_SUPPORTED,
            `${feature} is not supported on ${platform || 'this platform'}`,
            { platform, retryable: false }
        );
        this.name = 'PlatformNotSupportedError';
        this.feature = feature;
    }
}
