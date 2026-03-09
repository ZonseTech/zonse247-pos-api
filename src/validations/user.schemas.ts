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

		tenantId: Joi.string().optional().allow('-1', '').messages({
			'string.base': 'Tenant ID must be a string',
		}),
		branchId: Joi.string().optional().allow('-1', '').messages({
			'string.base': 'Branch ID must be a string',
		}),

		roleId: Joi.string().optional().messages({
			'string.base': 'Role ID must be a string',
		}),

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

		offlineMode: Joi.boolean().optional().default(false).messages({
			'boolean.base': 'Offline mode must be a boolean',
		}),
	}),

	updateUser: Joi.object({
		username: Joi.string().min(3).max(30).optional().messages({
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
			.optional()
			.messages({
				'string.min': 'First name must be at least 2 characters long',
				'string.max': 'First name must not exceed 50 characters',
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

	saveUserOffline: Joi.object({
		id: Joi.any().optional().strip(),
		userId: Joi.string().optional().messages({
			'string.base': 'User ID must be a string',
		}),
		username: Joi.string().min(3).max(100).required().messages({
			'string.min': 'Username must be at least 3 characters long',
			'string.max': 'Username must not exceed 100 characters',
			'any.required': 'Username is required',
		}),
		email: Joi.string().email().optional().allow(null, '').messages({
			'string.email': 'Please provide a valid email address',
		}),
		password: Joi.string().min(4).max(128).optional().messages({
			'string.min': 'Password must be at least 4 characters long',
			'string.max': 'Password must not exceed 128 characters',
		}),
		fullname: Joi.string().min(2).max(100).required().messages({
			'string.min': 'Full name must be at least 2 characters long',
			'string.max': 'Full name must not exceed 100 characters',
			'any.required': 'Full name is required',
		}),
		phone: Joi.string().optional().allow(null, '').messages({
			'string.base': 'Phone must be a string',
		}),
		tenantId: Joi.string().required().messages({
			'string.base': 'Tenant ID must be a string',
			'any.required': 'Tenant ID is required',
		}),
		branchId: Joi.string().required().messages({
			'string.base': 'Branch ID must be a string',
			'any.required': 'Branch ID is required',
		}),
		roleId: Joi.string().required().messages({
			'string.base': 'Role ID must be a string',
			'any.required': 'Role ID is required',
		}),
		status: Joi.string().valid('active', 'inactive', 'suspended').optional().default('active').messages({
			'any.only': 'Status must be one of: active, inactive, suspended',
		}),
		accessibleBranches: Joi.array().items(Joi.string()).optional().messages({
			'array.base': 'Accessible branches must be an array',
		}),
		allowedTerminals: Joi.array().items(Joi.string()).optional().allow(null).messages({
			'array.base': 'Allowed terminals must be an array',
		}),
		maxDiscountPercent: Joi.alternatives().try(
			Joi.number().min(0).max(100),
			Joi.string().pattern(/^\d+(\.\d+)?$/)
		).optional().default(0).messages({
			'number.min': 'Max discount percent cannot be negative',
			'number.max': 'Max discount percent cannot exceed 100',
		}),
		canOverridePrices: Joi.boolean().optional().default(false).messages({
			'boolean.base': 'Can override prices must be a boolean',
		}),
		pinCode: Joi.string().optional().allow(null, '').messages({
			'string.base': 'Pin code must be a string',
		}),
		currentBranchId: Joi.string().optional().allow(null, '').messages({
			'string.base': 'Current branch ID must be a string',
		}),
		branch: Joi.object({
			branchId: Joi.string().required(),
			tenantId: Joi.string().required(),
			branchName: Joi.string().optional(),
			name: Joi.string().optional(),
			branchCode: Joi.string().optional(),
			siteId: Joi.string().optional().allow(null, ''),
			siteName: Joi.string().optional().allow(null, ''),
			description: Joi.string().optional().allow(null, ''),
			addressLine1: Joi.string().optional().allow(null, ''),
			addressLine2: Joi.string().optional().allow(null, ''),
			addressLine3: Joi.string().optional().allow(null, ''),
			address: Joi.string().optional().allow(null, ''),
			districtId: Joi.string().optional().allow(null, ''),
			location: Joi.string().optional().allow(null, ''),
			businessType: Joi.string().optional(),
			city: Joi.string().optional().allow(null, ''),
			phoneNumber: Joi.string().optional().allow(null, ''),
			phone: Joi.string().optional().allow(null, ''),
			email: Joi.string().optional().allow(null, ''),
			currencyCode: Joi.string().optional(),
			currencySymbol: Joi.string().optional(),
			taxRate: Joi.number().optional(),
			chargeTax: Joi.boolean().optional(),
			receiptFooter: Joi.string().optional().allow(null, ''),
			logoUrl: Joi.string().optional().allow(null, ''),
			branchSubscriptionId: Joi.string().optional().allow(null, ''),
			status: Joi.string().optional(),
			branchSubscription: Joi.object({
				branchSubscriptionId: Joi.string().required(),
				subscriptionPlanId: Joi.string().required(),
				status: Joi.string().optional(),
				startsAt: Joi.date().optional(),
				endsAt: Joi.date().optional().allow(null),
				autoRenew: Joi.boolean().optional(),
				paymentMethod: Joi.string().optional().allow(null, ''),
				lastPaymentDate: Joi.date().optional().allow(null),
				nextPaymentDate: Joi.date().optional().allow(null),
			}).optional().allow(null),
		}).optional().allow(null),
	}),

	saveRoleOffline: Joi.object({
		roleId: Joi.string().required().messages({
			'string.base': 'Role ID must be a string',
			'any.required': 'Role ID is required',
		}),
		name: Joi.string().optional().messages({
			'string.base': 'Name must be a string',
		}),
		displayName: Joi.string().optional().allow(null, '').messages({
			'string.base': 'Display name must be a string',
		}),
		description: Joi.string().optional().allow(null, '').messages({
			'string.base': 'Description must be a string',
		}),
		isSystemRole: Joi.boolean().optional().default(false).messages({
			'boolean.base': 'Is system role must be a boolean',
		}),
		isActive: Joi.boolean().optional().default(true).messages({
			'boolean.base': 'Is active must be a boolean',
		}),
	}),

	savePermissionsOffline: Joi.object({
		permissions: Joi.array().items(
			Joi.alternatives().try(
				Joi.string(),
				Joi.object({
					permissionId: Joi.string().optional(),
					name: Joi.string().required(),
					displayName: Joi.string().optional(),
					description: Joi.string().optional().allow(null, ''),
					category: Joi.string().optional(),
					scope: Joi.string().optional(),
					isSystemPermission: Joi.boolean().optional(),
				})
			)
		).required().messages({
			'array.base': 'Permissions must be an array',
			'any.required': 'Permissions array is required',
		}),
		roleId: Joi.string().optional().messages({
			'string.base': 'Role ID must be a string',
		}),
	}),

	verifyRoleQuery: Joi.object({
		roleId: Joi.string().optional().messages({
			'string.base': 'Role ID must be a string',
		}),
	}),

};
