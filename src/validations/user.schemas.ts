import Joi from 'joi';

export const userValidationSchemas = {
	createUser: Joi.object({
		username: Joi.string().alphanum().min(3).max(30).required().messages({
			'string.alphanum': 'Username must only contain alphanumeric characters',
			'string.min': 'Username must be at least 3 characters long',
			'string.max': 'Username must not exceed 30 characters',
			'any.required': 'Username is required',
		}),

		email: Joi.string().email().required().messages({
			'string.email': 'Please provide a valid email address',
			'any.required': 'Email is required',
		}),

		password: Joi.string()
			.min(8)
			.max(128)
			.pattern(
				new RegExp(
					'^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]'
				)
			)
			.required()
			.messages({
				'string.min': 'Password must be at least 8 characters long',
				'string.max': 'Password must not exceed 128 characters',
				'string.pattern.base':
					'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
				'any.required': 'Password is required',
			}),

		repeatPassword: Joi.string()
			.valid(Joi.ref('password'))
			.required()
			.messages({
				'any.only': 'Passwords do not match',
				'any.required': 'Password confirmation is required',
			}),

		firstName: Joi.string()
			.min(2)
			.max(50)
			.pattern(/^[a-zA-Z\s]+$/)
			.required()
			.messages({
				'string.min': 'First name must be at least 2 characters long',
				'string.max': 'First name must not exceed 50 characters',
				'string.pattern.base':
					'First name must only contain letters and spaces',
				'any.required': 'First name is required',
			}),

		lastName: Joi.string()
			.min(2)
			.max(50)
			.pattern(/^[a-zA-Z\s]+$/)
			.required()
			.messages({
				'string.min': 'Last name must be at least 2 characters long',
				'string.max': 'Last name must not exceed 50 characters',
				'string.pattern.base': 'Last name must only contain letters and spaces',
				'any.required': 'Last name is required',
			}),

		phone: Joi.string()
			.pattern(/^[+]?[1-9][\d]{0,15}$/)
			.optional()
			.messages({
				'string.pattern.base': 'Please provide a valid phone number',
			}),

		dateOfBirth: Joi.date().max('now').min('1900-01-01').optional().messages({
			'date.max': 'Date of birth cannot be in the future',
			'date.min': 'Please provide a valid date of birth',
		}),
	}),

	loginUser: Joi.object({
		username: Joi.string().required().messages({
			'any.required': 'Username is required',
		}),

		password: Joi.string().required().messages({
			'any.required': 'Password is required',
		}),
	}),

	updateUser: Joi.object({
		username: Joi.string().alphanum().min(3).max(30).optional().messages({
			'string.alphanum': 'Username must only contain alphanumeric characters',
			'string.min': 'Username must be at least 3 characters long',
			'string.max': 'Username must not exceed 30 characters',
		}),

		email: Joi.string().email().optional().messages({
			'string.email': 'Please provide a valid email address',
		}),

		password: Joi.string()
			.min(8)
			.max(128)
			.pattern(
				new RegExp(
					'^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]'
				)
			)
			.optional()
			.messages({
				'string.min': 'Password must be at least 8 characters long',
				'string.max': 'Password must not exceed 128 characters',
				'string.pattern.base':
					'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
			}),

		repeatPassword: Joi.when('password', {
			is: Joi.exist(),
			then: Joi.string().valid(Joi.ref('password')).required().messages({
				'any.only': 'Passwords do not match',
				'any.required':
					'Password confirmation is required when updating password',
			}),
			otherwise: Joi.optional(),
		}),

		firstName: Joi.string()
			.min(2)
			.max(50)
			.pattern(/^[a-zA-Z\s]+$/)
			.optional()
			.messages({
				'string.min': 'First name must be at least 2 characters long',
				'string.max': 'First name must not exceed 50 characters',
				'string.pattern.base':
					'First name must only contain letters and spaces',
			}),

		lastName: Joi.string()
			.min(2)
			.max(50)
			.pattern(/^[a-zA-Z\s]+$/)
			.optional()
			.messages({
				'string.min': 'Last name must be at least 2 characters long',
				'string.max': 'Last name must not exceed 50 characters',
				'string.pattern.base': 'Last name must only contain letters and spaces',
			}),

		phone: Joi.string()
			.pattern(/^[+]?[1-9][\d]{0,15}$/)
			.optional()
			.messages({
				'string.pattern.base': 'Please provide a valid phone number',
			}),

		dateOfBirth: Joi.date().max('now').min('1900-01-01').optional().messages({
			'date.max': 'Date of birth cannot be in the future',
			'date.min': 'Please provide a valid date of birth',
		}),

		status: Joi.string()
			.valid('active', 'inactive', 'suspended')
			.optional()
			.messages({
				'any.only': 'Status must be either active, inactive, or suspended',
			}),
	}),

	userId: Joi.object({
		userId: Joi.string().uuid().required().messages({
			'string.uuid': 'Please provide a valid user ID',
			'any.required': 'User ID is required',
		}),
	}),
};
