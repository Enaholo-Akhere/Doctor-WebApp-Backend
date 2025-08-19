
import { login, register } from 'Controllers/authController';
import { loginUserSchema, registerUserSchema } from 'DTO_Validations/zod_schemas';
import validate from 'DTO_Validations/zod_validate';
import express from 'express';

const router = express.Router();

router.post('/register', validate(registerUserSchema), register);

router.post('/login', validate(loginUserSchema), login)

export default router;