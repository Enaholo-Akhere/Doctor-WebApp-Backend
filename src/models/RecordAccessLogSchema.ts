import mongoose, { Schema, Types } from 'mongoose';

/**
 * Audit trail for consultation records: who created, viewed, edited,
 * approved or deleted which record, and when. Holds no medical content, so
 * entries are kept after the record itself is deleted.
 */
export type RecordAccessAction = 'create' | 'view' | 'update' | 'approve' | 'delete';

export interface IRecordAccessLog {
    consultation: Types.ObjectId;
    patient: Types.ObjectId;
    actor: Types.ObjectId;
    actorRole: 'patient' | 'doctor';
    action: RecordAccessAction;
    at: Date;
}

const recordAccessLogSchema = new Schema<IRecordAccessLog>(
    {
        consultation: { type: Schema.Types.ObjectId, required: true },
        patient: { type: Schema.Types.ObjectId, required: true },
        actor: { type: Schema.Types.ObjectId, required: true },
        actorRole: { type: String, enum: ['patient', 'doctor'], required: true },
        action: { type: String, enum: ['create', 'view', 'update', 'approve', 'delete'], required: true },
        at: { type: Date, default: Date.now },
    },
    { collection: 'record_access_log' }
);

recordAccessLogSchema.index({ consultation: 1, at: -1 });
recordAccessLogSchema.index({ patient: 1, at: -1 });

export default mongoose.model<IRecordAccessLog>('RecordAccessLog', recordAccessLogSchema);
