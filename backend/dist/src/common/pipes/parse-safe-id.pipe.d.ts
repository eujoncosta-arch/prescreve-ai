import { PipeTransform } from '@nestjs/common';
export declare class ParseSafeIdPipe implements PipeTransform<string, string> {
    transform(value: string): string;
}
