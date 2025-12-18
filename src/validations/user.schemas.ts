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
			.required()
			.messages({
				'string.min': 'Password must be at least 8 characters long',
				'string.max': 'Password must not exceed 128 characters',
				'any.required': 'Password is required',
			}),
		fullname: Joi.string()
			.min(2)
			.max(50)
			.pattern(/^[a-zA-Z\s]+$/)
			.required()
			.messages({
				'string.min': 'Full name must be at least 2 characters long',
				'string.max': 'Full name must not exceed 50 characters',
				'string.pattern.base':
					'Full name must only contain letters and spaces',
				'any.required': 'Full name is required',
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
			.optional()
			.allow('')
			.messages({
				'string.min': 'Password must be at least 8 characters long',
				'string.max': 'Password must not exceed 128 characters',
			}),

		fullname: Joi.string()
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

	id: Joi.object({
		id: Joi.string().required().messages({
			'any.required': 'User ID is required',
		}),
	}),

	userId: Joi.object({
		userId: Joi.string().required().messages({
			'any.required': 'User ID is required',
		}),
	}),

	refreshToken: Joi.object({
		token: Joi.string().required().messages({
			'string.empty': 'Refresh token is required',
			'any.required': 'Refresh token is required'
		})
	}),

	changePassword: Joi.object({
		currentPassword: Joi.string().required().messages({
			'string.empty': 'Current password is required',
			'any.required': 'Current password is required'
		}),
		newPassword: Joi.string().min(8).required().messages({
			'string.empty': 'New password is required',
			'string.min': 'New password must be at least 8 characters long',
			'any.required': 'New password is required'
		})
	}),

	updateUserStatus: Joi.object({
		status: Joi.string().valid('active', 'inactive', 'suspended').required().messages({
			'string.empty': 'Status is required',
			'any.only': 'Status must be one of: active, inactive, suspended',
			'any.required': 'Status is required'
		})
	}),

	roleId: Joi.object({
		roleId: Joi.string().required().messages({
			'string.empty': 'Role ID is required',
			'any.required': 'Role ID is required'
		})
	}),

	branchUuid: Joi.object({
		branchUuid: Joi.string().required().messages({
			'string.empty': 'Branch ID is required',
			'any.required': 'Branch ID is required'
		})
	})

};
