import Joi from 'joi';
import { Request, Response, NextFunction } from 'express';

export interface ValidationError {
	field: string;
	message: string;
}

export const validateRequest = (
	schema: Joi.ObjectSchema,
	property: 'body' | 'params' | 'query' = 'body'
) => {
	return (req: Request, res: Response, next: NextFunction): void => {
		const { error } = schema.validate(req[property], {
			abortEarly: false,
			stripUnknown: true,
			allowUnknown: false,
		});

		if (error) {
			const validationErrors: ValidationError[] = error.details.map(
				(detail) => ({
					field: detail.path.join('.'),
					message: detail.message,
				})
			);

			res.status(400).json({
				error: 'Validation Error',
				message: 'Please check your input and try again',
				details: validationErrors,
			});
			return;
		}

		next();
	};
};

export const validateBody = (schema: Joi.ObjectSchema) =>
	validateRequest(schema, 'body');
export const validateParams = (schema: Joi.ObjectSchema) =>
	validateRequest(schema, 'params');
export const validateQuery = (schema: Joi.ObjectSchema) =>
	validateRequest(schema, 'query');
