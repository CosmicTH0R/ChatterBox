import { body, param, validationResult } from 'express-validator';
import mongoose from 'mongoose';

// ===================== VALIDATION RESULT HANDLER =====================
export const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: 'Validation failed',
      errors: errors.array().map(err => ({
        field: err.path,
        message: err.msg,
      })),
    });
  }
  next();
};

// ===================== CUSTOM VALIDATORS =====================
const isValidObjectId = (value) => {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    throw new Error('Invalid ID format');
  }
  return true;
};

// ===================== AUTH VALIDATIONS =====================
export const validateRegister = [
  body('username')
    .trim()
    .notEmpty().withMessage('Username is required')
    .isLength({ min: 3, max: 30 }).withMessage('Username must be 3-30 characters')
    .matches(/^[a-zA-Z0-9_]+$/).withMessage('Username can only contain letters, numbers, and underscores'),
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 6, max: 128 }).withMessage('Password must be 6-128 characters'),
  validate,
];

export const validateLogin = [
  body('username')
    .trim()
    .notEmpty().withMessage('Username is required'),
  body('password')
    .notEmpty().withMessage('Password is required'),
  validate,
];

export const validateUpdatePassword = [
  body('oldPassword')
    .notEmpty().withMessage('Old password is required'),
  body('newPassword')
    .notEmpty().withMessage('New password is required')
    .isLength({ min: 6, max: 128 }).withMessage('New password must be 6-128 characters'),
  validate,
];

// ===================== ROOM VALIDATIONS =====================
export const validateCreateRoom = [
  body('name')
    .trim()
    .notEmpty().withMessage('Room name is required')
    .isLength({ min: 3, max: 50 }).withMessage('Room name must be 3-50 characters')
    .matches(/^[a-zA-Z0-9\s\-_]+$/).withMessage('Room name can only contain letters, numbers, spaces, hyphens, and underscores'),
  body('isPrivate')
    .optional()
    .isBoolean().withMessage('isPrivate must be a boolean'),
  validate,
];

export const validateJoinPrivateRoom = [
  body('name')
    .trim()
    .notEmpty().withMessage('Room name is required'),
  body('inviteCode')
    .trim()
    .notEmpty().withMessage('Invite code is required')
    .isLength({ min: 6, max: 6 }).withMessage('Invite code must be 6 characters'),
  validate,
];

export const validateRoomId = [
  param('id')
    .custom(isValidObjectId),
  validate,
];

// ===================== USER VALIDATIONS =====================
export const validateUpdateProfile = [
  body('name')
    .optional({ values: 'falsy' })  // Skip if empty/null/undefined
    .trim()
    .isLength({ max: 50 }).withMessage('Name must be under 50 characters'),
  body('email')
    .optional({ values: 'falsy' })  // Skip if empty/null/undefined
    .trim()
    .isEmail().withMessage('Invalid email format'),
  body('avatarUrl')
    .optional({ values: 'falsy' })  // Skip if empty/null/undefined
    .isURL().withMessage('Avatar must be a valid URL'),
  validate,
];

export const validateUserId = [
  param('userId')
    .custom(isValidObjectId),
  validate,
];

// ===================== FRIEND VALIDATIONS =====================
export const validateSendFriendRequest = [
  body('username')
    .trim()
    .notEmpty().withMessage('Username is required'),
  validate,
];

export const validateFriendRequestAction = [
  body('requestId')
    .custom(isValidObjectId),
  validate,
];

export const validateFriendId = [
  param('friendId')
    .custom(isValidObjectId),
  validate,
];

// ===================== MESSAGE VALIDATIONS =====================
export const validateMessageText = [
  body('text')
    .optional()
    .trim()
    .isLength({ max: 5000 }).withMessage('Message must be under 5000 characters'),
  validate,
];
