import { ValidationOptions } from 'class-validator';
export declare function MaxJsonSize(maxBytes: number, validationOptions?: ValidationOptions): (object: object, propertyName: string) => void;
