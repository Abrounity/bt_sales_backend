import mongoose from "mongoose";

const homepageContentSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, immutable: true },
    content: { type: mongoose.Schema.Types.Mixed, required: true },
  },
  { timestamps: true }
);

const HomepageContent =
  mongoose.models.HomepageContent ||
  mongoose.model("HomepageContent", homepageContentSchema);

export default HomepageContent;
