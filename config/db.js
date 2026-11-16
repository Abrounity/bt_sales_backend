import mongoose from "mongoose";

const connectDB = async () => {
  const uri = process.env.MONGODB_URI?.trim();
  if (!uri) {
    const error = new Error("MONGODB_URI is not configured.");
    error.code = "MISSING_MONGODB_URI";
    throw error;
  }
  if (!/^mongodb(?:\+srv)?:\/\//i.test(uri)) {
    const error = new Error("MONGODB_URI must start with mongodb:// or mongodb+srv://.");
    error.code = "INVALID_MONGODB_URI";
    throw error;
  }

  const conn = await mongoose.connect(uri);
  console.log("MongoDB connected.");
  return conn;
};

export default connectDB;