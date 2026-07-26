"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MaxJsonSize = MaxJsonSize;
const class_validator_1 = require("class-validator");
function MaxJsonSize(maxBytes, validationOptions) {
    return function (object, propertyName) {
        (0, class_validator_1.registerDecorator)({
            name: 'maxJsonSize',
            target: object.constructor,
            propertyName,
            options: validationOptions,
            constraints: [maxBytes],
            validator: {
                validate(value, args) {
                    if (value === undefined || value === null)
                        return true;
                    const [max] = args.constraints;
                    try {
                        return Buffer.byteLength(JSON.stringify(value), 'utf8') <= max;
                    }
                    catch {
                        return false;
                    }
                },
                defaultMessage(args) {
                    const [max] = args.constraints;
                    return `${args.property} excede o tamanho máximo permitido (${max} bytes serializado em JSON)`;
                },
            },
        });
    };
}
//# sourceMappingURL=max-json-size.validator.js.map