import mongoose from 'mongoose';

/** A record of each email an admin sent, for the Messages history. */
const adminMessageSchema = new mongoose.Schema(
    {
        subject: { type: String, required: true, maxLength: 200 },
        html: { type: String, required: true },
        audience: { type: String, enum: ['all_patients', 'all_doctors', 'selected'], required: true },
        recipients: [{ id: mongoose.Types.ObjectId, role: { type: String, enum: ['patient', 'doctor'] }, name: String, email: String }],
        recipientCount: { type: Number, default: 0 },
        sent: { type: Number, default: 0 },
        failed: { type: Number, default: 0 },
        sentBy: { type: mongoose.Types.ObjectId, ref: 'User', required: true },
    },
    { timestamps: true },
);

export default mongoose.model('AdminMessage', adminMessageSchema);
