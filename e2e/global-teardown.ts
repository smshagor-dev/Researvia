import mongoose from "mongoose";
import { StudentProfile } from "../src/server/models/StudentProfile";
import { SystemMailbox } from "../src/server/models/SystemMailbox";
import { User } from "../src/server/models/User";
import { UserSession } from "../src/server/models/UserSession";
import { E2E_STUDENT } from "./fixtures";

export default async function globalTeardown() {
  const mongodbUri = process.env.MONGODB_URI;
  if (!mongodbUri) return;

  await mongoose.connect(mongodbUri, { serverSelectionTimeoutMS: 5_000 });
  try {
    const user = await User.findOne({ email: E2E_STUDENT.email }).select({ _id: 1 }).lean();
    if (!user) return;
    await Promise.all([
      UserSession.deleteMany({ userId: user._id }),
      StudentProfile.deleteMany({ userId: user._id }),
      SystemMailbox.deleteMany({ userId: user._id })
    ]);
    await User.deleteOne({ _id: user._id });
  } finally {
    await mongoose.disconnect();
  }
}
