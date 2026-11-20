import bcrypt from "bcrypt";

export const BCRYPT_ROUNDS = process.env.NODE_ENV === "test" ? 4 : 12;

export const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(BCRYPT_ROUNDS);
  return bcrypt.hash(password, salt);
};

export const comparePassword = async (password, hashedPassword) => {
  return bcrypt.compare(password, hashedPassword);
};
