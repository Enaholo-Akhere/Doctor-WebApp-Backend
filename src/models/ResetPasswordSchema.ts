
import mongoose from 'mongoose';
interface resPass { token: string };

const ResetPasswordSchema = new mongoose.Schema<{ token: string, userId: mongoose.ObjectId }>({
    token: { type: String },
    userId: { type: mongoose.Schema.Types.ObjectId, }
}, { timestamps: true })

export default mongoose.model('PasswordReset', ResetPasswordSchema);

