import mongoose from 'mongoose';

interface resPass { token: string, userId: mongoose.ObjectId };

const ResetPasswordSchema = new mongoose.Schema<resPass>({
    token: { type: String },
    userId: { type: mongoose.Schema.Types.ObjectId },
}, { timestamps: true })

export default mongoose.model('PasswordReset', ResetPasswordSchema);

