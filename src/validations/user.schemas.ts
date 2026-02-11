import Joi from 'joi';

export const userValidationSchemas = {
	createUser: Joi.object({
		username: Joi.string().min(3).max(100).optional().messages({
			'string.min': 'Username must be at least 3 characters long',
			'string.max': 'Username must not exceed 100 characters',
		}),

		email: Joi.string().email().required().messages({
			'string.email': 'Please provide a valid email address',
			'any.required': 'Email is required',
		}),

		password: Joi.string()
			.min(4)
			.max(128)
			.optional()
			.messages({
				'string.min': 'Password must be at least 4 characters long',
				'string.max': 'Password must not exceed 128 characters',
			}),
		fullname: Joi.string()
			.min(2)
			.max(100)
			.pattern(/^[a-zA-Z\s]+$/)
			.required()
			.messages({
				'string.min': 'Full name must be at least 2 characters long',
				'string.max': 'Full name must not exceed 100 characters',
				'string.pattern.base':
					'Full name must only contain letters and spaces',
				'any.required': 'Full name is required',
			}),

		phone: Joi.string()
			.pattern(/^(\+265|265|0[89])\d{7,9}$/)
			.optional()
			.allow(null, '')
			.messages({
				'string.pattern.base': 'Please provide a valid phone number (e.g., +265123456789, 265123456789, or 0912345678)',
			}),

		dateOfBirth: Joi.date().max('now').min('1900-01-01').optional().allow(null).messages({
			'date.max': 'Date of birth cannot be in the future',
			'date.min': 'Please provide a valid date of birth',
		}),

		// Tenant and branch IDs
		tenantId: Joi.string().optional().allow('-1', '').messages({
			'string.base': 'Tenant ID must be a string',
		}),
		branchId: Joi.string().optional().allow('-1', '').messages({
			'string.base': 'Branch ID must be a string',
		}),

		// Role - optional when allowAppAccess is false (will default to 'viewer')
		roleId: Joi.string().optional().messages({
			'string.base': 'Role ID must be a string',
		}),

		// Staff-related fields
		trackAttendance: Joi.boolean().optional().messages({
			'boolean.base': 'Track attendance must be a boolean',
		}),
		allowAppAccess: Joi.boolean().optional().messages({
			'boolean.base': 'Allow app access must be a boolean',
		}),
		calculateAs: Joi.string()
			.valid('hourly', 'daily', 'weekly', 'monthly', 'fixed', 'HOURLY', 'DAILY', 'WEEKLY', 'MONTHLY', 'FIXED')
			.optional()
			.messages({
				'any.only': 'Calculate as must be one of: hourly, daily, weekly, monthly, fixed',
			}),
		staffSalary: Joi.number().min(0).optional().messages({
			'number.min': 'Staff salary cannot be negative',
		}),
		avgShiftHours: Joi.number().min(0).max(24).optional().messages({
			'number.min': 'Average shift hours cannot be negative',
			'number.max': 'Average shift hours cannot exceed 24',
		}),
		joiningDate: Joi.date().optional().allow(null).messages({
			'date.base': 'Please provide a valid joining date',
		}),
		allowSelfAttendance: Joi.boolean().optional().messages({
			'boolean.base': 'Allow self attendance must be a boolean',
		}),
		attendanceType: Joi.string()
			.valid('punch', 'shift', 'flexible', 'remote', 'PUNCH', 'SHIFT', 'FLEXIBLE', 'REMOTE')
			.optional()
			.messages({
				'any.only': 'Attendance type must be one of: punch, shift, flexible, remote',
			}),
		department: Joi.string().max(100).optional().allow(null, '').messages({
			'string.max': 'Department must not exceed 100 characters',
		}),
		designation: Joi.string().max(100).optional().allow(null, '').messages({
			'string.max': 'Designation must not exceed 100 characters',
		}),
		employeeCode: Joi.string().max(50).optional().allow(null, '').messages({
			'string.max': 'Employee code must not exceed 50 characters',
		}),
		salaryFrequency: Joi.string()
			.valid('weekly', 'biweekly', 'monthly', 'semimonthly', 'WEEKLY', 'BIWEEKLY', 'MONTHLY', 'SEMIMONTHLY')
			.optional()
			.messages({
				'any.only': 'Salary frequency must be one of: weekly, biweekly, monthly, semimonthly',
			}),
		emergencyContactName: Joi.string().max(100).optional().allow(null, '').messages({
			'string.max': 'Emergency contact name must not exceed 100 characters',
		}),
		emergencyContactPhone: Joi.string().max(20).optional().allow(null, '').messages({
			'string.max': 'Emergency contact phone must not exceed 20 characters',
		}),
		emergencyContactRelation: Joi.string().max(50).optional().allow(null, '').messages({
			'string.max': 'Emergency contact relation must not exceed 50 characters',
		}),
		address: Joi.string().max(255).optional().allow(null, '').messages({
			'string.max': 'Address must not exceed 255 characters',
		}),
		city: Joi.string().max(100).optional().allow(null, '').messages({
			'string.max': 'City must not exceed 100 characters',
		}),
		state: Joi.string().max(100).optional().allow(null, '').messages({
			'string.max': 'State must not exceed 100 characters',
		}),
		postalCode: Joi.string().max(20).optional().allow(null, '').messages({
			'string.max': 'Postal code must not exceed 20 characters',
		}),
		country: Joi.string().max(100).optional().allow(null, '').messages({
			'string.max': 'Country must not exceed 100 characters',
		}),
		nationalId: Joi.string().max(50).optional().allow(null, '').messages({
			'string.max': 'National ID must not exceed 50 characters',
		}),
		gender: Joi.string()
			.valid('male', 'female', 'other', 'prefer_not_to_say', 'MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY')
			.optional()
			.allow(null)
			.messages({
				'any.only': 'Gender must be one of: male, female, other, prefer_not_to_say',
			}),
		bankName: Joi.string().max(100).optional().allow(null, '').messages({
			'string.max': 'Bank name must not exceed 100 characters',
		}),
		bankAccountNumber: Joi.string().max(50).optional().allow(null, '').messages({
			'string.max': 'Bank account number must not exceed 50 characters',
		}),
		bankBranchCode: Joi.string().max(20).optional().allow(null, '').messages({
			'string.max': 'Bank branch code must not exceed 20 characters',
		}),
		notes: Joi.string().max(1000).optional().allow(null, '').messages({
			'string.max': 'Notes must not exceed 1000 characters',
		}),
		createStaffRecord: Joi.boolean().optional().messages({
			'boolean.base': 'Create staff record must be a boolean',
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
