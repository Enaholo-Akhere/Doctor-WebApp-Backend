/**
 * Make an existing patient account an admin (who can verify doctors).
 *
 *   npm run make-admin -- someone@example.com
 *   npm run make-admin -- someone@example.com --revoke   (back to patient)
 *
 * The account must already exist: sign up as a patient first. Uses
 * MONGO_URI from .env, so run it where that points at the right database
 * (on Render: the service's Shell tab).
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import User from 'models/UserSchema';
import escapeStringRegexp from 'escape-string-regexp';

const main = async () => {
    const [email, flag] = process.argv.slice(2);
    if (!email) throw new Error('Usage: npm run make-admin -- <email> [--revoke]');
    const role = flag === '--revoke' ? 'patient' : 'admin';

    await mongoose.connect(process.env.MONGO_URI as string);
    const user = await User.findOneAndUpdate({ email: new RegExp(`^${escapeStringRegexp(email.trim())}$`, 'i') }, { role }, { new: true });
    if (!user) throw new Error(`No patient account with email ${email}. Sign up first, then run this again.`);
    console.log(`${user.email} is now ${role === 'admin' ? 'an admin' : 'a patient'}.`);
};

main()
    .catch((e) => {
        console.error(e.message);
        process.exitCode = 1;
    })
    .finally(() => mongoose.disconnect());
