import Joi from 'joi';

const createStaff = Joi.object({
  userId: Joi.string().required(),
  employeeCode: Joi.string().max(50).optional().allow('', null),
  department: Joi.string().max(100).optional().allow('', null),
  designation: Joi.string().max(100).optional().allow('', null),
  joiningDate: Joi.string().isoDate().optional().allow(null),
  calculateAs: Joi.string().valid('HOURLY', 'DAILY', 'WEEKLY', 'MONTHLY', 'FIXED').optional().default('DAILY'),
  staffSalary: Joi.number().min(0).precision(2).optional().default(0),
  salaryFrequency: Joi.string().valid('WEEKLY', 'BIWEEKLY', 'MONTHLY', 'SEMIMONTHLY').optional().default('MONTHLY'),
  trackAttendance: Joi.boolean().optional().default(false),
  allowSelfAttendance: Joi.boolean().optional().default(false),
  attendanceType: Joi.string().valid('PUNCH', 'SHIFT', 'FLEXIBLE', 'REMOTE').optional().default('PUNCH'),
  avgShiftHours: Joi.number().min(0).max(24).optional().default(8),
  allowAppAccess: Joi.boolean().optional().default(false),
  emergencyContactName: Joi.string().max(255).optional().allow('', null),
  emergencyContactPhone: Joi.string().max(50).optional().allow('', null),
  emergencyContactRelation: Joi.string().max(100).optional().allow('', null),
  address: Joi.string().max(500).optional().allow('', null),
  city: Joi.string().max(100).optional().allow('', null),
  state: Joi.string().max(100).optional().allow('', null),
  postalCode: Joi.string().max(20).optional().allow('', null),
  country: Joi.string().max(100).optional().allow('', null),
  nationalId: Joi.string().max(50).optional().allow('', null),
  dateOfBirth: Joi.string().isoDate().optional().allow(null),
  gender: Joi.string().valid('MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY').optional().allow(null),
  bankName: Joi.string().max(255).optional().allow('', null),
  bankAccountNumber: Joi.string().max(50).optional().allow('', null),
  bankBranchCode: Joi.string().max(50).optional().allow('', null),
  employmentStatus: Joi.string().valid('ACTIVE', 'ON_LEAVE', 'SUSPENDED', 'TERMINATED', 'RESIGNED').optional().default('ACTIVE'),
  notes: Joi.string().max(2000).optional().allow('', null),
});

const updateStaff = Joi.object({
  employeeCode: Joi.string().max(50).optional().allow('', null),
  department: Joi.string().max(100).optional().allow('', null),
  designation: Joi.string().max(100).optional().allow('', null),
  joiningDate: Joi.string().isoDate().optional().allow(null),
  calculateAs: Joi.string().valid('HOURLY', 'DAILY', 'WEEKLY', 'MONTHLY', 'FIXED').optional(),
  staffSalary: Joi.number().min(0).precision(2).optional(),
  salaryFrequency: Joi.string().valid('WEEKLY', 'BIWEEKLY', 'MONTHLY', 'SEMIMONTHLY').optional(),
  trackAttendance: Joi.boolean().optional(),
  allowSelfAttendance: Joi.boolean().optional(),
  attendanceType: Joi.string().valid('PUNCH', 'SHIFT', 'FLEXIBLE', 'REMOTE').optional(),
  avgShiftHours: Joi.number().min(0).max(24).optional(),
  allowAppAccess: Joi.boolean().optional(),
  emergencyContactName: Joi.string().max(255).optional().allow('', null),
  emergencyContactPhone: Joi.string().max(50).optional().allow('', null),
  emergencyContactRelation: Joi.string().max(100).optional().allow('', null),
  address: Joi.string().max(500).optional().allow('', null),
  city: Joi.string().max(100).optional().allow('', null),
  state: Joi.string().max(100).optional().allow('', null),
  postalCode: Joi.string().max(20).optional().allow('', null),
  country: Joi.string().max(100).optional().allow('', null),
  nationalId: Joi.string().max(50).optional().allow('', null),
  dateOfBirth: Joi.string().isoDate().optional().allow(null),
  gender: Joi.string().valid('MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY').optional().allow(null),
  bankName: Joi.string().max(255).optional().allow('', null),
  bankAccountNumber: Joi.string().max(50).optional().allow('', null),
  bankBranchCode: Joi.string().max(50).optional().allow('', null),
  employmentStatus: Joi.string().valid('ACTIVE', 'ON_LEAVE', 'SUSPENDED', 'TERMINATED', 'RESIGNED').optional(),
  notes: Joi.string().max(2000).optional().allow('', null),
}).min(1);

const staffIdParam = Joi.object({
  staffId: Joi.string().required(),
});

const listQuery = Joi.object({
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(200).optional(),
  search: Joi.string().max(255).optional().allow(''),
  department: Joi.string().max(100).optional().allow(''),
  employmentStatus: Joi.string().valid('ACTIVE', 'ON_LEAVE', 'SUSPENDED', 'TERMINATED', 'RESIGNED').optional(),
});

export const staffSchemas = {
  createStaff,
  updateStaff,
  staffIdParam,
  listQuery,
};
