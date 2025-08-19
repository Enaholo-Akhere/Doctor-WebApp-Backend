import express from 'express';
import { deleteUser, getAllUsers, getUserById, updateUser } from 'Controllers/userController';
import { sanitizedUser } from 'Middleware/sanitizedUser';
import validate from 'DTO_Validations/zod_validate';
import { updateUserSchema } from 'DTO_Validations/zod_schemas';
import { restrict } from 'Middleware/auth';

const router = express.Router();

router.get('/', [sanitizedUser, restrict(['admin'])], getAllUsers)
router.get('/:id', [sanitizedUser, restrict(['patient'])], getUserById)
router.put('/:id', [sanitizedUser, restrict(['patient']), validate(updateUserSchema)], updateUser)
router.delete('/:id', [sanitizedUser, restrict(['patient'])], deleteUser)

export default router;