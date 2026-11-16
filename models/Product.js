import mongoose from "mongoose";

const initialBestSellerIds = new Set(["p13", "p15", "p4", "p7"]);

const productSchema = new mongoose.Schema(
  {
    sourceId: { type: String, unique: true, sparse: true, immutable: true },
    title: { type: String, required: true, trim: true },
    category: {
      type: String,
      required: true,
      enum: ["phones", "appliances", "accessories"],
    },
    brand: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 },
    originalPrice: { type: Number, required: true, min: 0 },
    rating: { type: Number, min: 0, max: 5, default: 0 },
    reviews: { type: Number, min: 0, default: 0 },
    isBestSeller: { type: Boolean },
    badge: { type: String, trim: true },
    image: { type: String, required: true, trim: true },
    specs: {
      type: Map,
      of: String,
      required: true,
      validate: {
        validator: (specs) => specs instanceof Map && specs.size > 0,
        message: "At least one product specification is required.",
      },
    },
    specIcons: { type: Map, of: String },
    description: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

const Product =
  mongoose.models.Product || mongoose.model("Product", productSchema);

export function serializeProduct(product) {
  const { _id, __v, sourceId, ...data } = product.toObject({ flattenMaps: true });
  return {
    ...data,
    isBestSeller:
      typeof data.isBestSeller === "boolean"
        ? data.isBestSeller
        : initialBestSellerIds.has(sourceId),
    id: sourceId || _id.toString(),
  };
}

export default Product;
